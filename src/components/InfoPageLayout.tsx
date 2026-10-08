import Header from './Header'
import Footer from './Footer'
import styles from './InfoPageLayout.module.css'

interface InfoPageLayoutProps {
  title: string
  subtitle?: string
  /** Optional "Last updated" line, e.g. for legal pages */
  updated?: string
  children: React.ReactNode
}

/** Shared shell for text pages: legal, security, support, services and compliance. */
export default function InfoPageLayout({ title, subtitle, updated, children }: InfoPageLayoutProps) {
  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <article className={styles.container}>
          <header className={styles.header}>
            {updated && <p className={styles.updated}>Last updated {updated}</p>}
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </header>
          <div className={styles.content}>{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
