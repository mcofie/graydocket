import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { articles, getArticle } from '@/app/dashboard/resources/content'
import ArticleView from '@/app/dashboard/resources/ArticleView'
import styles from '../guides.module.css'

// Public copies of the Resources guides, so the logged-out quiz can link to them

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  return article ? { title: article.title, description: article.summary } : {}
}

export default async function PublicGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <ArticleView
          article={article}
          backHref="/resources"
          backLabel="All resources"
          startHref="/auth/register?redirect=%2Fdashboard%2Fapplications%2Fnew"
        />
      </main>
      <Footer />
    </div>
  )
}
