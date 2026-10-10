import type { Metadata } from 'next'
import InfoPageLayout from '@/components/InfoPageLayout'
import { KeyRound, Lock, UserCheck, Mail } from 'lucide-react'
import blocks from '@/components/info-blocks.module.css'

export const metadata: Metadata = {
  title: 'Security',
  description: 'How GrayDocket protects your account, documents, and corporate records with enterprise-grade encryption.',
}

// Keep every statement here true to how the product works today.
export default function SecurityPage() {
  return (
    <InfoPageLayout title="Security" subtitle="How we protect your account and your business records.">
      <div className={blocks.cards}>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><KeyRound size={18} /></span>
          <h3>No passwords to steal</h3>
          <p>You sign in with a one-time code sent to your phone.</p>
        </div>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><Lock size={18} /></span>
          <h3>Encrypted connections</h3>
          <p>Everything you send to GrayDocket travels over HTTPS.</p>
        </div>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><UserCheck size={18} /></span>
          <h3>Limited access</h3>
          <p>Only you and the team members handling your application can see it.</p>
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
          GrayDocket doesn&apos;t use passwords. Each time you sign in, we text a one-time code to the phone number on your
          account. Codes expire after a short time, so keep your phone secure and never share a code with
          anyone, including people who say they work for GrayDocket.
        </p>
      </section>

      <section>
        <h2>Your data in transit and at rest</h2>
        <p>
          Your connection to GrayDocket is encrypted with HTTPS. Your account and application records are stored with
          Supabase, our database provider, which encrypts stored data.
        </p>
      </section>

      <section>
        <h2>Who can see your applications</h2>
        <p>
          Your applications are visible to you and to the GrayDocket team members who process them, such as the registrar
          assigned to your case. We share details with government agencies like the ORC only as needed to complete the
          services you request.
        </p>
      </section>

      <section>
        <h2>Reporting a security issue</h2>
        <p>
          If you notice anything suspicious on your account, or believe you&apos;ve found a security issue, email{' '}
          <a href="mailto:support@graydocket.com">support@graydocket.com</a>. Please include as much detail as you can.
        </p>
      </section>
    </InfoPageLayout>
  )
}
