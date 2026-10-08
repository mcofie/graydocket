import { businessTypes } from '@/app/dashboard/applications/new/constants'

export type GuideVideo = {
  /** Path under /public (e.g. "/videos/sole-proprietorship.mp4") or a full URL. Leave unset to show a placeholder. */
  src?: string
  poster?: string
  duration: string
}

export type Guide = {
  id: string
  group: 'register' | 'comply'
  title: string
  summary: string
  meta: string[]
  steps: string[]
  video: GuideVideo
  cta: { label: string; href: string }
}

const typeMeta = (id: string) => {
  const t = businessTypes.find((b) => b.id === id)
  return t ? [t.formRef, t.timeline] : []
}

export const guides: Guide[] = [
  {
    id: 'sole_proprietorship',
    group: 'register',
    title: 'Sole Proprietorship',
    summary: 'The quickest way to trade legally under a business name when you are going it alone.',
    meta: typeMeta('sole_proprietorship'),
    steps: [
      'Search and pick an available business name',
      'Add your personal details and Ghana Card',
      'Pay and we file Form A with the ORC',
    ],
    video: { duration: '0:45' },
    cta: { label: 'Register a sole proprietorship', href: '/dashboard/applications/new?type=sole_proprietorship' },
  },
  {
    id: 'limited_by_shares',
    group: 'register',
    title: 'Company Limited by Shares',
    summary: 'A separate legal entity that protects your personal assets and lets you bring in co-founders or investors.',
    meta: typeMeta('limited_by_shares'),
    steps: [
      'Search and pick an available company name',
      'Add at least two directors, a secretary and shareholders',
      'Pay and we draft your constitution and file Form 3',
    ],
    video: { duration: '1:10' },
    cta: { label: 'Register a limited company', href: '/dashboard/applications/new?type=limited_by_shares' },
  },
  {
    id: 'limited_by_guarantee',
    group: 'register',
    title: 'Company Limited by Guarantee',
    summary: 'The structure for NGOs, charities, associations and foundations. No share capital required.',
    meta: typeMeta('limited_by_guarantee'),
    steps: [
      'Search and pick an available organisation name',
      'Add your directors, secretary and guarantors',
      'Pay and we file Form 3 with the ORC',
    ],
    video: { duration: '1:00' },
    cta: { label: 'Register a non-profit', href: '/dashboard/applications/new?type=limited_by_guarantee' },
  },
  {
    id: 'annual_returns',
    group: 'comply',
    title: 'Annual Returns',
    summary: 'Every registered company files annual returns with the ORC to stay in good standing.',
    meta: ['Every year', 'Companies'],
    steps: [
      'Add your registered company to GrayDocket',
      'Confirm your directors and shareholders are up to date',
      'We prepare and file your return before the deadline',
    ],
    video: { duration: '0:50' },
    cta: { label: 'File annual returns', href: '/compliance/annual-returns' },
  },
  {
    id: 'renewal',
    group: 'comply',
    title: 'Business Name Renewal',
    summary: 'Sole proprietorships and partnerships renew their registration to keep trading under their name.',
    meta: ['Every year', 'Sole props & partnerships'],
    steps: [
      'Add your registered business name',
      'Check your details are still correct',
      'We file the renewal and send you the updated certificate',
    ],
    video: { duration: '0:40' },
    cta: { label: 'Renew a business name', href: '/compliance/renewal' },
  },
  {
    id: 'tin',
    group: 'comply',
    title: 'TIN & GRA Activation',
    summary: 'Get your Tax Identification Number and connect your business to the Ghana Revenue Authority.',
    meta: ['One-off', 'All businesses'],
    steps: [
      'Share your registration certificate',
      'We generate your TIN and activate your GRA profile',
      'Your tax details are saved to your document vault',
    ],
    video: { duration: '0:55' },
    cta: { label: 'Get your TIN', href: '/compliance/tin' },
  },
  {
    id: 'ssnit',
    group: 'comply',
    title: 'SSNIT Registration',
    summary: 'Register as an employer so your team is covered by social security.',
    meta: ['One-off', 'Employers'],
    steps: [
      'Tell us about your business and staff',
      'We register you as an employer with SSNIT',
      'Track monthly contribution deadlines in your dashboard',
    ],
    video: { duration: '0:45' },
    cta: { label: 'Register with SSNIT', href: '/compliance/ssnit' },
  },
]

export const chooserVideo: GuideVideo = { duration: '1:00' }

export type QuizOption = { label: string; hint?: string; next: string }
export type QuizQuestion = { id: string; question: string; options: QuizOption[] }

/** `next` is either another question id or `result:<guide id>`. */
export const quiz: Record<string, QuizQuestion> = {
  purpose: {
    id: 'purpose',
    question: 'What are you setting up?',
    options: [
      { label: 'A business to make a profit', next: 'owners' },
      { label: 'A non-profit, NGO or charity', next: 'result:limited_by_guarantee' },
      { label: 'My business is already registered', hint: 'I need to stay compliant', next: 'existing' },
    ],
  },
  owners: {
    id: 'owners',
    question: 'Who owns the business?',
    options: [
      { label: 'Just me', next: 'liability' },
      { label: 'Me and co-founders or investors', next: 'result:limited_by_shares' },
    ],
  },
  liability: {
    id: 'liability',
    question: 'Do you want your personal assets protected from business debts?',
    options: [
      { label: 'Yes, keep them separate', hint: 'You will need a second director', next: 'result:limited_by_shares' },
      { label: 'Not right now', hint: 'Start simple, upgrade later', next: 'result:sole_proprietorship' },
    ],
  },
  existing: {
    id: 'existing',
    question: 'What kind of business do you have?',
    options: [
      { label: 'A limited company', next: 'result:annual_returns' },
      { label: 'A sole proprietorship or partnership', next: 'result:renewal' },
    ],
  },
}
