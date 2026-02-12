// Model pricing per token (USD)
const MODEL_PRICING: Record<string, { input: number; output: number; label: string }> = {
  'gemini-2.5-flash': {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
    label: 'Gemini 2.5 Flash',
  },
  'gemini-2.5-pro': {
    input: 1.25 / 1_000_000,
    output: 10.0 / 1_000_000,
    label: 'Gemini 2.5 Pro',
  },
  'gemini-2.0-flash': {
    input: 0.10 / 1_000_000,
    output: 0.40 / 1_000_000,
    label: 'Gemini 2.0 Flash',
  },
}

export const DEFAULT_MODEL = 'gemini-2.5-flash'

export function calculateCost(
  model: string,
  promptTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  return promptTokens * pricing.input + outputTokens * pricing.output
}

export function getAvailableModels() {
  return Object.entries(MODEL_PRICING).map(([id, info]) => ({
    id,
    label: info.label,
    inputPrice: `$${(info.input * 1_000_000).toFixed(2)} / 1M tokens`,
    outputPrice: `$${(info.output * 1_000_000).toFixed(2)} / 1M tokens`,
  }))
}
