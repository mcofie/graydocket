// Emoji/icon avatars live in auth user_metadata.avatar_choice; uploaded photos live in profiles.avatar_url.

export type AvatarChoice = { type: 'emoji'; value: string } | { type: 'icon'; value: AvatarIconName }

export const AVATAR_EMOJIS = [
  '😀', '😎', '🤓', '🥳', '🤠', '🧐',
  '🦁', '🐯', '🦊', '🐼', '🐙', '🦉',
  '🌻', '🌍', '🔥', '⚡️', '🌈', '⭐️',
  '🚀', '💼', '🏢', '📈', '🎯', '💡',
]

export const AVATAR_ICON_NAMES = [
  'briefcase', 'building', 'store', 'rocket', 'star', 'heart',
  'leaf', 'sun', 'zap', 'crown', 'gem', 'compass',
] as const

export type AvatarIconName = (typeof AVATAR_ICON_NAMES)[number]

export function parseAvatarChoice(value: unknown): AvatarChoice | null {
  if (!value || typeof value !== 'object') return null
  const v = value as { type?: unknown; value?: unknown }
  if (v.type === 'emoji' && typeof v.value === 'string' && AVATAR_EMOJIS.includes(v.value)) {
    return { type: 'emoji', value: v.value }
  }
  if (v.type === 'icon' && typeof v.value === 'string' && (AVATAR_ICON_NAMES as readonly string[]).includes(v.value)) {
    return { type: 'icon', value: v.value as AvatarIconName }
  }
  return null
}
