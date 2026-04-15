'use client'

import React from 'react'
import styles from './phone-input.module.css'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export default function PhoneInput({ value, onChange, placeholder = '24 000 0000', required = false }: PhoneInputProps) {
  const localPart = value.startsWith('+233') ? value.replace('+233', '') : value === '' ? '' : value

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    // Remove all non-digits
    const digits = input.replace(/\D/g, '')
    
    // Limit to 9 or 10 digits depending on GH format, but keeping it flexible
    const limitedDigits = digits.slice(0, 10)

    // Always emit the full E.164 number
    if (limitedDigits) {
      onChange(`+233${limitedDigits}`)
    } else {
      onChange('')
    }
  }

  return (
    <div className={styles.phoneInputContainer}>
      <div className={styles.countrySelect}>
        <span className={styles.flag} role="img" aria-label="Ghana">🇬🇭</span>
        <span className={styles.prefix}>+233</span>
      </div>
      <input
        type="tel"
        className={styles.input}
        placeholder={placeholder}
        value={localPart}
        onChange={handleInputChange}
        required={required}
        autoFocus
        autoComplete="tel"
      />
    </div>
  )
}
