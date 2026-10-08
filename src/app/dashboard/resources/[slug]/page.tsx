import { notFound } from 'next/navigation'
import { articles, getArticle } from '../content'
import ArticleView from '../ArticleView'

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  return article ? { title: article.title, description: article.summary } : {}
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  return (
    <ArticleView
      article={article}
      backHref="/dashboard/resources"
      backLabel="All resources"
      startHref="/dashboard/applications/new"
    />
  )
}
