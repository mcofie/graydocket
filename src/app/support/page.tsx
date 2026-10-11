import { pageMetadata } from '@/lib/metadata'
import Link from 'next/link'
import { Mail, MessageCircle, Search, Compass, BookOpen, Tag, ChevronRight, ShieldCheck } from 'lucide-react'
import InfoPageLayout from '@/components/InfoPageLayout'
import GuideBanner from '@/components/doodles/GuideBanner'
import { getBusinessTypes } from '@/lib/actions'
import { businessTypes } from '@/app/dashboard/applications/new/constants'
import { priceForType, type DbBusinessType } from '@/app/dashboard/applications/new/pricing'
import blocks from '@/components/info-blocks.module.css'

export const metadata = pageMetadata('Help & Support', 'Get help with your GrayDocket registration: contact us, track an application, or find answers.', '/support')

const SUPPORT_EMAIL = 'support@graydocket.com'
const WHATSAPP_DISPLAY = '+233 558 508 306'
const WHATSAPP_LINK = 'https://wa.me/233558508306'

const QUICK_LINKS = [
  { href: '/track', icon: Search, title: 'Track an application', desc: 'Check progress with your tracking ID' },
  { href: '/find-your-business-type', icon: Compass, title: 'Find your business type', desc: 'Answer a few questions to see what fits' },
  { href: '/resources', icon: BookOpen, title: 'Guides & videos', desc: 'Requirements, name search and staying compliant' },
  { href: '/pricing', icon: Tag, title: 'Pricing', desc: 'What each registration costs' },
  { href: '/security', icon: ShieldCheck, title: 'Security & account safety', desc: 'Protect your account or report a concern' },
]

export default async function SupportPage() {
  // Timelines come from the same source as pricing and checkout, so answers stay current
  const dbTypes = (await getBusinessTypes()) as DbBusinessType[]
  const timelines = businessTypes
    .map((t) => ({ name: t.name, timeline: priceForType(t.id, dbTypes).timeline }))
    .filter((t) => t.timeline)

  const faqs: Array<{ q: string; a: React.ReactNode }> = [
    {
      q: 'How long does registration take?',
      a: (
        <>
          {timelines.length > 0 ? 'Once your application is submitted, it usually takes ' : 'Processing time depends on your business type. '}
          {timelines.map((t, i) => (
            <span key={t.name}>
              {t.timeline} for a {t.name.toLowerCase()}
              {i < timelines.length - 2 ? ', ' : i === timelines.length - 2 ? ' and ' : '.'}
            </span>
          ))}{' '}
          Timelines depend on the ORC, and we update your dashboard at every step.
        </>
      ),
    },
    {
      q: 'Do I need to visit the ORC in person?',
      a: 'No. We handle the filing for you, and your certificates arrive digitally in your Documents.',
    },
    {
      q: 'Can I save my application and finish later?',
      a: 'Yes. Your progress is saved as you go, so you can come back to it from your dashboard at any time.',
    },
    {
      q: 'When do I pay?',
      a: 'At the end of your registration, after you’ve reviewed everything. Payment is handled securely by Paystack.',
    },
    {
      q: 'My payment went through, but my application still says unpaid. What should I do?',
      a: 'Check your application again after a few minutes. If the status has not updated, contact us with your tracking ID, Paystack reference, amount and payment date. Please do not pay again while we check the transaction.',
    },
    {
      q: 'I cannot receive my sign-in code. Can you help?',
      a: 'Check that the phone number is correct and that your phone can receive SMS, then try again after a short wait. If you still cannot sign in, contact support with the phone number on your account. Never send us your sign-in code.',
    },
    {
      q: 'Where can I find my certificate and documents?',
      a: <>Log in and open <Link href="/dashboard/documents">Documents</Link> to see the files available for your account. If a document is missing, include your tracking ID when contacting us.</>,
    },
    {
      q: 'What if the registrar asks for changes?',
      a: 'You’ll see exactly what needs fixing on your application page. Update the details and resubmit at no extra cost.',
    },
  ]

  return (
    <InfoPageLayout title="Help & support" subtitle="Questions about starting your business? We’re here to help.">
      <div className={blocks.banner}><GuideBanner illustration="support" /></div>
      <div className={blocks.cards}>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><Mail size={18} /></span>
          <h3>Email us</h3>
          <p>Best for detailed questions about an application.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={blocks.cardLink}>{SUPPORT_EMAIL}</a>
        </div>
        <div className={blocks.card}>
          <span className={blocks.cardIcon}><MessageCircle size={18} /></span>
          <h3>WhatsApp</h3>
          <p>Quick questions and updates on the go.</p>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className={blocks.cardLink}>
            {WHATSAPP_DISPLAY}
          </a>
        </div>
      </div>

      <section className={blocks.contactChecklist}>
        <h2>Help us find your application</h2>
        <p>When you get in touch, include:</p>
        <ul>
          <li>Your business name and tracking ID, if you have one.</li>
          <li>A short description of what you need help with.</li>
          <li>For payment queries, the Paystack reference, amount and date. Do not send card details or PINs.</li>
        </ul>
        <p>You do not need an account to contact us. Never send sign-in codes or identity documents in your first message.</p>
      </section>

      <div className={blocks.rows}>
        {QUICK_LINKS.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className={blocks.row}>
            <span className={blocks.rowIcon}><Icon size={18} strokeWidth={1.75} /></span>
            <span className={blocks.rowText}>
              <strong>{title}</strong>
              <small>{desc}</small>
            </span>
            <ChevronRight size={18} className={blocks.rowArrow} />
          </Link>
        ))}
      </div>

      <section>
        <h2>Frequently asked questions</h2>
        <div className={blocks.faqList}>
          {faqs.map((f) => (
            <details key={f.q} className={blocks.faq}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className={blocks.note}>
        Have an account? <Link href="/auth/login">Log in</Link> to see your applications, documents and any requests from
        your case manager.
      </p>
    </InfoPageLayout>
  )
}
