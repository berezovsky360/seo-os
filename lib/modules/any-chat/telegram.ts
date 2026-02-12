// Telegram Bot API client for Any Chat module

import type { ChatPlatformAdapter, PlatformMessageResult, SendOptions } from './adapter'

const API_BASE = 'https://api.telegram.org/bot'

async function callApi(token: string, method: string, body?: Record<string, any>) {
  const res = await fetch(`${API_BASE}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`)
  }
  return data.result
}

// ====== Standalone functions (used by webhook route) ======

export async function verifyBot(token: string): Promise<{ ok: boolean; botName: string; botUsername: string }> {
  try {
    const me = await callApi(token, 'getMe')
    return { ok: true, botName: me.first_name, botUsername: me.username }
  } catch {
    return { ok: false, botName: '', botUsername: '' }
  }
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  parseMode?: string,
  replyMarkup?: Record<string, any>
): Promise<PlatformMessageResult> {
  const body: Record<string, any> = { chat_id: chatId, text }
  if (parseMode) body.parse_mode = parseMode
  if (replyMarkup) body.reply_markup = replyMarkup

  const result = await callApi(token, 'sendMessage', body)
  return { message_id: String(result.message_id), success: true }
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await callApi(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || '',
  })
}

export async function setTelegramWebhook(token: string, webhookUrl: string): Promise<boolean> {
  const result = await callApi(token, 'setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
  })
  return !!result
}

export async function deleteTelegramWebhook(token: string): Promise<boolean> {
  const result = await callApi(token, 'deleteWebhook')
  return !!result
}

// ====== Platform Adapter ======

export class TelegramAdapter implements ChatPlatformAdapter {
  platform = 'telegram'

  async sendMessage(
    token: string,
    chatId: string,
    text: string,
    options?: SendOptions
  ): Promise<PlatformMessageResult> {
    return sendTelegramMessage(token, chatId, text, options?.parse_mode, options?.reply_markup)
  }

  async sendApprovalRequest(
    token: string,
    chatId: string,
    question: string,
    callbackData: { approve: string; reject: string }
  ): Promise<PlatformMessageResult> {
    const replyMarkup = {
      inline_keyboard: [[
        { text: 'Approve', callback_data: callbackData.approve },
        { text: 'Reject', callback_data: callbackData.reject },
      ]],
    }
    return sendTelegramMessage(token, chatId, question, 'HTML', replyMarkup)
  }

  async verifyConnection(token: string) {
    return verifyBot(token)
  }

  async setWebhook(token: string, webhookUrl: string) {
    return setTelegramWebhook(token, webhookUrl)
  }

  async deleteWebhook(token: string) {
    return deleteTelegramWebhook(token)
  }
}
