'use client'

import { FaTrophy, FaCalendarAlt, FaStar, FaMedal, FaGamepad, FaCrown, FaDice, FaChess } from 'react-icons/fa'
import { GiCardJoker, GiPingPongBat } from 'react-icons/gi'
import FeatureShowcase from './FeatureShowcase'

const FEATURES = [
  { icon: <FaTrophy />,      label: 'Tournaments' },
  { icon: <FaCalendarAlt />, label: 'Seasons' },
  { icon: <FaStar />,        label: 'Rankings' },
  { icon: <FaMedal />,       label: 'Achievements' },
  { icon: <FaChess />,       label: 'Chess' },
  { icon: <FaDice />,        label: 'Ludo' },
  { icon: <GiPingPongBat />, label: '8-Ball Pool' },
  { icon: <GiCardJoker />,   label: 'Cards' },
  { icon: <FaGamepad />,     label: 'Turbo Racing' },
  { icon: <FaCrown />,       label: 'Leagues' },
]

export default function GamingSection() {
  return (
    <FeatureShowcase
      title="Games Hub"
      description="Chess, Ludo, Pool, Morabaraba, Turbo Racing, Word Battle, Five Cards, Cassino. Most with AI opponents and wager support. Compete in leagues, earn achievements, climb rankings."
      features={FEATURES}
      gradient="from-amber-500 to-orange-600"
      image={<div className="text-8xl">🎮</div>}
      badge="🎮 10+ games live now"
      reversed
    />
  )
}
