import Link from 'next/link'
import { Play, BookOpen, ChevronRight, Compass } from 'lucide-react'
import { articles, videos, type Article, type ResourceVideo } from './content'
import styles from './resources.module.css'

const categories: Article['category'][] = ['Getting started', 'Business types', 'After registration']

function VideoCard({ video }: { video: ResourceVideo }) {
  return (
    <figure className={styles.video}>
      {video.src ? (
        <video
          className={styles.videoFrame}
          src={video.src}
          poster={video.poster}
          controls
          playsInline
          preload="metadata"
          aria-label={video.title}
        />
      ) : (
        <div className={`${styles.videoFrame} ${styles.videoPlaceholder}`}>
          <span className={styles.play}>
            <Play size={18} fill="currentColor" />
          </span>
          <span className={styles.soon}>Coming soon</span>
          <span className={styles.duration}>{video.duration}</span>
        </div>
      )}
      <figcaption className={styles.videoTitle}>{video.title}</figcaption>
    </figure>
  )
}

type Props = {
  /** Where the "Not sure which business type?" card points */
  quizHref: string
  /** Prefix for article links, e.g. "/dashboard/resources" or "/guides" */
  articleBase: string
}

/** Videos and guides, shared by the dashboard Resources page and the public /resources page. */
export default function ResourcesView({ quizHref, articleBase }: Props) {
  return (
    <div className={styles.column}>
      <Link href={quizHref} className={styles.quizCard}>
        <span className={styles.quizIcon}>
          <Compass size={20} strokeWidth={1.75} />
        </span>
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>Not sure which business type is right for you?</span>
          <span className={styles.rowSub}>Answer up to 3 questions and see what you’ll need and what it costs.</span>
        </span>
        <ChevronRight size={18} className={styles.chevron} />
      </Link>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Videos</h2>
        <div className={styles.videoGrid}>
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </section>

      {categories.map((category) => {
        const items = articles.filter((a) => a.category === category)
        if (items.length === 0) return null
        return (
          <section key={category} className={styles.section}>
            <h2 className={styles.sectionTitle}>{category}</h2>
            <div className={styles.list}>
              {items.map((a) => (
                <Link key={a.slug} href={`${articleBase}/${a.slug}`} className={styles.row}>
                  <span className={styles.icon}>
                    <BookOpen size={18} strokeWidth={1.75} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{a.title}</span>
                    <span className={styles.rowSub}>{a.summary}</span>
                  </span>
                  <span className={styles.readTime}>{a.readMinutes} min</span>
                  <ChevronRight size={18} className={styles.chevron} />
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
