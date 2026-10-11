import { pageMetadata } from '@/lib/metadata'
import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'
import GuideBanner from '@/components/doodles/GuideBanner'
import { KeyRound, Lock, UserCheck, Mail } from 'lucide-react'
import blocks from '@/components/info-blocks.module.css'

export const metadata = pageMetadata('Security', 'Learn about signing in, handling business records, payment safety, and reporting a security concern to GrayDocket.', '/security')

// Keep every statement here true to how the product works today.
export default function SecurityPage() {
  return (
    <InfoPageLayout title="Security" subtitle="How we protect your account and your business records.">
      <div className={blocks.banner}><GuideBanner illustration="security" /></div>
      <div className={blocks.cards}>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><KeyRound size={18} /></span>
          <h3>One-time sign-in codes</h3>
          <p>Customer accounts sign in with a code sent to your phone. Never share it.</p>
        </div>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><Lock size={18} /></span>
          <h3>Encrypted connections</h3>
          <p>Everything you send to GrayDocket travels over HTTPS.</p>
        </div>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><UserCheck size={18} /></span>
          <h3>Limited access</h3>
          <p>Customer and staff accounts have different permissions for handling applications.</p>
        </div>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><Mail size={18} /></span>
          <h3>Report a concern</h3>
          <p>Email support@graydocket.com and we’ll look into it.</p>
        </div>
      </div>

      <section>
        <h2>Signing in</h2>
        <p>
          To sign in to your customer account, we text a one-time code to the phone number on your
          account. Codes expire after a short time, so keep your phone secure and never share a code with
          anyone, including people who say they work for GrayDocket.
        </p>
      </section>

      <section>
        <h2>Your business records</h2>
        <p>
          Your connection to GrayDocket uses HTTPS. We use Supabase to store account and application records.
          Upload identity documents through the application form rather than sending them in an unsolicited message.
          Our <Link href="/privacy">privacy policy</Link> explains how we handle your information.
        </p>
      </section>

      <section>
        <h2>Who can see your applications</h2>
        <p>
          You can manage your applications from your dashboard. Authorised staff, including administrators and registrars,
          access records to process applications and provide support. We share details with government agencies like the ORC to complete the
          services you request.
        </p>
      </section>

      <section>
        <h2>Paying safely</h2>
        <p>
          Start payments from your GrayDocket application using the Paystack checkout. We will never ask you to send
          your mobile money PIN, card PIN, password or sign-in code over email or WhatsApp.
          If a payment looks unfamiliar, <Link href="/support">contact support</Link> before paying again.
        </p>
      </section>

      <section>
        <h2>Keep your account safe</h2>
        <ul>
          <li>Keep the phone and SIM used for sign-in secure, and sign out on shared devices.</li>
          <li>Check the website address before entering a code or starting a payment.</li>
          <li>If you lose access to your phone number, contact support for help before creating another account.</li>
        </ul>
      </section>

      <section id="report">
        <h2>Reporting a security issue</h2>
        <p>
          If you notice anything suspicious on your account, or believe you&apos;ve found a security issue, email{' '}
          <a href="mailto:support@graydocket.com?subject=Security%20concern">support@graydocket.com</a> with the subject
          {' '}&ldquo;Security concern&rdquo;. Include the affected page, what happened, and when you noticed it.
          Redact personal details from screenshots, and never include passwords, sign-in codes or payment PINs.
        </p>
      </section>
      <p className={blocks.note}>
        Need help with a registration instead? Visit <Link href="/support">Help &amp; support</Link>.
      </p>
    </InfoPageLayout>
  )
}
