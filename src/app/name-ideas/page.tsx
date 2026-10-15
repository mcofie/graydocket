import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { pageMetadata } from '@/lib/metadata'
import { JsonLd, breadcrumbLd, faqLd, webAppLd } from '@/lib/structured-data'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import NameFinder from './NameFinder'
import styles from './name-ideas.module.css'

const DESCRIPTION =
  'Stuck on a name? Get business name ideas for Ghana, check them against the ORC register and for a website address, then register the one you love.'

export const metadata = pageMetadata('Business Name Ideas', DESCRIPTION, '/name-ideas')

const STEPS = [
  { title: 'Find a name you love', text: 'Try a few feels, keep the names that stand out and say them out loud.' },
  { title: 'Check it with the ORC', text: 'We search the register for close matches and check the web address for names you keep.' },
  { title: 'Register it with us', text: 'Tap Register on your favourite. We file it with the ORC and keep you updated.' },
]

const FAQS = [
  {
    q: 'What names will the ORC turn down?',
    a: 'Names that are the same as, or very close to, a business already on the register. Also names that suggest a link to government, or that use words like bank, insurance or university, which need special approval or a licence. The finder leaves those words out.',
  },
  {
    q: 'Does my name need “Limited” or “LBG” at the end?',
    a: 'A company limited by shares ends in “Limited” and a company limited by guarantee ends in “LBG”. A sole proprietorship needs neither. We add the right ending for you when you register.',
  },
  {
    q: 'Can I use a Twi or other Ghanaian-language name?',
    a: 'Yes. Pick “Rooted in Ghana” for names built on Twi words, each with its meaning. Simple spellings work best, so customers can type the name and find you online.',
  },
  {
    q: 'Does “Looks free at ORC” mean the name is mine?',
    a: 'Not yet. It means no close match came up in the registrar’s search today. A name is only yours once the ORC registers it, so it’s worth registering soon after you decide.',
  },
  {
    q: 'Should I check the web address too?',
    a: 'It helps. When you keep a name, we check whether its .com and .com.gh addresses are free, so your name and website can match.',
  },
]

export default function NameIdeasPage() {
  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <NameFinder />

        <section className={styles.steps} aria-labelledby="next-title">
          <h2 id="next-title" className={styles.blockTitle}>From name to registered business</h2>
          <ol className={styles.stepList}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepNum}>{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <Link href="/find-your-business-type" className="btn btn-primary">
            Start my business <ArrowRight size={16} />
          </Link>
        </section>

        <section className={styles.faqs} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.blockTitle}>Naming your business in Ghana</h2>
          <div className={styles.faqList}>
            {FAQS.map((f) => (
              <details key={f.q} className={styles.faq}>
                <summary>
                  <span>{f.q}</span>
                  <Plus size={18} className={styles.faqIcon} />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <JsonLd
          data={[
            webAppLd({ name: 'GrayDocket Business Name Finder', description: DESCRIPTION, path: '/name-ideas' }),
            faqLd(FAQS),
            breadcrumbLd([{ name: 'Business name ideas', path: '/name-ideas' }]),
          ]}
        />
      </main>
      <Footer />
    </div>
  )
}
