import Link from 'next/link'
import { Headphones, ChevronRight, ArrowRight, Clock } from 'lucide-react'
import VideoCard from '@/components/ui/VideoCard'
import { articles, audios, videos, getArticle, type Article } from './content'
import styles from './resources.module.css'

const categories: Article['category'][] = ['Getting started', 'Business types', 'After registration']

type Props = {
  /** Where the business-type quiz lives */
  quizHref: string
  /** Prefix for article links, e.g. "/dashboard/resources" or "/guides" */
  articleBase: string
  /** Where "Get help" goes */
  supportHref: string
}

type StepLink = { label: string; href: string; minutes?: number }
type Step = { title: string; desc: string; accent: string; primary?: StepLink; links: StepLink[] }

/** Videos and guides, shared by the dashboard Resources page and the public /resources page. */
export default function ResourcesView({ quizHref, articleBase, supportHref }: Props) {
  const guide = (slug: string, label?: string): StepLink => {
    const a = getArticle(slug)
    return { label: label ?? a?.title ?? slug, href: `${articleBase}/${slug}`, minutes: a?.readMinutes }
  }

  // The order a founder actually needs things in
  const steps: Step[] = [
    {
      title: 'Pick your business type',
      desc: 'Answer up to 3 quick questions and we’ll recommend one, with what you need and what it costs.',
      accent: 'var(--accent-blue)',
      primary: { label: 'Take the 1-minute quiz', href: quizHref },
      links: [guide('choosing-a-business-type', 'Compare the business types')],
    },
    {
      title: 'Choose a name',
      desc: 'How the ORC name search works, and how to pick a name that gets approved. We run the check for you.',
      accent: 'var(--accent-green)',
      links: [guide('checking-a-business-name', 'Choosing a name that gets approved')],
    },
    {
      title: 'Get your details ready',
      desc: 'Have these to hand and registration takes about 15 minutes.',
      accent: 'var(--accent-gold)',
      links: [
        guide('sole-proprietorship-checklist', 'Sole proprietorship'),
        guide('limited-company-checklist', 'Limited company'),
        guide('company-limited-by-guarantee', 'Non-profit'),
      ],
    },
    {
      title: 'After you register',
      desc: 'Annual returns, renewals, tax and SSNIT. We keep track and file for you; here’s what that covers.',
      accent: 'var(--accent-orange)',
      links: [guide('staying-compliant', 'What staying compliant involves')],
    },
  ]

  return (
    <div className={styles.column}>
      {/* Start here: a numbered path */}
      <section className={styles.section} aria-labelledby="start-here">
        <h2 id="start-here" className={styles.sectionTitle}>Start here</h2>
        <ol className={styles.path}>
          {steps.map((step, i) => (
            <li key={step.title} className={styles.step} style={{ '--accent': step.accent } as React.CSSProperties}>
              <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
                <div className={styles.stepLinks}>
                  {step.primary && (
                    <Link href={step.primary.href} className={`btn btn-primary btn-sm ${styles.stepPrimary}`}>
                      {step.primary.label} <ArrowRight size={14} />
                    </Link>
                  )}
                  {step.links.map((l) => (
                    <Link key={l.href} href={l.href} className={styles.stepLink}>
                      {l.label}
                      {l.minutes && <span className={styles.stepMins}>{l.minutes} min</span>}
                      <ChevronRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Watch */}
      <section className={styles.section} aria-labelledby="watch">
        <h2 id="watch" className={styles.sectionTitle}>Watch</h2>
        <div className={styles.videoGrid}>
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </section>

      {/* Listen */}
      <section className={styles.section} aria-labelledby="listen">
        <div className={styles.sectionHead}>
          <h2 id="listen" className={styles.sectionTitle}>Listen</h2>
          {audios.every((a) => !a.src) && <span className={styles.soonPill}>Coming soon</span>}
        </div>
        <div className={styles.mediaGrid}>
          {audios.map((a) => (
            <div key={a.id} className={styles.mediaTile}>
              <span className={styles.mediaIcon}>
                <Headphones size={15} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.mediaTitle}>{a.title}</span>
                <span className={styles.mediaMeta}>Audio · {a.duration}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Every guide, for browsing */}
      <section className={styles.section} aria-labelledby="all-guides">
        <h2 id="all-guides" className={styles.sectionTitle}>All guides</h2>
        <div className={styles.guideGroups}>
          {categories.map((category) => {
            const items = articles.filter((a) => a.category === category)
            if (items.length === 0) return null
            return (
              <div key={category} className={styles.guideGroup}>
                <h3 className={styles.groupTitle}>{category}</h3>
                <ul className={styles.guideList}>
                  {items.map((a) => (
                    <li key={a.slug}>
                      <Link href={`${articleBase}/${a.slug}`} className={styles.guideRow}>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>{a.title}</span>
                          <span className={styles.rowSub}>{a.summary}</span>
                        </span>
                        <span className={styles.readTime}>
                          <Clock size={12} /> {a.readMinutes} min
                        </span>
                        <ChevronRight size={16} className={styles.chevron} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Still stuck */}
      <section className={styles.helpCard}>
        <div>
          <h2 className={styles.helpTitle}>Still have questions?</h2>
          <p className={styles.helpText}>Talk to a real person on WhatsApp or email. No question is too small.</p>
        </div>
        <div className={styles.helpActions}>
          <Link href={supportHref} className="btn btn-secondary">
            Get help
          </Link>
        </div>
      </section>
    </div>
  )
}
