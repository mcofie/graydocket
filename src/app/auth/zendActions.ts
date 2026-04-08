'use server'
import crypto from 'crypto'

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { formatPhoneNumber } from '@/lib/sms'

export async function sendZendOtp(phone: string) {
  if (!process.env.ZEND_API_KEY) {
    console.warn('Missing ZEND_API_KEY environment variable. Mocking OTP send.')
    return { success: true, id: 'mock_otp_123', message: 'Mock OTP sent (ZEND_API_KEY missing)' }
  }

  const normalizedPhone = formatPhoneNumber(phone)
  // Generate a stateless 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiry = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  // Create a stateless verification token (Hash: phone + code + expiry + secret)
  const secret = process.env.ZEND_API_KEY // Using API Key as secret for now
  const hash = crypto.createHmac('sha256', secret)
    .update(`${normalizedPhone}${code}${expiry}`)
    .digest('hex')
  
  const otpId = `${hash}.${expiry}`

  try {
    const response = await fetch('https://api.tryzend.com/messages', {
      method: 'POST',
      headers: { 
        'x-api-key': process.env.ZEND_API_KEY, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        to: normalizedPhone,
        body: `Your GrayDocket verification code is: ${code}. Valid for 10 minutes.`,
        preferred_channels: ['sms'],
        sender_id: 'GrayDocket'
      })
    })
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Zend Messages API error: ${errText}`)
    }
    
    return { success: true, id: otpId }
  } catch (error: any) {
    console.error('Zend send OTP error:', error)
    return { success: false, error: error.message || 'Failed to send OTP' }
  }
}

export async function verifyZendOtp(id: string, code: string, phone: string) {
  let isVerified = false
  
  if (!process.env.ZEND_API_KEY) {
    console.warn('Missing ZEND_API_KEY environment variable. Mocking OTP verification.')
    if (code !== '123456') return { success: false, message: 'Invalid mock code. Try 123456' }
    isVerified = true
  } else {
    const normalizedPhone = formatPhoneNumber(phone)
    try {
      // Split hash and expiry safely
      const parts = (id || '').split('.');
      if (parts.length !== 2) return { success: false, message: 'Invalid session ID' };
      
      const [receivedHash, expiryText] = parts;
      const expiry = parseInt(expiryText, 10);
      
      // Check expiry
      if (Date.now() > expiry) {
        return { success: false, message: 'OTP has expired. Please request a new one.' }
      }
      
      // Re-calculate hash to verify the code
      const secret = process.env.ZEND_API_KEY;
      const expectedHash = crypto.createHmac('sha256', secret)
        .update(`${normalizedPhone}${code}${expiry}`)
        .digest('hex');
        
      if (receivedHash !== expectedHash) {
        return { success: false, message: 'Invalid OTP code' }
      }

      isVerified = true
    } catch (error: any) {
      console.error('Zend verify OTP error:', error)
      return { success: false, error: 'Failed to verify OTP' }
    }
  }

  // --- SUPABASE SESSION BRIDGE ---
  // Now that Zend verified the phone, we securely create a Supabase session.
  if (isVerified) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY missing in environment.")
      return { success: false, message: 'Server configuration error (Service Role Key missing). Please contact support.' }
    }

    // 1. Init Admin client to bypass RLS and lookup user
    const adminSupabase = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Lookup the user's profile by their phone number (could be slightly formatted differently)
    // We normalize to ensure we match the format stored in DB
    const normalizedPhone = formatPhoneNumber(phone)
    const { data: profiles, error: lookupError } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .eq('phone', normalizedPhone)
      .limit(1)

    if (lookupError || !profiles || profiles.length === 0) {
      return { success: false, message: 'No account found with this phone number. Please register first.' }
    }

    const { email } = profiles[0]

    if (!email) {
      return { success: false, message: 'Account is missing an email address, cannot establish secure login.' }
    }

    // 3. Generate a magical authentication token under the hood using Admin keys
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (linkError || !linkData?.properties?.email_otp) {
      console.error('Failed to generate magic link OTP:', linkError)
      return { success: false, message: 'Failed to initiate secure session.' }
    }

    // 4. Use the regular SSR client to verify the generated OTP.
    // This automatically creates and sets the Supabase Auth cookies securely in Next.js!
    const ssrClient = await createSupabaseServerClient()
    const { error: sessionError } = await ssrClient.auth.verifyOtp({
      email: email,
      token: linkData.properties.email_otp,
      type: 'magiclink'
    })

    if (sessionError) {
      console.error('Failed to verify internal session:', sessionError)
      return { success: false, message: 'Failed to establish browser session.' }
    }

    return { success: true }
  }

  return { success: false, message: 'Verification failed.' }
}
