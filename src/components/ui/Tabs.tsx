'use client'

import { useRef } from 'react'
import styles from './tabs.module.css'

export type TabItem<T extends string> = { id: T; label: string; count?: number }

type Props<T extends string> = {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  /** Optional content pinned to the right of the tab row, e.g. a search button */
  end?: React.ReactNode
  className?: string
}

/** Underlined text tabs used across the app. Arrow keys move between tabs. */
export default function Tabs<T extends string>({ items, value, onChange, label, end, className }: Props<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = items.length - 1
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    onChange(items[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className={`${styles.bar} ${className ?? ''}`}>
      <div className={styles.list} role="tablist" aria-label={label}>
        {items.map((item, i) => {
          const selected = item.id === value
          return (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.active : ''}`}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && <span className={styles.count}>{item.count}</span>}
            </button>
          )
        })}
      </div>
      {end && <div className={styles.end}>{end}</div>}
    </div>
  )
}
