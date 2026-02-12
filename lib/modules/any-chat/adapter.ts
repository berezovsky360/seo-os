// Platform adapter interface for Any Chat module
// Each messaging platform (Telegram, Slack, Discord, etc.) implements this interface.

export interface SendOptions {
  parse_mode?: 'HTML' | 'Markdown'
  reply_markup?: Record<string, any>
}

export interface PlatformMessageResult {
  message_id: string
  success: boolean
}

export interface ChatPlatformAdapter {
  platform: string

  /** Send a plain text message */
  sendMessage(
    token: string,
    chatId: string,
    text: string,
    options?: SendOptions
  ): Promise<PlatformMessageResult>

  /** Send an approval request with Approve/Reject buttons */
  sendApprovalRequest(
    token: string,
    chatId: string,
    question: string,
    callbackData: { approve: string; reject: string }
  ): Promise<PlatformMessageResult>

  /** Verify connection credentials (e.g. bot token) */
  verifyConnection(token: string): Promise<{ ok: boolean; botName?: string; botUsername?: string }>

  /** Set up incoming webhook (if platform supports it) */
  setWebhook?(token: string, webhookUrl: string): Promise<boolean>

  /** Remove webhook */
  deleteWebhook?(token: string): Promise<boolean>
}
