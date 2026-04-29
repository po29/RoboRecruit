const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-7'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>
}

export async function callClaude(prompt: string): Promise<string> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set')

  const messages: Message[] = [{ role: 'user', content: prompt }]

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude API error ${res.status}: ${text}`)
  }

  const data: ClaudeResponse = await res.json()
  const block = data.content.find(b => b.type === 'text')
  if (!block) throw new Error('No text block in Claude response')
  return block.text
}
