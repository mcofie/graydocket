import type { GuideIllustration } from '@/app/dashboard/resources/content'
import {
  BeanBuddy, Calendar, CheckBadge, CloudBuddy, Document, FlowerBuddy,
  Heart, Magnifier, Shield, Shop, Sparkle, TriangleBuddy, ChatBubble,
} from './HeroDoodles'
import styles from './guide-banner.module.css'

type BannerIllustration = GuideIllustration | 'security' | 'support'

function Checklist({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(6)`}>
      <rect x={-62} y={-84} width={124} height={168} rx={16} fill="#ffffff" />
      <rect x={-26} y={-94} width={52} height={22} rx={8} fill="#f5b442" />
      {[-40, 0, 40].map((row) => (
        <g key={row}>
          <rect x={-42} y={row - 10} width={22} height={22} rx={6} fill="#d3f3e1" />
          <path d={`M -37 ${row} l 5 5 l 9 -11`} fill="none" stroke="#2a9d5f" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={-8} y={row - 3} width={46} height={7} rx={3.5} fill="#e6dfd2" />
        </g>
      ))}
    </g>
  )
}

function BusinessTypes() {
  return (
    <>
      <path d="M 400 220 V 100 M 400 145 H 190 V 116 M 400 145 H 610 V 116" fill="none" stroke="#e6dfd2" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <Shop x={190} y={76} />
      <g transform="translate(400 76) scale(.65)"><BeanBuddy x={-44} y={0} /><TriangleBuddy x={62} y={0} /></g>
      <Heart x={610} y={76} s={1.45} />
      <CloudBuddy x={400} y={220} s={0.43} />
      <Sparkle x={275} y={216} fill="#4dafff" />
      <Sparkle x={522} y={206} />
    </>
  )
}

function NameSearch() {
  return (
    <>
      <CloudBuddy x={290} y={154} s={0.75} />
      <g transform="translate(502 143) rotate(-6)">
        <rect x={-90} y={-62} width={180} height={124} rx={20} fill="#ffffff" />
        <rect x={-66} y={-36} width={60} height={10} rx={5} fill="#cfe8ff" />
        <rect x={-66} y={-8} width={132} height={12} rx={6} fill="#e6dfd2" />
        <rect x={-66} y={20} width={94} height={10} rx={5} fill="#e6dfd2" />
      </g>
      <Magnifier x={506} y={140} />
      <CheckBadge x={603} y={204} />
      <Sparkle x={188} y={72} />
      <Sparkle x={609} y={69} fill="#44c67f" />
    </>
  )
}

function SoleProprietor() {
  return (
    <>
      <Shop x={207} y={139} />
      <CloudBuddy x={373} y={151} s={0.72} />
      <Checklist x={567} y={149} />
      <CheckBadge x={225} y={228} />
      <Sparkle x={287} y={58} fill="#44c67f" />
      <Sparkle x={661} y={210} />
    </>
  )
}

function LimitedCompany() {
  return (
    <>
      <path d="M 250 142 Q 385 40 523 139 M 267 190 Q 395 270 523 190" fill="none" stroke="#e6dfd2" strokeWidth={5} strokeDasharray="8 12" strokeLinecap="round" />
      <BeanBuddy x={238} y={155} />
      <TriangleBuddy x={380} y={166} />
      <Checklist x={563} y={149} />
      <g transform="translate(373 65)">
        <circle r={31} fill="#fdecc8" />
        <path d="M 0 0 V -31 A 31 31 0 0 1 31 0 Z" fill="#f5b442" />
      </g>
      <Sparkle x={168} y={70} fill="#4dafff" />
      <Sparkle x={663} y={222} />
    </>
  )
}

function NonProfit() {
  return (
    <>
      <path d="M 284 186 Q 400 254 516 186" fill="none" stroke="#e6dfd2" strokeWidth={8} strokeLinecap="round" />
      <BeanBuddy x={262} y={162} />
      <FlowerBuddy x={527} y={162} />
      <Heart x={400} y={117} s={2.1} />
      <Shield x={400} y={228} s={0.65} />
      <Sparkle x={192} y={76} />
      <Sparkle x={603} y={91} fill="#44c67f" />
      <Sparkle x={612} y={231} fill="#4dafff" />
    </>
  )
}

function Compliance() {
  return (
    <>
      <Calendar x={220} y={123} />
      <CloudBuddy x={397} y={152} s={0.71} />
      <Document x={574} y={153} />
      <Shield x={574} y={174} s={0.8} />
      <CheckBadge x={217} y={225} />
      <Sparkle x={304} y={57} fill="#44c67f" />
      <Sparkle x={656} y={216} />
    </>
  )
}

function Security() {
  return (
    <>
      <Document x={226} y={145} />
      <CloudBuddy x={398} y={152} s={0.71} />
      <Shield x={577} y={143} s={1.65} />
      <CheckBadge x={575} y={150} />
      <Sparkle x={305} y={55} fill="#44c67f" />
      <Sparkle x={651} y={225} />
    </>
  )
}

function Support() {
  return (
    <>
      <CloudBuddy x={285} y={153} s={0.71} />
      <BeanBuddy x={523} y={173} />
      <ChatBubble x={472} y={73} />
      <Heart x={393} y={183} s={0.8} />
      <Sparkle x={185} y={60} />
      <Sparkle x={621} y={205} fill="#4dafff" />
    </>
  )
}

function Registration() {
  return (
    <>
      <path d="M 260 140 H 541" fill="none" stroke="#e6dfd2" strokeWidth={6} strokeDasharray="8 12" strokeLinecap="round" />
      <CloudBuddy x={224} y={155} s={0.62} />
      <Checklist x={421} y={148} />
      <g transform="translate(605 137) rotate(-6)">
        <rect x={-59} y={-76} width={118} height={152} rx={12} fill="#ffffff" />
        <rect x={-36} y={-48} width={72} height={8} rx={4} fill="#e6dfd2" />
        <rect x={-26} y={-28} width={52} height={8} rx={4} fill="#e6dfd2" />
        <path d="M -15 38 l -7 38 l 22 -12 l 22 12 l -7 -38" fill="#f5b442" />
        <circle cy={28} r={26} fill="#fbd38a" />
        <path d="M -11 28 l 8 8 l 15 -17" fill="none" stroke="#d98f17" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sparkle x={153} y={59} />
      <Sparkle x={680} y={212} fill="#44c67f" />
    </>
  )
}

function AnnualReturns() {
  return (
    <>
      <Calendar x={210} y={128} />
      <BeanBuddy x={340} y={168} />
      <Document x={555} y={147} />
      <CheckBadge x={579} y={181} />
      <path d="M 452 73 a 48 48 0 0 1 82 -9 M 534 64 l -2 -21 M 534 64 l -22 -2" fill="none" stroke="#f5b442" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={176} y={222} fill="#44c67f" />
      <Sparkle x={642} y={95} />
    </>
  )
}

export const videoScenes = {
  'business-types': BusinessTypes,
  'how-it-works': Registration,
  'name-search': NameSearch,
  'annual-returns': AnnualReturns,
}

const scenes = {
  'business-types': { Art: BusinessTypes, description: 'A blue doodle founder choosing between a shop, a company team and a non-profit heart.' },
  'name-search': { Art: NameSearch, description: 'A blue doodle founder checking a business name with a magnifying glass and an approval tick.' },
  'sole-proprietor': { Art: SoleProprietor, description: 'One doodle founder beside a shop and a completed registration checklist.' },
  'limited-company': { Art: LimitedCompany, description: 'Two doodle company partners with a share chart and a registration checklist.' },
  'non-profit': { Art: NonProfit, description: 'Doodle community members gathered around a heart and a protective shield.' },
  compliance: { Art: Compliance, description: 'A doodle founder keeping up with a filing calendar, checked documents and a protective shield.' },
  security: { Art: Security, description: 'A blue doodle founder beside business records and a green shield with a reassuring check mark.' },
  support: { Art: Support, description: 'Two friendly doodle characters talking through a question with a chat bubble and a heart.' },
} satisfies Record<BannerIllustration, { Art: () => React.JSX.Element; description: string }>

export default function GuideBanner({ illustration }: { illustration: BannerIllustration }) {
  const { Art, description } = scenes[illustration]
  return (
    <figure className={styles.banner}>
      <svg className={styles.art} viewBox="0 0 800 300" role="img" aria-label={description}>
        <circle cx={400} cy={150} r={130} fill="#f1ede3" />
        <circle cx={193} cy={190} r={59} fill="#f4f0e8" />
        <circle cx={611} cy={116} r={69} fill="#f4f0e8" />
        <ellipse cx={400} cy={278} rx={241} ry={9} fill="#e6dfd2" opacity={0.5} />
        <Art />
      </svg>
    </figure>
  )
}
