'use client'

import { use } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import {
  FaMedal, FaArrowLeft, FaClock, FaUsers, FaFire,
  FaCalendarAlt, FaStar, FaTrophy, FaCamera, FaArrowRight,
} from 'react-icons/fa'

const CHALLENGES: Record<string, any> = {
  'speed-challenge': {
    name: 'Weekly Speed Challenge', type: 'Time Trial', icon: '⚡',
    color: 'from-cyan-500 to-blue-600', difficulty: 'Medium',
    prize: '50,000 MSH', participants: '3,240', status: 'active',
    startDate: 'Aug 8, 2026', endDate: 'Aug 14, 2026',
    xpReward: 150, bonusXp: 300,
    desc: 'Test your reflexes and speed. Complete the course in the fastest time possible. Weekly leaderboard resets every Sunday.',
    rules: ['Complete the speed course in fastest time', 'Each player gets 3 attempt runs', 'Best time counts towards ranking', 'Matches must be 30 seconds or longer', 'Cheating results in permanent ban'],
    rewards: ['Winner badge + exclusive avatar frame', 'MSH prize pool distributed to top 100', 'XP bonus for all participants', 'Season points towards league ranking'],
    leaderboard: [
      { rank: 1, name: 'LightningFast', score: '98.5s',  xp: 2500 },
      { rank: 2, name: 'SpeedDemon',    score: '99.2s',  xp: 2400 },
      { rank: 3, name: 'SwiftArrow',    score: '100.1s', xp: 2300 },
      { rank: 4, name: 'QuickBolt',     score: '101.3s', xp: 2200 },
      { rank: 5, name: 'FlashStrike',   score: '102.7s', xp: 2100 },
    ],
  },
  'survival-challenge': {
    name: 'Survival Challenge', type: 'Endurance', icon: '🛡️',
    color: 'from-orange-500 to-red-600', difficulty: 'Hard',
    prize: '80,000 MSH', participants: '2,150', status: 'active',
    startDate: 'Aug 10, 2026', endDate: 'Aug 17, 2026',
    xpReward: 200, bonusXp: 500,
    desc: 'How long can you last? Survive increasingly difficult waves and outlast your competition.',
    rules: ['Survive as many waves as possible', 'No team assistance during runs', 'All runs must be completed in one session', 'Top 10% earn prize pool share', 'Must be verified account to enter'],
    rewards: ['Survival champion badge', 'MSH prize pool for top finishers', 'Exclusive "Survivor" profile tag', 'Double XP weekend pass'],
    leaderboard: [
      { rank: 1, name: 'SurvivalKing', score: '1,240 min', xp: 3500 },
      { rank: 2, name: 'EndureMax',    score: '1,195 min', xp: 3350 },
      { rank: 3, name: 'IronWill',     score: '1,150 min', xp: 3200 },
      { rank: 4, name: 'Stalwart',     score: '1,095 min', xp: 3050 },
      { rank: 5, name: 'Relentless',   score: '1,050 min', xp: 2900 },
    ],
  },
  'skill-showdown': {
    name: 'Skill Showdown', type: 'Multiplayer Duel', icon: '⚔️',
    color: 'from-violet-500 to-pink-600', difficulty: 'Expert',
    prize: '120,000 MSH', participants: '4,890', status: 'active',
    startDate: 'Aug 1, 2026', endDate: 'Aug 31, 2026',
    xpReward: 300, bonusXp: 750,
    desc: 'The ultimate 1v1 showdown. Prove your skill against the best players on the platform.',
    rules: ['1v1 format, best of 3 matches', 'Rank above 500 points to enter', 'No disconnect or forfeit abuse', 'Fair play monitored throughout', 'Final round livestreamed'],
    rewards: ['Champion title + exclusive cosmetics', 'MSH prize pool top 50', 'Invitation to Elite League', 'Pro player spotlight feature'],
    leaderboard: [
      { rank: 1, name: 'MasterSlayer',    score: '156 wins', xp: 4200 },
      { rank: 2, name: 'EliteHunter',     score: '148 wins', xp: 4050 },
      { rank: 3, name: 'PrecisionStrike', score: '141 wins', xp: 3900 },
      { rank: 4, name: 'DeadShot',        score: '134 wins', xp: 3750 },
      { rank: 5, name: 'VenomFang',       score: '127 wins', xp: 3600 },
    ],
  },
}

const DIFF_COLOR: Record<string, string> = {
  Easy: 'bg-green-500/15 text-green-400 border-green-500/25',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Hard: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Expert: 'bg-red-500/15 text-red-400 border-red-500/25',
}

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const ch = CHALLENGES[id] || CHALLENGES['skill-showdown']

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24 pb-16">
        <section className="section-container max-w-6xl mx-auto">

          {/* Back */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
            <Link href="/leagues" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition text-sm font-medium">
              <FaArrowLeft /> Back to Leagues
            </Link>
          </motion.div>

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className={`relative overflow-hidden glass-frosted rounded-3xl border-white/10 mb-10`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${ch.color} opacity-15`} />
            <div className="relative z-10 p-8 sm:p-12">
              <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-5xl">{ch.icon}</span>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${DIFF_COLOR[ch.difficulty]}`}>{ch.difficulty}</div>
                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25">
                      <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="inline-block mr-1.5 w-1.5 h-1.5 rounded-full bg-green-400 align-middle" />
                      Active
                    </div>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">{ch.name}</h1>
                  <p className="text-gray-400 text-lg max-w-xl leading-relaxed">{ch.desc}</p>
                </div>
                <div className="glass-frosted rounded-2xl p-6 border-white/10 text-center min-w-36">
                  <div className={`text-3xl font-black bg-gradient-to-r ${ch.color} bg-clip-text text-transparent mb-1`}>{ch.prize}</div>
                  <div className="text-gray-500 text-xs">Prize Pool</div>
                </div>
              </div>
              {/* Stats strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: FaUsers,       label: 'Participants', val: ch.participants },
                  { icon: FaStar,        label: 'XP Reward',   val: `+${ch.xpReward} XP` },
                  { icon: FaCalendarAlt, label: 'Ends',         val: ch.endDate },
                  { icon: FaTrophy,      label: 'Bonus XP',    val: `+${ch.bonusXp} (winner)` },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Icon /> {s.label}</div>
                      <div className="text-white font-bold text-sm">{s.val}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            {/* Rules */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass-frosted rounded-2xl p-7 border-white/10">
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2"><FaFire className="text-orange-400" /> Challenge Rules</h2>
              <ul className="space-y-3">
                {ch.rules.map((r: string, i: number) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                    className="flex items-start gap-3 text-gray-300 text-sm">
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${ch.color} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>{i + 1}</span>
                    {r}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Rewards */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-frosted rounded-2xl p-7 border-white/10">
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2"><FaStar className="text-amber-400" /> Rewards</h2>
              <ul className="space-y-3">
                {ch.rewards.map((r: string, i: number) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }}
                    className="flex items-start gap-3 text-gray-300 text-sm">
                    <span className="text-amber-400 font-bold">★</span> {r}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-frosted rounded-2xl border-white/10 overflow-hidden mb-10">
            <div className="px-7 py-5 border-b border-white/10 flex items-center gap-3">
              <FaTrophy className="text-amber-400" />
              <h2 className="text-xl font-black text-white">Current Leaderboard</h2>
              <span className="ml-auto text-xs text-gray-500">{ch.participants} participants</span>
            </div>
            <div className="divide-y divide-white/5">
              {ch.leaderboard.map((p: any, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center gap-5 px-7 py-4 hover:bg-white/3 transition-colors group">
                  <div className={`w-10 text-center font-black text-xl ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600 text-base'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${p.rank}`}
                  </div>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ch.color} flex items-center justify-center text-white text-sm font-black shrink-0`}>
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm">{p.name}</div>
                    <div className="text-gray-500 text-xs">{p.score}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm bg-gradient-to-r ${ch.color} bg-clip-text text-transparent`}>{p.xp.toLocaleString()} XP</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Submit CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className={`relative overflow-hidden glass-frosted rounded-2xl p-8 border-white/10 text-center`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${ch.color} opacity-5`} />
            <div className="relative z-10">
              <div className="text-4xl mb-4">{ch.icon}</div>
              <h2 className="text-2xl font-black text-white mb-2">Ready to Compete?</h2>
              <p className="text-gray-400 mb-7">Submit your entry through the Guranda app and claim your spot on the leaderboard.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/download" className={`button-primary inline-flex items-center gap-2.5 px-8 py-4 shadow-[0_0_30px_rgba(124,58,237,0.3)]`}>
                    <FaCamera /> Submit via App <FaArrowRight className="text-sm" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/leagues" className="button-secondary inline-flex items-center gap-2.5 px-8 py-4">
                    <FaMedal /> View All Challenges
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>

        </section>
      </main>
      <Footer />
    </>
  )
}
