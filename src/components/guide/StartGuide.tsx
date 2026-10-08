'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Play, RotateCcw } from 'lucide-react'
import { guides, chooserVideo, quiz, type Guide, type GuideVideo } from './guides'
import styles from './StartGuide.module.css'

type Mode = 'know' | 'help'

export default function StartGuide() {
  const [mode, setMode] = useState<Mode>('know')

  return (
    <div className={styles.wrap}>
      <div className={styles.toggle} role="tablist" aria-label="How would you like to start?">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'know'}
          className={`${styles.toggleBtn} ${mode === 'know' ? styles.toggleActive : ''}`}
          onClick={() => setMode('know')}
        >
          I know what I need
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'help'}
          className={`${styles.toggleBtn} ${mode === 'help' ? styles.toggleActive : ''}`}
          onClick={() => setMode('help')}
        >
          Help me choose
        </button>
      </div>

      {mode === 'know' ? <ServicePicker /> : <Chooser />}
    </div>
  )
}

function ServicePicker() {
  const [selectedId, setSelectedId] = useState(guides[0].id)
  const selected = guides.find((g) => g.id === selectedId) ?? guides[0]

  const groups: { key: Guide['group']; label: string }[] = [
    { key: 'register', label: 'Register a business' },
    { key: 'comply', label: 'Stay compliant' },
  ]

  return (
    <div className={styles.panel}>
      <nav className={styles.picker}>
        {groups.map((group) => (
          <div key={group.key} className={styles.pickerGroup}>
            <div className={styles.pickerLabel}>{group.label}</div>
            {guides
              .filter((g) => g.group === group.key)
              .map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`${styles.pickerItem} ${g.id === selected.id ? styles.pickerItemActive : ''}`}
                  onClick={() => setSelectedId(g.id)}
                >
                  {g.title}
                </button>
              ))}
          </div>
        ))}
      </nav>
      <GuideDetail key={selected.id} guide={selected} />
    </div>
  )
}

function Chooser() {
  const [history, setHistory] = useState<string[]>(['purpose'])
  const current = history[history.length - 1]
  const result = current.startsWith('result:')
    ? guides.find((g) => g.id === current.slice('result:'.length))
    : undefined
  const question = result ? undefined : quiz[current]

  const back = () => setHistory((h) => h.slice(0, -1))

  return (
    <div className={styles.panel}>
      {question && (
        <>
          <div className={styles.quiz}>
            <div className={styles.quizProgress}>
              {history.length > 1 && (
                <button type="button" className={styles.backBtn} onClick={back}>
                  <ArrowLeft size={15} />
                  <span>Back</span>
                </button>
              )}
              <span className={styles.quizStep}>Question {history.length}</span>
            </div>
            <h3 className={styles.quizQuestion}>{question.question}</h3>
            <div className={styles.quizOptions}>
              {question.options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className={styles.quizOption}
                  onClick={() => setHistory((h) => [...h, o.next])}
                >
                  <span className={styles.quizOptionText}>
                    <span>{o.label}</span>
                    {o.hint && <span className={styles.quizHint}>{o.hint}</span>}
                  </span>
                  <ArrowRight size={16} className={styles.quizArrow} />
                </button>
              ))}
            </div>
          </div>
          <div className={styles.detail}>
            <VideoSlot video={chooserVideo} title="Which business type is right for me?" />
            <p className={styles.chooserNote}>
              Not sure yet? Watch a one-minute overview of the business types in Ghana, or{' '}
              <Link href="/support" className={styles.inlineLink}>request a call</Link> and we will help you decide.
            </p>
          </div>
        </>
      )}

      {result && (
        <>
          <div className={styles.quiz}>
            <div className={styles.quizProgress}>
              <button type="button" className={styles.backBtn} onClick={back}>
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
            </div>
            <span className={styles.resultEyebrow}>We recommend</span>
            <h3 className={styles.quizQuestion}>{result.title}</h3>
            <p className={styles.resultText}>{result.summary}</p>
            <button type="button" className={styles.restartBtn} onClick={() => setHistory(['purpose'])}>
              <RotateCcw size={14} />
              <span>Start over</span>
            </button>
          </div>
          <GuideDetail guide={result} />
        </>
      )}
    </div>
  )
}

function GuideDetail({ guide }: { guide: Guide }) {
  return (
    <div className={styles.detail}>
      <VideoSlot video={guide.video} title={guide.title} />
      <div className={styles.detailBody}>
        <div className={styles.detailHead}>
          <h3 className={styles.detailTitle}>{guide.title}</h3>
          <div className={styles.metaRow}>
            {guide.meta.map((m) => (
              <span key={m} className={styles.metaChip}>{m}</span>
            ))}
          </div>
        </div>
        <p className={styles.detailSummary}>{guide.summary}</p>
        <ol className={styles.steps}>
          {guide.steps.map((s, i) => (
            <li key={s} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <Link href={guide.cta.href} className={styles.ctaBtn}>
          <span>{guide.cta.label}</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}

function VideoSlot({ video, title }: { video: GuideVideo; title: string }) {
  if (video.src) {
    return (
      <video
        className={styles.video}
        src={video.src}
        poster={video.poster}
        controls
        playsInline
        preload="metadata"
        aria-label={`${title} video guide`}
      />
    )
  }

  return (
    <div className={styles.videoPlaceholder} aria-label={`${title} video guide, coming soon`}>
      <span className={styles.playBtn}>
        <Play size={20} fill="currentColor" />
      </span>
      <span className={styles.videoLabel}>Video guide coming soon</span>
      <span className={styles.videoDuration}>{video.duration}</span>
    </div>
  )
}
