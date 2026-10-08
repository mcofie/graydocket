import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ResourcesView from '@/app/dashboard/resources/ResourcesView'
import styles from './resources-page.module.css'

export const metadata = {
  title: 'Resources',
  description: 'Videos and guides on registering and running a business in Ghana: business types, name search, requirements and staying compliant.',
}

// Public version of the dashboard Resources page; guides open at /guides/[slug]
export default function PublicResourcesPage() {
  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <header className={styles.hero}>
          <h1 className={styles.title}>Resources</h1>
          <p className={styles.lead}>Short videos and plain-English guides to starting a business in Ghana. Learn what you need, and leave the paperwork to us.</p>
        </header>
        <ResourcesView quizHref="/find-your-business-type" articleBase="/guides" />
      </main>
      <Footer />
    </div>
  )
}
