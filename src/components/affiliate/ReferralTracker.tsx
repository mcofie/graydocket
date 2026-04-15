'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Institutional Referral Tracker.
 * Safely captures 'ref' parameters from the URL and persists them to long-term storage (Cookie & LocalStorage)
 * to ensure affiliates receive credit even if the user registers days after the initial visit.
 */
export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // 1. Persist to LocalStorage for application form pre-fill
      localStorage.setItem('graydocket_referral', ref.toUpperCase());

      // 2. Persist to Cookie for secondary tracking (30 day TTL)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      document.cookie = `gd_ref=${ref.toUpperCase()}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    }
  }, [searchParams]);

  return null;
}
