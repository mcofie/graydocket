/**
 * Normalizes phone numbers to E.164 format, specifically for Ghana (+233)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-numeric characters except +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Fix cases where people add 0 after +233
  if (normalized.startsWith('+2330')) {
    normalized = '+233' + normalized.substring(5)
  }
  
  // If it starts with 0 and is 10 digits, replace with +233
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '+233' + normalized.substring(1)
  } 
  // If it starts with 2 and is 9 digits (24xxxxxxx), add +233
  else if (normalized.startsWith('2') && normalized.length === 9) {
    normalized = '+233' + normalized
  }
  // If it starts with 233 and is 12 digits, add +
  else if (normalized.startsWith('233') && normalized.length === 12) {
    normalized = '+' + normalized
  }
  // If it starts with +233 and is already correct, leave it
  
  return normalized
}
