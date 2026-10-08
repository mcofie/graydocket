// "Which business type is right for me?" quiz used at /dashboard/choose.
// Results point at registerable types (see new/constants.ts) and at Resources content.

export type QuizOption = { label: string; hint?: string; next: string }
export type QuizQuestion = { question: string; help?: string; options: QuizOption[] }

/** `next` is either another question id or `result:<business type id>`. */
export const questions: Record<string, QuizQuestion> = {
  purpose: {
    question: 'What are you setting up?',
    options: [
      { label: 'A business to make a profit', next: 'owners' },
      { label: 'A non-profit, NGO, charity or association', next: 'result:limited_by_guarantee' },
    ],
  },
  owners: {
    question: 'Who will own the business?',
    options: [
      { label: 'Just me', next: 'liability' },
      { label: 'Me and co-founders or investors', next: 'result:limited_by_shares' },
    ],
  },
  liability: {
    question: 'Do you want your personal assets kept separate from the business?',
    help: 'With a company, the business’s debts are its own. As a sole proprietor, you are personally responsible for them.',
    options: [
      { label: 'Yes, keep them separate', hint: 'You will need a second director', next: 'result:limited_by_shares' },
      { label: 'Not right now', hint: 'Start simple and upgrade later', next: 'result:sole_proprietorship' },
    ],
  },
}

export const firstQuestion = 'purpose'

export type QuizResult = {
  typeId: 'sole_proprietorship' | 'limited_by_shares' | 'limited_by_guarantee'
  why: string
  requirements: string[]
  articleSlug: string
}

export const results: Record<QuizResult['typeId'], QuizResult> = {
  sole_proprietorship: {
    typeId: 'sole_proprietorship',
    why: 'You’re starting on your own and want the quickest, simplest way to trade under a registered name.',
    requirements: [
      'Your Ghana Card and clear photos of it',
      'Your TIN',
      'A proposed business name, plus a backup',
      'Your business address, including its digital address',
      'A short description of what the business does',
      'Your phone number and email',
    ],
    articleSlug: 'sole-proprietorship-checklist',
  },
  limited_by_shares: {
    typeId: 'limited_by_shares',
    why: 'A company keeps your personal assets separate and lets you bring in co-founders or investors through shares.',
    requirements: [
      'At least two directors, one living in Ghana, each with a Ghana Card and TIN',
      'A company secretary',
      'At least one shareholder and how many shares each holds',
      'A licensed auditor and their ICAG licence number',
      'A registered office address with its digital address',
      'Stated capital and the beneficial owner’s details',
    ],
    articleSlug: 'limited-company-checklist',
  },
  limited_by_guarantee: {
    typeId: 'limited_by_guarantee',
    why: 'Non-profits register as a company limited by guarantee: no shares, and any surplus goes back into your mission.',
    requirements: [
      'Directors and a company secretary, each with a Ghana Card and TIN',
      'Details of the guarantors (members)',
      'A clear description of the organisation’s objects',
      'A registered office address with its digital address',
    ],
    articleSlug: 'company-limited-by-guarantee',
  },
}
