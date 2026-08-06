'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import {
  FaTrophy, FaMedal, FaStar, FaArrowRight, FaChess,
  FaDice, FaGamepad, FaFire, FaCrown, FaUsers,
} from 'react-icons/fa'
import { GiCardJoker, GiPingPongBat } from 'react-icons/gi'

const LEAGUES = [
  {
    id: 'elite',
    name: 'Elite League',
    tier: 'Tier 1',
    icon: '👑',
    color: 'from-yellow-500 to-amber-600',
    members: '1,240',
    prizePool: '500K MSH',
    description: 'The highest competitive tier. Invitation-only for the best players on the platform.',
    games: ['Chess', 'Five Cards', 'Turbo Racing'],
  },
  {
    id: 'pro',
    name: 'Pro League',
    tier: 'Tier 2',
    icon: '🏆',
    color: 'from-red-500 to-orange-600',
    members: '5,240',
    prizePool: '250K MSH',
    description: 'Serious competition with real prize pools. Earn your way up from Veteran.',
    games: ['Chess', 'Ludo', 'Five Cards', 'Cassino'],
  },
  {
    id: 'veteran',
    name: 'Veteran League',
    tier: 'Tier 3',
    icon: '🥈',
    color: 'from-blue-500 to-cyan-600',
    members: '12,450',
    prizePool: '100K MSH',
    description: 'For experienced players ready to step up their game.',
    games: ['Chess', 'Ludo', 'Pool', 'Word Battle'],
  },
  {
    id: 'amateur',
    name: 'Amateur League',
    tier: 'Tier 4',
    icon: '🥉',
    color: 'from-green-500 to-emerald-600',
    members: '45,320',
    prizePool: '40K MSH',
    description: 'Entry-level competitive play. All games accepted, all skill levels welcome.',
    games: ['All Games', 'Ludo', 'Pool', 'Morabaraba'],
  },
  {
    id: 'casual',
    name: 'Casual League',
    tier: 'Tier 5',
    icon: '⭐',
    color: 'from-purple-500 to-pink-600',
    members: '120,500',
    prizePool: '10K MSH',
    description: 'Play for fun, earn small rewards, and meet other players.',
    games: ['All Games', 'Turbo Racing', 'Word Battle'],
  },
]

const TOURNAMENTS = [
  {
    id: 'chess-championship',
    name: 'Guranda Chess Championship',
    game: 'Chess',
    gameIcon: <FaChess />,
    prizePool: '200K MSH',
    players: '128',
    status: 'ongoing',
    color: 'from-violet-500 to-purple-600',
    top: [
      { rank: 1, name: 'GrandMasterSA',  team: 'Chess Elite',   points: 2450, wins: 38 },
      { rank: 2, name: 'KingSlayer_ZA',  team: 'Board Kings',   points: 2380, wins: 35 },
      { rank: 3, name: 'QueenGambit',    team: 'Checkmate Inc', points: 2290, wins: 33 },
      { rank: 4, name: 'NightRider99',   team: 'Chess Elite',   points: 2150, wins: 30 },
      { rank: 5, name: 'RookRevenge',    team: 'Board Kings',   points: 2080, wins: 28 },
    ],
  },
  {
    id: 'ludo-masters',
    name: 'Ludo Masters Series',
    game: 'Ludo',
    gameIcon: <FaDice />,
    prizePool: '150K MSH',
    players: '256',
    status: 'ongoing',
    color: 'from-amber-500 to-orange-600',
    top: [
      { rank: 1, name: 'LudoLegend',     team: 'Dice Kings',    points: 1890, wins: 45 },
      { rank: 2, name: 'BoardBoss_ZA',   team: 'Roll Masters',  points: 1750, wins: 41 },
      { rank: 3, name: 'SixAndWin',      team: 'Dice Kings',    points: 1620, wins: 38 },
      { rank: 4, name: 'HomeRunner',     team: 'Safe House',    points: 1480, wins: 34 },
      { rank: 5, name: 'BlockKing',      team: 'Roll Masters',  points: 1350, wins: 30 },
    ],
  },
  {
    id: 'card-royale',
    name: 'Card Royale Tournament',
    game: 'Five Cards & Cassino',
    gameIcon: <GiCardJoker />,
    prizePool: '300K MSH',
    players: '64',
    status: 'upcoming',
    color: 'from-pink-500 to-rose-600',
    top: [
      { rank: 1, name: 'AceOfSpades_SA', team: 'Card Sharks',   points: 3200, wins: 52 },
      { rank: 2, name: 'RoyalFlush',     team: 'High Rollers',  points: 3050, wins: 49 },
      { rank: 3, name: 'WildCard_ZA',    team: 'Card Sharks',   points: 2900, wins: 46 },
      { rank: 4, name: 'JokerFace',      team: 'High Rollers',  points: 2750, wins: 43 },
      { rank: 5, name: 'SuitUp',         team: 'Wild Deck',     points: 2600, wins: 40 },
    ],
  },
]

const CHALLENGES = [
  { id: 'speed-challenge', name: 'Weekly Speed Challenge', type: 'Time Trial', icon: '⚡', color: 'from-cyan-500 to-blue-600', prize: '50K MSH', participants: '3,240', diff: 'Medium', game: 'Turbo Racing' },
  { id: 'survival-challenge', name: 'Ludo Survival Marathon', type: 'Endurance', icon: '🛡️', color: 'from-orange-500 to-red-600', prize: '80K MSH', participants: '2,150', diff: 'Hard', game: 'Ludo' },
  { id: 'skill-showdown', name: 'Chess Skill Showdown', type: '1v1 Duel', icon: '⚔️', color: 'from-violet-500 to-pink-600', prize: '120K MSH', participants: '4,890', diff: 'Expert', game: 'Chess' },
  { id: 'pool-blitz', name: 'Pool Blitz Cup', type: 'Speed Round', icon: '🎱', color: 'from-green-500 to-teal-600', prize: '60K MSH', participants: '1,820', diff: 'Medium', game: '8-Ball Pool' },
  { id: 'word-battle', name: 'Word Battle Open', type: 'Wordle Duel', icon: '📝', color: 'from-indigo-500 to-purple-600', prize: '40K MSH', participants: '5,600', diff: 'Easy', game: 'Word Battle' },
  { id: 'card-blitz', name: 'Card Blitz Championship', type: 'Wager Match', icon: '🃏', color: 'from-pink-500 to-rose-600', prize: '200K MSH', participants: '1,200', diff: 'Hard', game: 'Five Cards' },
]

const DIFF_COLOR: Record<string, string> = {
  Easy: 'bg-green-500/15 text-green-400 border-green-500/25',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Hard: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Expert: 'bg-red-500/15 text-red-400 border-red-500/25',
}

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 } }),
}

export default function LeaguesPage() {
  const [activeTab, setActiveTab] = useState<'leagues' | 'tournaments' | 'challenges'>('leagues')

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24">
        <section className="section-container max-w-7xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-14">
            <motion.div className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/30" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <FaTrophy className="text-amber-400 text-sm" />
              <span className="text-sm font-semibold text-amber-300">Competitive Gaming</span>
            </motion.div>
            <h1 className="text-6xl sm:text-7xl font-black gradient-text mb-4">Leagues &amp; Tournaments</h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">Compete in Chess, Ludo, Pool, Cards and more. Climb tiers, win MSH, and become a legend.</p>
          </motion.div>

          {/* Tabs */}
          <div className="flex justify-center gap-3 mb-12 flex-wrap">
            {([
              { id: 'leagues',     label: 'Leagues',     icon: <FaCrown /> },
              { id: 'tournaments', label: 'Tournaments', icon: <FaTrophy /> },
              { id: 'challenges',  label: 'Challenges',  icon: <FaFire /> },
            ] as const).map(t => (
              <motion.button key={t.id} onClick={() => setActiveTab(t.id)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-500/20'
                    : 'glass-frosted text-gray-400 hover:text-white border-white/10'
                }`}>
                {t.icon} {t.label}
              </motion.button>
            ))}
          </div>

          {/* LEAGUES */}
          <AnimatePresence mode="wait">
            {activeTab === 'leagues' && (
              <motion.div key="leagues" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
                <div className="grid lg:grid-cols-2 gap-5 mb-8">
                  {LEAGUES.map((league, i) => (
                    <motion.div key={league.id} custom={i} variants={item} initial="hidden" animate="visible" whileHover={{ y: -7 }} className="group relative">
                      <div className={`absolute -inset-px rounded-3xl bg-gradient-to-br ${league.color} opacity-0 group-hover:opacity-20 blur-sm transition-opacity`} />
                      <div className="relative glass-frosted rounded-3xl overflow-hidden border-white/10 group-hover:border-white/25 transition-all h-full">
                        <div className={`h-20 bg-gradient-to-r ${league.color} relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/20" />
                          <motion.div className="absolute bottom-3 right-4 text-4xl" animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
                            {league.icon}
                          </motion.div>
                          <div className="absolute top-3 left-4 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur text-xs font-bold text-white">{league.tier}</div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-black text-white mb-1">{league.name}</h3>
                          <p className="text-gray-400 text-sm mb-4 leading-relaxed">{league.description}</p>
                          <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/5">
                            <div>
                              <p className="text-gray-600 text-xs mb-0.5">Members</p>
                              <p className="text-white font-bold text-sm">{league.members}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 text-xs mb-0.5">Prize Pool</p>
                              <p className={`font-bold text-sm bg-gradient-to-r ${league.color} bg-clip-text text-transparent`}>{league.prizePool}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {league.games.map(g => (
                              <span key={g} className="px-2.5 py-1 rounded-full text-xs bg-white/5 text-gray-400 border border-white/10">{g}</span>
                            ))}
                          </div>
                          <Link href={`/leagues/${league.id}`}>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                              className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${league.color} flex items-center justify-center gap-2 text-sm shadow-lg`}>
                              View League <FaArrowRight className="text-xs" />
                            </motion.button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TOURNAMENTS */}
            {activeTab === 'tournaments' && (
              <motion.div key="tournaments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
                <div className="space-y-5">
                  {TOURNAMENTS.map((t, i) => (
                    <motion.div key={t.id} custom={i} variants={item} initial="hidden" animate="visible" whileHover={{ y: -4 }} className="group relative">
                      <div className={`absolute -inset-px rounded-3xl bg-gradient-to-br ${t.color} opacity-0 group-hover:opacity-15 blur-sm transition-opacity`} />
                      <div className="relative glass-frosted rounded-3xl border-white/10 group-hover:border-white/25 transition-all overflow-hidden">
                        {/* Header strip */}
                        <div className={`h-2 w-full bg-gradient-to-r ${t.color}`} />
                        <div className="p-7">
                          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-lg`}>
                                  {t.gameIcon}
                                </div>
                                <div>
                                  <h3 className="text-xl font-black text-white">{t.name}</h3>
                                  <p className="text-gray-500 text-xs">{t.game}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                                t.status === 'ongoing' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                              }`}>
                                {t.status === 'ongoing' ? '● Live' : '⏳ Upcoming'}
                              </span>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Prize Pool</p>
                                <p className={`font-black bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}>{t.prizePool}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Players</p>
                                <p className="font-bold text-white text-sm">{t.players}</p>
                              </div>
                            </div>
                          </div>
                          {/* Mini leaderboard */}
                          <div className="rounded-2xl bg-white/3 border border-white/5 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-white/5">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Top 5</span>
                            </div>
                            {t.top.map((p, idx) => (
                              <div key={idx} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                                <span className={`w-7 text-center font-black text-base ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-600 text-sm'}`}>
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${p.rank}`}
                                </span>
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black`}>{p.name[0]}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white">{p.name}</p>
                                  <p className="text-xs text-gray-500">{p.team}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-white">{p.points.toLocaleString()}</p>
                                  <p className="text-xs text-gray-500">{p.wins}W</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Link href={`/tournaments/${t.id}`}>
                              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${t.color}`}>
                                Full Details <FaArrowRight className="text-xs" />
                              </motion.button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CHALLENGES */}
            {activeTab === 'challenges' && (
              <motion.div key="challenges" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {CHALLENGES.map((ch, i) => (
                    <motion.div key={ch.id} custom={i} variants={item} initial="hidden" animate="visible" whileHover={{ y: -7, scale: 1.02 }} className="group relative">
                      <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${ch.color} opacity-0 group-hover:opacity-20 blur-sm transition-opacity`} />
                      <div className="relative glass-frosted rounded-2xl border-white/10 group-hover:border-white/25 transition-all p-6 h-full flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ch.color} flex items-center justify-center text-2xl shadow-lg`}>{ch.icon}</div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${DIFF_COLOR[ch.diff]}`}>{ch.diff}</span>
                        </div>
                        <h3 className="font-black text-white mb-1">{ch.name}</h3>
                        <p className="text-gray-500 text-xs mb-1">{ch.game} · {ch.type}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                          <div>
                            <p className="text-xs text-gray-600">Prize</p>
                            <p className={`font-black text-sm bg-gradient-to-r ${ch.color} bg-clip-text text-transparent`}>{ch.prize}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Participants</p>
                            <p className="text-sm font-bold text-white">{ch.participants}</p>
                          </div>
                        </div>
                        <Link href={`/challenges/${ch.id}`}>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className={`mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${ch.color} flex items-center justify-center gap-2`}>
                            Enter Challenge <FaArrowRight className="text-xs" />
                          </motion.button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
      <Footer />
    </>
  )
}
