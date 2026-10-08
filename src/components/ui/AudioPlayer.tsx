'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Headphones } from 'lucide-react'
import styles from './audio-player.module.css'

type Props = {
  title: string
  /** Planned or actual length, shown before the file's metadata loads */
  duration: string
  src?: string
}

const formatTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/** Compact audio player; shows a "coming soon" row when no file is set. */
export default function AudioPlayer({ title, duration, src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrent(audio.currentTime)
    const onMeta = () => setTotal(audio.duration)
    // The button follows what the element is actually doing, not what was requested
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => {
      setPlaying(false)
      setFailed(true)
    }
    // Metadata can load before this effect runs, so read it now as well as on the event
    if (audio.readyState >= 1) onMeta()
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onPause)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onPause)
      audio.removeEventListener('error', onError)
    }
  }, [src])

  if (!src) {
    return (
      <div className={styles.player}>
        <span className={`${styles.button} ${styles.buttonIdle}`} aria-hidden="true">
          <Headphones size={17} />
        </span>
        <span className={styles.text}>
          <strong>{title}</strong>
          <small>Audio coming soon · {duration}</small>
        </span>
      </div>
    )
  }

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      setFailed(false)
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
    setCurrent(audio.currentTime)
  }

  const progress = total ? (current / total) * 100 : 0

  return (
    <div className={styles.player}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" className={styles.button} onClick={toggle} aria-label={playing ? `Pause ${title}` : `Play ${title}`}>
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <span className={styles.text}>
        <strong>{title}</strong>
        <span className={styles.timeline}>
          <input
            type="range"
            className={styles.range}
            min={0}
            max={total || 0}
            step={0.1}
            value={current}
            onChange={seek}
            aria-label={`Seek ${title}`}
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          />
          <small className={styles.time}>
            {failed ? 'Couldn’t play' : `${formatTime(current)} / ${total ? formatTime(total) : duration}`}
          </small>
        </span>
      </span>
    </div>
  )
}
