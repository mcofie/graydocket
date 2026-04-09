export const businessTypes = [
  { id: 'sole_proprietorship', icon: '🏢', name: 'Sole Proprietorship', desc: 'For individual entrepreneurs. Register under the Registration of Business Names Act (Form A).', price: 350, formRef: 'Form A', timeline: '2-3 working days' },
  { id: 'limited_by_shares', icon: '🏛️', name: 'Company Limited by Shares', desc: 'For teams and investors. Limited liability with share capital under the Companies Act 2019 (Form 3).', price: 1200, formRef: 'Form 3', timeline: '5-10 working days' },
  { id: 'limited_by_guarantee', icon: '🤝', name: 'Company Limited by Guarantee', desc: 'For NGOs, associations, and non-profits. No share capital required.', price: 1200, formRef: 'Form 3', timeline: '10-15 working days', comingSoon: true },
]

export const businessSectors = [
  'Agriculture & Agro-Processing', 'Manufacturing', 'Mining & Quarrying', 'Construction', 
  'Wholesale & Retail Trade', 'Information & Communication Technology', 'Financial & Insurance Services', 
  'Real Estate & Property', 'Education & Training', 'Health & Social Services', 
  'Hospitality & Tourism', 'Transportation & Logistics', 'Professional, Scientific & Technical Services', 
  'Arts, Entertainment & Recreation', 'Other (specify below)'
]

export const ghanaRegions = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern', 'Volta', 
  'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo', 'Western North', 'Oti', 'Savannah', 'North East'
]

export const addOns = [
  { id: 'domain', name: 'Domain Name', desc: 'Purchase a .com or .com.gh domain', price: 80 },
  { id: 'email', name: 'Business Email', desc: 'Professional email address setup', price: 120 },
  { id: 'website', name: 'Business Website', desc: 'Professional one-page website', price: 500 },
  { id: 'bank', name: 'Bank Account Setup', desc: 'Business bank account with partner bank', price: 0 },
]

export interface PersonEntry {
  title: string
  surname: string
  firstName: string
  otherNames: string
  dateOfBirth: string
  gender: string
  nationality: string
  occupation: string
  ghanaCardNumber: string
  tinNumber: string
  residentialAddress: string
  city: string
  region: string
  digitalAddress: string
  phone: string
  email: string
}

export const emptyPerson: PersonEntry = {
  title: '', surname: '', firstName: '', otherNames: '', dateOfBirth: '', gender: '', nationality: '', occupation: '',
  ghanaCardNumber: '', tinNumber: '', residentialAddress: '', city: '', region: '', digitalAddress: '', phone: '', email: ''
}

export interface ShareholderEntry {
  type: 'individual' | 'corporate'
  name: string
  tinNumber: string
  nationality: string
  address: string
  numberOfShares: string
  valuePerShare: string
}

export const emptyShareholder: ShareholderEntry = {
  type: 'individual', name: '', tinNumber: '', nationality: '', address: '', numberOfShares: '', valuePerShare: ''
}

export const bankPartners = [
  { id: 'zenith', name: 'Zenith Bank (Ghana)', logo: '🏙️', minBalance: 'GH₵ 0.00', perks: 'Free Business Cards, 24/7 Mobile Banking Support' },
  { id: 'ecobank', name: 'Ecobank Ghana', logo: '🦁', minBalance: 'GH₵ 100.00', perks: 'Omni Lite, Instant Multi-Currency Accounts' },
  { id: 'fnb', name: 'FNB Ghana', logo: '🌳', minBalance: 'GH₵ 50.00', perks: 'Gold Business Account, Zero-Fee Digital Payments' },
  { id: 'absavibe', name: 'Absa Bank Ghana', logo: '⚙️', minBalance: 'GH₵ 0.00', perks: 'Priority Relationship Manager, Instant Overdraft Facilities' },
]
