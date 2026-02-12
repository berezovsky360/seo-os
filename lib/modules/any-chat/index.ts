// Any Chat Module — Unified messaging for notifications & human-in-the-loop

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { TelegramAdapter } from './telegram'

// Simple glob matcher: 'cron.*' matches 'cron.job_executed', '*' matches everything
function matchesPattern(eventType: string, pattern: string): boolean {
  if (pattern === '*') return true
  // Convert glob pattern to regex: 'cron.*' → /^cron\..*$/
  const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$')
  return regex.test(eventType)
}

// Format an event into a human-readable notification message
function formatEventMessage(event: CoreEvent): string {
  const lines = [`<b>${event.event_type}</b>`]
  if (event.site_id) lines.push(`Site: ${event.site_id}`)

  // Extract key payload fields
  const payload = event.payload || {}
  const keys = Object.keys(payload).slice(0, 6)
  for (const key of keys) {
    const val = payload[key]
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      lines.push(`${key}: ${val}`)
    }
  }

  return lines.join('\n')
}

const telegramAdapter = new TelegramAdapter()

export class AnyChatModule implements SEOModule {
  id = 'any-chat' as const
  name = 'Any Chat'
  description = 'Unified messaging for notifications, reports, and human-in-the-loop approvals via Telegram, Slack, Discord.'
  icon = 'MessageCircle'

  emittedEvents: EventType[] = [
    'chat.message_sent',
    'chat.approval_requested',
    'chat.channel_connected',
  ]

  // Events this module listens to — all notification-worthy events
  handledEvents: EventType[] = [
    'cron.job_executed',
    'cron.job_failed',
    'engine.article_published',
    'engine.pipeline_completed',
    'engine.pipeline_failed',
    'core.recipe_completed',
    'core.recipe_failed',
    'task.completed',
    'task.failed',
    'rank.position_dropped',
    'rank.position_improved',
    'bridge.sync_completed',
    'bridge.bulk_push_completed',
    'gsc.low_ctr_found',
    'gsc.impressions_spike',
    'chat.approval_responded',
  ]

  actions: ModuleAction[] = [
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a text message to a connected chat channel',
      params: [
        { name: 'channel_id', type: 'string', label: 'Channel', required: true },
        { name: 'text', type: 'string', label: 'Message Text', required: true },
      ],
    },
    {
      id: 'send_approval_request',
      name: 'Send Approval Request',
      description: 'Send an approval request with Approve/Reject buttons (human-in-the-loop)',
      params: [
        { name: 'channel_id', type: 'string', label: 'Channel', required: true },
        { name: 'question', type: 'string', label: 'Question', required: true },
        { name: 'recipe_id', type: 'string', label: 'Recipe ID', required: true },
        { name: 'action_id', type: 'string', label: 'Action ID', required: true },
      ],
    },
    {
      id: 'connect_telegram',
      name: 'Connect Telegram Bot',
      description: 'Connect a Telegram bot using its API token',
      params: [
        { name: 'bot_token', type: 'string', label: 'Bot Token', required: true },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Communication',
    sectionColor: 'bg-emerald-500',
    label: 'Any Chat',
    viewState: 'any-chat',
    order: 1,
  }

  async handleEvent(event: CoreEvent, context: ModuleContext): Promise<CoreEvent | null> {
    // Load notification rules for this user
    const { data: rules } = await context.supabase
      .from('chat_notification_rules')
      .select('*, chat_channels!inner(id, platform, platform_chat_id, bot_token, is_active, metadata)')
      .eq('user_id', context.userId)
      .eq('enabled', true)

    if (!rules?.length) return null

    let sent = false

    for (const rule of rules) {
      // Check event pattern match
      if (!matchesPattern(event.event_type, rule.event_pattern)) continue

      // Check site filter
      if (rule.site_id && event.site_id && rule.site_id !== event.site_id) continue

      const channel = rule.chat_channels
      if (!channel?.is_active || !channel.platform_chat_id) continue

      // Resolve token: per-channel or shared
      const botToken = channel.bot_token || (channel.metadata?.mode === 'shared' ? process.env.TELEGRAM_SHARED_BOT_TOKEN : null)
      if (!botToken) continue

      // Use custom template or format automatically
      const text = rule.template
        ? rule.template.replace(/\{event_type\}/g, event.event_type).replace(/\{payload\}/g, JSON.stringify(event.payload))
        : formatEventMessage(event)

      try {
        if (channel.platform === 'telegram') {
          const result = await telegramAdapter.sendMessage(
            botToken,
            channel.platform_chat_id,
            text,
            { parse_mode: 'HTML' }
          )

          // Store outbound message
          await context.supabase.from('chat_messages').insert({
            user_id: context.userId,
            channel_id: channel.id,
            direction: 'outbound',
            message_type: 'report',
            content: text,
            metadata: { event_type: event.event_type, event_payload: event.payload },
            platform_message_id: result.message_id,
          })

          sent = true
        }
      } catch (err) {
        console.error(`[any-chat] Failed to send notification to channel ${channel.id}:`, err)
      }
    }

    if (sent) {
      return {
        event_type: 'chat.message_sent',
        source_module: 'any-chat',
        payload: { original_event: event.event_type, rules_matched: rules.length },
        site_id: event.site_id,
      }
    }

    return null
  }

  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'send_message': return this.sendMessage(params, context)
      case 'send_approval_request': return this.sendApprovalRequest(params, context)
      case 'connect_telegram': return this.connectTelegram(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async sendMessage(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { channel_id, text } = params
    if (!channel_id || !text) throw new Error('channel_id and text are required')

    const { data: channel } = await context.supabase
      .from('chat_channels')
      .select('*')
      .eq('id', channel_id)
      .eq('user_id', context.userId)
      .single()

    if (!channel) throw new Error('Channel not found')

    const botToken = channel.bot_token || (channel.metadata?.mode === 'shared' ? process.env.TELEGRAM_SHARED_BOT_TOKEN : null)
    if (!botToken || !channel.platform_chat_id) throw new Error('Channel not fully configured')

    let result: { message_id: string; success: boolean }

    if (channel.platform === 'telegram') {
      result = await telegramAdapter.sendMessage(botToken, channel.platform_chat_id, text, { parse_mode: 'HTML' })
    } else {
      throw new Error(`Platform ${channel.platform} not yet supported`)
    }

    await context.supabase.from('chat_messages').insert({
      user_id: context.userId,
      channel_id,
      direction: 'outbound',
      message_type: 'text',
      content: text,
      platform_message_id: result.message_id,
    })

    await context.emitEvent({
      event_type: 'chat.message_sent',
      source_module: 'any-chat',
      payload: { channel_id, text_length: text.length },
    })

    return { success: true, message_id: result.message_id }
  }

  private async sendApprovalRequest(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { channel_id, question, recipe_id, action_id } = params
    if (!channel_id || !question || !recipe_id || !action_id) {
      throw new Error('channel_id, question, recipe_id, and action_id are required')
    }

    const { data: channel } = await context.supabase
      .from('chat_channels')
      .select('*')
      .eq('id', channel_id)
      .eq('user_id', context.userId)
      .single()

    if (!channel) throw new Error('Channel not found')

    const botToken = channel.bot_token || (channel.metadata?.mode === 'shared' ? process.env.TELEGRAM_SHARED_BOT_TOKEN : null)
    if (!botToken || !channel.platform_chat_id) throw new Error('Channel not fully configured')

    const callbackData = {
      approve: `approve:${recipe_id}:${action_id}`,
      reject: `reject:${recipe_id}:${action_id}`,
    }

    let result: { message_id: string; success: boolean }

    if (channel.platform === 'telegram') {
      result = await telegramAdapter.sendApprovalRequest(
        botToken,
        channel.platform_chat_id,
        question,
        callbackData
      )
    } else {
      throw new Error(`Platform ${channel.platform} not yet supported`)
    }

    await context.supabase.from('chat_messages').insert({
      user_id: context.userId,
      channel_id,
      direction: 'outbound',
      message_type: 'approval_request',
      content: question,
      metadata: { recipe_id, action_id, status: 'pending' },
      platform_message_id: result.message_id,
    })

    await context.emitEvent({
      event_type: 'chat.approval_requested',
      source_module: 'any-chat',
      payload: { channel_id, recipe_id, action_id, question },
    })

    return { success: true, message_id: result.message_id }
  }

  private async connectTelegram(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { bot_token } = params
    if (!bot_token) throw new Error('bot_token is required')

    // Verify the bot token
    const verification = await telegramAdapter.verifyConnection(bot_token)
    if (!verification.ok) throw new Error('Invalid bot token')

    // Set webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/chat/telegram/webhook`
    await telegramAdapter.setWebhook!(bot_token, webhookUrl)

    // Create channel record (platform_chat_id will be set when user sends /start)
    const { data: channel } = await context.supabase
      .from('chat_channels')
      .insert({
        user_id: context.userId,
        platform: 'telegram',
        platform_chat_id: '',
        bot_token,
        channel_name: verification.botName || 'Telegram Bot',
        metadata: {
          bot_username: verification.botUsername,
          bot_name: verification.botName,
        },
        is_active: true,
      })
      .select()
      .single()

    await context.emitEvent({
      event_type: 'chat.channel_connected',
      source_module: 'any-chat',
      payload: { platform: 'telegram', bot_username: verification.botUsername },
    })

    return {
      channel_id: channel?.id,
      bot_username: verification.botUsername,
      bot_name: verification.botName,
    }
  }
}
