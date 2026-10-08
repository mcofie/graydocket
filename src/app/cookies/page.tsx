import InfoPageLayout from '@/components/InfoPageLayout'

export const metadata = {
  title: 'Cookie policy',
  description: 'The cookies and browser storage GrayDocket uses, and why.',
}

// Keep this list in step with what the app actually stores (see ReferralTracker and the registration form).
export default function CookiesPage() {
  return (
    <InfoPageLayout title="Cookie policy" subtitle="The cookies and browser storage we use, and why.">
      <section>
        <h2>What cookies are</h2>
        <p>
          Cookies are small text files saved on your device. Browser storage works in a similar way. We use both only to
          keep GrayDocket working and to remember a few things for you.
        </p>
      </section>

      <section>
        <h2>What we use</h2>
        <ul>
          <li>
            <strong>Sign-in cookies (essential).</strong> Set by Supabase, our authentication provider, to keep you
            signed in securely. GrayDocket can&apos;t work without them.
          </li>
          <li>
            <strong>Referral cookie.</strong> If you arrive through a referral link, we store the referral code in a
            cookie named <code>gd_ref</code> for 30 days so the person who referred you gets credit.
          </li>
          <li>
            <strong>Browser storage.</strong> We save your registration draft and any referral code in your
            browser&apos;s local storage, so you don&apos;t lose your progress if you close the page.
          </li>
        </ul>
        <p>We don&apos;t currently use analytics or advertising cookies.</p>
      </section>

      <section>
        <h2>Managing cookies</h2>
        <p>
          You can clear or block cookies and browser storage in your browser settings. If you block sign-in cookies, you
          won&apos;t be able to log in or submit an application.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          Email <a href="mailto:support@graydocket.com">support@graydocket.com</a> if you have any questions about how
          we use cookies.
        </p>
      </section>
    </InfoPageLayout>
  )
}
