'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import type { ResourceVideo } from '@/app/dashboard/resources/content'
import styles from './video-card.module.css'

type Props = {
  video: ResourceVideo
  /** "compact" puts the title beside a smaller thumbnail (for tight spaces like the quiz) */
  layout?: 'card' | 'compact'
}

/**
 * A video with a thumbnail. Clicking plays it in place; without a file yet it shows "Coming soon".
 * Missing thumbnails fall back to a designed card in the video's accent colour.
 */
export default function VideoCard({ video, layout = 'card' }: Props) {
  const [playing, setPlaying] = useState(false)
  const ready = Boolean(video.src)

  const thumb = (
    <span className={styles.thumb} style={{ '--accent': video.accent } as React.CSSProperties}>
      {video.thumbnail ? (
        <Image
          src={video.thumbnail}
          alt=""
          fill
          sizes={layout === 'compact' ? '160px' : '(max-width: 560px) 80vw, 340px'}
          className={styles.thumbImg}
          // Full URLs skip the optimiser so any host works without extra config
          unoptimized={video.thumbnail.startsWith('http')}
        />
      ) : (
        <span className={styles.fallback} aria-hidden="true">
          <span className={styles.fallbackShape} />
          <span className={styles.fallbackShape2} />
        </span>
      )}
      <span className={styles.play} aria-hidden="true">
        <Play size={layout === 'compact' ? 13 : 18} fill="currentColor" />
      </span>
      <span className={styles.duration}>{video.duration}</span>
      {!ready && <span className={styles.soon}>Coming soon</span>}
    </span>
  )

  return (
    <figure className={`${styles.card} ${layout === 'compact' && !playing ? styles.compact : ''}`}>
      {playing && video.src ? (
        <video
          className={styles.player}
          src={video.src}
          poster={video.thumbnail}
          controls
          autoPlay
          playsInline
          aria-label={video.title}
        />
      ) : ready ? (
        <button type="button" className={styles.thumbButton} onClick={() => setPlaying(true)} aria-label={`Play: ${video.title}`}>
          {thumb}
        </button>
      ) : (
        thumb
      )}
      <figcaption className={styles.caption}>
        <span className={styles.title}>{video.title}</span>
        <span className={styles.blurb}>{layout === 'compact' ? `Video · ${video.duration}${ready ? '' : ' · Coming soon'}` : video.blurb}</span>
      </figcaption>
    </figure>
  )
}
