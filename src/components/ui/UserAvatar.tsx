import {
  Briefcase,
  Building2,
  Store,
  Rocket,
  Star,
  Heart,
  Leaf,
  Sun,
  Zap,
  Crown,
  Gem,
  Compass,
  type LucideIcon,
} from 'lucide-react'
import type { AvatarChoice, AvatarIconName } from '@/lib/avatar'
import styles from './user-avatar.module.css'

export const AVATAR_ICONS: Record<AvatarIconName, LucideIcon> = {
  briefcase: Briefcase,
  building: Building2,
  store: Store,
  rocket: Rocket,
  star: Star,
  heart: Heart,
  leaf: Leaf,
  sun: Sun,
  zap: Zap,
  crown: Crown,
  gem: Gem,
  compass: Compass,
}

type Props = {
  size: number
  name?: string
  avatarUrl?: string | null
  choice?: AvatarChoice | null
  className?: string
}

/** Photo, then emoji/icon choice, then the name's initial. */
export default function UserAvatar({ size, name, avatarUrl, choice, className }: Props) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  const cls = `${styles.avatar} ${className ?? ''}`

  if (avatarUrl) {
    return (
      <span className={cls} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className={styles.img} />
      </span>
    )
  }

  if (choice?.type === 'emoji') {
    return (
      <span className={cls} style={{ ...style, fontSize: Math.round(size * 0.52) }} role="img" aria-hidden="true">
        {choice.value}
      </span>
    )
  }

  if (choice?.type === 'icon') {
    const Icon = AVATAR_ICONS[choice.value]
    return (
      <span className={`${cls} ${styles.icon}`} style={style}>
        <Icon size={Math.round(size * 0.46)} strokeWidth={1.75} />
      </span>
    )
  }

  return (
    <span className={cls} style={style}>
      {name?.trim().charAt(0).toUpperCase()}
    </span>
  )
}
