import Header from './Header'
import Footer from './Footer'
import styles from './InfoPageLayout.module.css'

interface InfoPageLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function InfoPageLayout({ title, subtitle, children }: InfoPageLayoutProps) {
  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </header>
          <div className={styles.content}>
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
