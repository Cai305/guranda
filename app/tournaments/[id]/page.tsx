'use client'

import { use } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { FaTrophy, FaArrowLeft, FaUsers, FaCalendarAlt, FaShieldAlt, FaStar, FaChess, FaDice } from 'react-icons/fa'
import { GiCardJoker } from 'react-icons/gi'

const TOURNAMENTS: Record<string, any> = {
  'chess-championship': {
    name: 'Guranda Chess Championship', game: 'Chess', icon: '♟️',
    color: 'from-violet-500 to-purple-600', prizePool: '200K MSH', players: '128',
    status: 'ongoing', startDate: 'Aug 1, 2026', endDate: 'Sep 30, 2026',
    location: 'Online', format: 'Swiss + Top-16 Elimination',
    description: 'The definitive Chess tournament on Guranda. 128 of the best players compete in a Swiss-style group stage followed by a knockout top-16.',
    prizeBreakdown: [
      { place: '1st Place', prize: '80K MSH', players: '1' },
      { place: '2nd Place', prize: '40K MSH', players: '1' },
      { place: '3rd-4th', prize: '20K MSH', players: '2' },
      { place: '5th-8th', prize: '8K MSH', players: '4' },
      { place: '9th-16th', prize: '3K MSH', players: '8' },
      { place: 'Participation', prize: '500 MSH', players: 'All' },
    ],
    leaderboard: [
      { rank: 1, name: 'GrandMasterSA', team: 'Chess Elite',   points: 2450, wins: 38, region: 'Gauteng',    matches: 42 },
      { rank: 2, name: 'KingSlayer_ZA', team: 'Board Kings',   points: 2380, wins: 35, region: 'Cape Town',  matches: 40 },
      { rank: 3, name: 'QueenGambit',   team: 'Checkmate Inc', points: 2290, wins: 33, region: 'Durban',     matches: 38 },
      { rank: 4, name: 'NightRider99',  team: 'Chess Elite',   points: 2150, wins: 30, region: 'Pretoria',   matches: 36 },
      { rank: 5, name: 'RookRevenge',   team: 'Board Kings',   points: 2080, wins: 28, region: 'Gauteng',    matches: 34 },
      { rank: 6, name: 'SilverBishop',  team: 'Chess Elite',   points: 1990, wins: 25, region: 'PE',         matches: 32 },
      { rank: 7, name: 'PawnStar',      team: 'Board Kings',   points: 1890, wins: 22, region: 'Bloemfontein', matches: 30 },
      { rank: 8, name: 'EndgameEric',   team: 'Checkmate Inc', points: 1790, wins: 19, region: 'Cape Town',  matches: 28 },
    ],
    highlights: ['Live match commentary', 'AI analysis of top games', 'Post-game reviews by coaches', 'Prize-pool in Masheleni (MSH)', 'Guranda Chess ELO integration'],
    rules: ['Must have played 20+ Chess games to enter', 'Time control: 10+5 blitz', 'Disconnects handled by arbiter', 'No engine assistance', '2 games per round, tiebreak by Sonneborn-Berger'],
  },
  'ludo-masters': {
    name: 'Ludo Masters Series', game: 'Ludo', icon: '🎲',
    color: 'from-amber-500 to-orange-600', prizePool: '150K MSH', players: '256',
    status: 'ongoing', startDate: 'Aug 5, 2026', endDate: 'Sep 5, 2026',
    location: 'Online', format: 'Round Robin + Finals',
    description: 'The biggest Ludo tournament on the continent. 256 players battle across multiple modes — classic, speed, and team — with MSH on the line.',
    prizeBreakdown: [
      { place: '1st Place', prize: '60K MSH', players: '1' },
      { place: '2nd Place', prize: '30K MSH', players: '1' },
      { place: '3rd-4th', prize: '15K MSH', players: '2' },
      { place: '5th-8th', prize: '5K MSH', players: '4' },
      { place: '9th-16th', prize: '1.5K MSH', players: '8' },
      { place: 'Participation', prize: '200 MSH', players: 'All' },
    ],
    leaderboard: [
      { rank: 1, name: 'LudoLegend',    team: 'Dice Kings',    points: 1890, wins: 45, region: 'Soweto',    matches: 52 },
      { rank: 2, name: 'BoardBoss_ZA',  team: 'Roll Masters',  points: 1750, wins: 41, region: 'Durban',    matches: 50 },
      { rank: 3, name: 'SixAndWin',     team: 'Dice Kings',    points: 1620, wins: 38, region: 'Gauteng',   matches: 48 },
      { rank: 4, name: 'HomeRunner',    team: 'Safe House',    points: 1480, wins: 34, region: 'Cape Town', matches: 46 },
      { rank: 5, name: 'BlockKing',     team: 'Roll Masters',  points: 1350, wins: 30, region: 'Pretoria',  matches: 44 },
      { rank: 6, name: 'DiceDevil',     team: 'Chaos Rollers', points: 1250, wins: 27, region: 'Durban',    matches: 42 },
      { rank: 7, name: 'HomeStretch',   team: 'Safe House',    points: 1150, wins: 24, region: 'PE',        matches: 40 },
      { rank: 8, name: 'SafeSquare',    team: 'Dice Kings',    points: 1050, wins: 21, region: 'Gauteng',   matches: 38 },
    ],
    highlights: ['Speed mode & classic mode rounds', 'Team Ludo bracket', 'Live draws every Sunday', 'MSH wager side matches', 'Leaderboard resets each week'],
    rules: ['Open to all Guranda users', 'Classic Ludo rules apply', '4-player lobbies, 2 advance', 'No quitting after game starts', 'Wager matches played separately'],
  },
  'card-royale': {
    name: 'Card Royale Tournament', game: 'Five Cards & Cassino', icon: '🃏',
    color: 'from-pink-500 to-rose-600', prizePool: '300K MSH', players: '64',
    status: 'upcoming', startDate: 'Sep 1, 2026', endDate: 'Sep 30, 2026',
    location: 'Online', format: 'Double Elimination',
    description: 'The highest-stakes card tournament on Guranda. 64 elite card players compete in Five Cards and Cassino with real MSH wagers on every match.',
    prizeBreakdown: [
      { place: '1st Place', prize: '120K MSH', players: '1' },
      { place: '2nd Place', prize: '60K MSH', players: '1' },
      { place: '3rd-4th', prize: '30K MSH', players: '2' },
      { place: '5th-8th', prize: '12K MSH', players: '4' },
      { place: '9th-16th', prize: '4K MSH', players: '8' },
      { place: 'Participation', prize: '1K MSH', players: 'All' },
    ],
    leaderboard: [
      { rank: 1, name: 'AceOfSpades_SA', team: 'Card Sharks',  points: 3200, wins: 52, region: 'Gauteng',    matches: 58 },
      { rank: 2, name: 'RoyalFlush',     team: 'High Rollers', points: 3050, wins: 49, region: 'Cape Town',  matches: 56 },
      { rank: 3, name: 'WildCard_ZA',    team: 'Card Sharks',  points: 2900, wins: 46, region: 'Durban',     matches: 54 },
      { rank: 4, name: 'JokerFace',      team: 'High Rollers', points: 2750, wins: 43, region: 'Pretoria',   matches: 52 },
      { rank: 5, name: 'SuitUp',         team: 'Wild Deck',    points: 2600, wins: 40, region: 'Soweto',     matches: 50 },
      { rank: 6, name: 'FiveCardFlush',  team: 'Card Sharks',  points: 2450, wins: 37, region: 'PE',         matches: 48 },
      { rank: 7, name: 'CassinoKing',    team: 'Wild Deck',    points: 2300, wins: 34, region: 'Durban',     matches: 46 },
      { rank: 8, name: 'FullHouse_ZA',   team: 'High Rollers', points: 2150, wins: 31, region: 'Cape Town',  matches: 44 },
    ],
    highlights: ['Live wager matches', 'Five Cards and Cassino modes', 'Side bet leaderboard', 'MSH buy-in required to enter', 'Weekly warm-up events'],
    rules: ['Minimum 500 MSH wallet balance to enter', 'Standard Five Cards and Cassino rules', 'No coaching during live matches', 'Wager amounts fixed per round', 'Players must be ID-verified'],
  },
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = TOURNAMENTS[id] || TOURNAMENTS['chess-championship']

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24 pb-16">
        <section className="section-container max-w-6xl mx-auto">

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
            <Link href="/leagues?tab=tournaments" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition text-sm font-medium">
              <FaArrowLeft /> Back to Tournaments
            </Link>
          </motion.div>

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="relative overflow-hidden glass-frosted rounded-3xl border-white/10 mb-10">
            <div className={`absolute inset-0 bg-gradient-to-br ${t.color} opacity-15`} />
            <div className="relative z-10 p-8 sm:p-12">
              <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-5xl">{t.icon}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                      t.status === 'ongoing' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                    }`}>
                      {t.status === 'ongoing' ? '● Live Now' : '⏳ Upcoming'}
                    </span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">{t.name}</h1>
                  <p className="text-gray-400 text-lg max-w-xl leading-relaxed">{t.description}</p>
                </div>
                <div className="glass-frosted rounded-2xl p-6 border-white/10 text-center min-w-36">
                  <div className={`text-2xl font-black bg-gradient-to-r ${t.color} bg-clip-text text-transparent mb-1`}>{t.prizePool}</div>
                  <div className="text-gray-500 text-xs">Total Prize Pool</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: FaUsers,       label: 'Players',  val: t.players },
                  { icon: FaCalendarAlt, label: 'Start',    val: t.startDate },
                  { icon: FaCalendarAlt, label: 'End',      val: t.endDate },
                  { icon: FaShieldAlt,   label: 'Format',   val: t.format },
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

          {/* Prize breakdown + Highlights */}
          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass-frosted rounded-2xl border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-black text-white flex items-center gap-2"><FaTrophy className="text-amber-400" /> Prize Breakdown</h2>
              </div>
              <div className="divide-y divide-white/5">
                {t.prizeBreakdown.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3">
                    <span className="text-gray-400 text-sm">{p.place}</span>
                    <div className="text-right">
                      <span className={`font-black text-sm bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}>{p.prize}</span>
                      <span className="text-gray-600 text-xs ml-2">({p.players})</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-frosted rounded-2xl p-7 border-white/10">
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2"><FaStar className="text-amber-400" /> Highlights</h2>
              <ul className="space-y-3">
                {t.highlights.map((h: string, i: number) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }}
                    className="flex items-start gap-3 text-gray-300 text-sm">
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${t.color} mt-1.5 shrink-0`} /> {h}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-frosted rounded-2xl border-white/10 overflow-hidden mb-10">
            <div className="px-7 py-5 border-b border-white/10 flex items-center gap-3">
              <FaTrophy className="text-yellow-400" />
              <h2 className="text-xl font-black text-white">Leaderboard</h2>
              <span className="ml-auto text-xs text-gray-500">{t.players} players</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                    <th className="px-7 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-left">Region</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right">W</th>
                    <th className="px-7 py-3 text-right">Matches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {t.leaderboard.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/3 transition-colors">
                      <td className={`px-7 py-4 font-black text-xl ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-600 text-sm'}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${p.rank}`}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black`}>{p.name[0]}</div>
                          <div>
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.team}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-xs">{p.region}</td>
                      <td className="px-4 py-4 text-right font-bold text-white">{p.points.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right text-green-400 font-bold">{p.wins}</td>
                      <td className="px-7 py-4 text-right text-gray-400">{p.matches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <div className="text-center">
            <Link href="/leagues" className="text-sm text-gray-600 hover:text-violet-400 transition">← Back to Leagues</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
