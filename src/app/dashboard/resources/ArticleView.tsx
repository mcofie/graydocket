import Link from 'next/link'
import type { Article } from './content'
import styles from './resources.module.css'

type Props = {
  article: Article
  backHref: string
  backLabel: string
  /** Where "Start a registration" goes (the dashboard form, or sign-up on the public site) */
  startHref: string
}

/** A written guide, shared by the dashboard Resources page and the public /guides pages. */
export default function ArticleView({ article, backHref, backLabel, startHref }: Props) {
  return (
    <article className={styles.article}>
      <p className={styles.articleMeta}>
        <Link href={backHref} className={styles.metaLink}>{backLabel}</Link>
        <span aria-hidden="true">/</span>
        <span>{article.category}</span>
        <span aria-hidden="true">·</span>
        <span>{article.readMinutes} min read</span>
      </p>
      <h1 className={styles.articleTitle}>{article.title}</h1>

      <div className={styles.articleBody}>
        <p>{article.summary}</p>
        {article.body.map((block, i) => {
          switch (block.type) {
            case 'h2':
              return <h2 key={i}>{block.text}</h2>
            case 'ul':
              return (
                <ul key={i}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )
            case 'note':
              return (
                <p key={i}>
                  <strong>Good to know:</strong> {block.text}
                </p>
              )
            default:
              return <p key={i}>{block.text}</p>
          }
        })}
      </div>

      <p className={styles.articleEnd}>
        Ready to start? <Link href={startHref}>Start my business</Link> or{' '}
        <Link href="/support">talk to us</Link>.
      </p>
    </article>
  )
}
