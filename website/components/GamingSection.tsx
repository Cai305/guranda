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
      image={
        <div className="relative flex items-center justify-center">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[2.5rem] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_90px_rgba(249,115,22,0.35)]">
            <FaGamepad className="text-white text-6xl sm:text-7xl" />
          </div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-2xl shadow-lg ring-4 ring-black/20">
            <GiCardJoker />
          </div>
        </div>
      }
      badge="🎮 10+ games live now"
      reversed
    />
  )
}
