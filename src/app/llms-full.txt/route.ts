import { llmsFullTxt, textResponse } from '@/lib/llms'

// The llms.txt summary plus the full text of every guide; rebuilt daily
export const revalidate = 86400

export async function GET() {
  return textResponse(await llmsFullTxt())
}
