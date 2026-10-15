import { llmsTxt, textResponse } from '@/lib/llms'

// A plain summary of GrayDocket for AI assistants (https://llmstxt.org); rebuilt daily so prices stay current
export const revalidate = 86400

export async function GET() {
  return textResponse(await llmsTxt())
}
