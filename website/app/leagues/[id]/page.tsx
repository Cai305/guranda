'use client'

import { use } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { FaTrophy, FaUsers, FaArrowLeft, FaMedal, FaGamepad, FaShieldAlt, FaStar, FaFire } from 'react-icons/fa'

const LEAGUES: Record<string, any> = {
  elite: {
    name: 'Elite League', tier: 'Tier 1', icon: '👑',
    color: 'from-yellow-500 to-amber-600', members: '1,240', totalMembers: 1240,
    prizePool: '500K MSH', monthlyRewards: '125K MSH',
    description: 'The pinnacle of competitive gaming on Guranda. Invitation-only. Play Chess, Five Cards and Turbo Racing against the very best.',
    games: ['Chess', 'Five Cards', 'Cassino', 'Turbo Racing'],
    requirements: 'Top 1% rating or direct invitation',
    season: 'Season 3', startDate: 'Aug 1, 2026', endDate: 'Oct 31, 2026',
    leaderboard: [
      { rank: 1, name: 'GrandMasterSA', points: 3450, wins: 87, team: 'Chess Elite',   nation: '🇿🇦' },
      { rank: 2, name: 'KingSlayer_ZA', points: 3380, wins: 82, team: 'Board Kings',   nation: '🇿🇦' },
      { rank: 3, name: 'QueenGambit',   points: 3290, wins: 79, team: 'Checkmate Inc', nation: '🇿🇦' },
      { rank: 4, name: 'NightRider99',  points: 3150, wins: 76, team: 'Chess Elite',   nation: '🇿🇦' },
      { rank: 5, name: 'RookRevenge',   points: 3080, wins: 72, team: 'Board Kings',   nation: '🇿🇦' },
      { rank: 6, name: 'AceOfSpades',   points: 2980, wins: 68, team: 'Card Sharks',   nation: '🇿🇦' },
      { rank: 7, name: 'TurboKing',     points: 2890, wins: 65, team: 'Fast Lane',     nation: '🇿🇦' },
      { rank: 8, name: 'JokerFace',     points: 2790, wins: 62, team: 'High Rollers',  nation: '🇿🇦' },
      { rank: 9, name: 'SilverBishop',  points: 2680, wins: 59, team: 'Chess Elite',   nation: '🇿🇦' },
      { rank: 10, name: 'WildCard_ZA',  points: 2580, wins: 56, team: 'Card Sharks',   nation: '🇿🇦' },
    ],
    rules: ['Minimum 5 ranked matches per week', 'Anti-cheat enforced on all games', 'Top 100 qualify for Championship', 'Seasonal reset every 3 months', 'Wager matches count double points'],
    benefits: ['Exclusive Elite badge + avatar frame', 'Monthly MSH prize distribution', 'Priority matchmaking', 'Invite to closed Guranda events', 'Pro coaching opportunities'],
  },
  pro: {
    name: 'Pro League', tier: 'Tier 2', icon: '🏆',
    color: 'from-red-500 to-orange-600', members: '5,240', totalMembers: 5240,
    prizePool: '250K MSH', monthlyRewards: '60K MSH',
    description: 'Serious competition with real prize pools. Master Chess, Ludo, Five Cards and Cassino to earn your way to Elite.',
    games: ['Chess', 'Ludo', 'Five Cards', 'Cassino'],
    requirements: 'Rating 1500+ or promotion from Veteran',
    season: 'Season 3', startDate: 'Aug 1, 2026', endDate: 'Oct 31, 2026',
    leaderboard: [
      { rank: 1, name: 'LudoLegend',    points: 2450, wins: 58, team: 'Dice Kings',   nation: '🇿🇦' },
      { rank: 2, name: 'BoardBoss_ZA',  points: 2380, wins: 55, team: 'Roll Masters', nation: '🇿🇦' },
      { rank: 3, name: 'SixAndWin',     points: 2290, wins: 52, team: 'Dice Kings',   nation: '🇿🇦' },
      { rank: 4, name: 'CheckMate_Pro', points: 2150, wins: 48, team: 'Board Kings',  nation: '🇿🇦' },
      { rank: 5, name: 'CassinoKing',   points: 2080, wins: 45, team: 'Card Sharks',  nation: '🇿🇦' },
      { rank: 6, name: 'FiveCardFlush', points: 1980, wins: 42, team: 'High Rollers', nation: '🇿🇦' },
      { rank: 7, name: 'HomeRunner',    points: 1890, wins: 39, team: 'Safe House',   nation: '🇿🇦' },
      { rank: 8, name: 'BlockKing',     points: 1790, wins: 36, team: 'Roll Masters', nation: '🇿🇦' },
      { rank: 9, name: 'PawnStar',      points: 1680, wins: 33, team: 'Chess Elite',  nation: '🇿🇦' },
      { rank: 10, name: 'WildDice',     points: 1580, wins: 30, team: 'Dice Kings',   nation: '🇿🇦' },
    ],
    rules: ['Minimum 3 matches per week', 'Ranked matches only', 'Monthly ratings reset', 'Top 500 qualify for Pro Championship', 'Sportsmanship policy enforced'],
    benefits: ['Pro badge + cosmetics', 'Regular tournaments & events', 'Community recognition', 'Monthly prize distribution', 'Streamer partnership opportunities'],
  },
  veteran: {
    name: 'Veteran League', tier: 'Tier 3', icon: '🥈',
    color: 'from-blue-500 to-cyan-600', members: '12,450', totalMembers: 12450,
    prizePool: '100K MSH', monthlyRewards: '25K MSH',
    description: 'For experienced players sharpening their skills. Play Chess, Ludo, Pool and Word Battle to earn promotion to Pro.',
    games: ['Chess', 'Ludo', '8-Ball Pool', 'Word Battle'],
    requirements: 'Rating 800+ or promotion from Amateur',
    season: 'Season 3', startDate: 'Aug 1, 2026', endDate: 'Oct 31, 2026',
    leaderboard: [
      { rank: 1, name: 'PoolShark_ZA',  points: 1890, wins: 42, team: 'Billiard Boys', nation: '🇿🇦' },
      { rank: 2, name: 'WordWizard',    points: 1750, wins: 39, team: 'Vocab Kings',   nation: '🇿🇦' },
      { rank: 3, name: 'ChessVet',      points: 1620, wins: 36, team: 'Board Kings',   nation: '🇿🇦' },
      { rank: 4, name: 'LudoMaster',    points: 1480, wins: 32, team: 'Dice Kings',    nation: '🇿🇦' },
      { rank: 5, name: 'CueBall_SA',    points: 1350, wins: 28, team: 'Billiard Boys', nation: '🇿🇦' },
      { rank: 6, name: 'BoggleBoss',    points: 1250, wins: 25, team: 'Vocab Kings',   nation: '🇿🇦' },
      { rank: 7, name: 'SixShooter',    points: 1150, wins: 22, team: 'Roll Masters',  nation: '🇿🇦' },
      { rank: 8, name: 'EndgameEric',   points: 1050, wins: 19, team: 'Chess Elite',   nation: '🇿🇦' },
      { rank: 9, name: 'ScrabbleStar',  points: 950,  wins: 16, team: 'Vocab Kings',   nation: '🇿🇦' },
      { rank: 10, name: 'SolidShot',    points: 850,  wins: 13, team: 'Billiard Boys', nation: '🇿🇦' },
    ],
    rules: ['Minimum 2 matches per week', 'All listed games accepted', 'Top 1000 promote to Pro', 'Fair play policy', 'Weekly leaderboard refreshes'],
    benefits: ['Veteran badge', 'Seasonal rewards', 'Access to Veteran-only tournaments', 'Community leaderboard recognition', 'Promotion path to Pro League'],
  },
  amateur: {
    name: 'Amateur League', tier: 'Tier 4', icon: '🥉',
    color: 'from-green-500 to-emerald-600', members: '45,320', totalMembers: 45320,
    prizePool: '40K MSH', monthlyRewards: '10K MSH',
    description: 'Entry-level competitive play for all skill levels. Play any Guranda game and start your competitive journey.',
    games: ['All Games', 'Ludo', '8-Ball Pool', 'Morabaraba'],
    requirements: 'Open to all players with 10+ games played',
    season: 'Season 3', startDate: 'Aug 1, 2026', endDate: 'Oct 31, 2026',
    leaderboard: [
      { rank: 1, name: 'MorabarabaKing', points: 980, wins: 28, team: 'Savannah Kings', nation: '🇿🇦' },
      { rank: 2, name: 'FreshPool',      points: 920, wins: 25, team: 'Billiard Boys',  nation: '🇿🇦' },
      { rank: 3, name: 'LudoNewbie',     points: 860, wins: 22, team: 'Roll Masters',   nation: '🇿🇦' },
      { rank: 4, name: 'Rising_Star',    points: 800, wins: 19, team: 'New Blood',      nation: '🇿🇦' },
      { rank: 5, name: 'BoardBegineer',  points: 740, wins: 16, team: 'Board Kings',    nation: '🇿🇦' },
      { rank: 6, name: 'CasualGamer_ZA', points: 680, wins: 14, team: 'Just Playing',  nation: '🇿🇦' },
      { rank: 7, name: 'DiceNewcomer',   points: 620, wins: 12, team: 'Dice Kings',     nation: '🇿🇦' },
      { rank: 8, name: 'PoolFreshie',    points: 560, wins: 10, team: 'Billiard Boys',  nation: '🇿🇦' },
      { rank: 9, name: 'MoraNovice',     points: 500, wins: 8,  team: 'Savannah Kings', nation: '🇿🇦' },
      { rank: 10, name: 'StartingOut',   points: 440, wins: 6,  team: 'New Blood',      nation: '🇿🇦' },
    ],
    rules: ['No minimum matches required', 'All games count', 'Top 2000 promote to Veteran', 'Zero toxicity policy', 'Monthly standings published'],
    benefits: ['Amateur badge', 'First-time competitor rewards', 'Access to beginner tournaments', 'Community welcome pack', 'Learning resources & tutorials'],
  },
  casual: {
    name: 'Casual League', tier: 'Tier 5', icon: '⭐',
    color: 'from-purple-500 to-pink-600', members: '120,500', totalMembers: 120500,
    prizePool: '10K MSH', monthlyRewards: '2K MSH',
    description: 'Play for fun, earn small rewards, and enjoy every game Guranda has to offer.',
    games: ['All Games', 'Turbo Racing', 'Word Battle', 'Morabaraba'],
    requirements: 'Open to everyone',
    season: 'Season 3', startDate: 'Aug 1, 2026', endDate: 'Oct 31, 2026',
    leaderboard: [
      { rank: 1, name: 'FunFirst_SA',   points: 540, wins: 18, team: 'Just Vibing',  nation: '🇿🇦' },
      { rank: 2, name: 'CasualCruise',  points: 500, wins: 16, team: 'Chill Crew',   nation: '🇿🇦' },
      { rank: 3, name: 'WeekendWarrior',points: 460, wins: 14, team: 'Weekend Only', nation: '🇿🇦' },
      { rank: 4, name: 'PlayForPlay',   points: 420, wins: 12, team: 'Just Vibing',  nation: '🇿🇦' },
      { rank: 5, name: 'EasyRider_ZA',  points: 380, wins: 10, team: 'Chill Crew',   nation: '🇿🇦' },
      { rank: 6, name: 'ChillGamer',    points: 340, wins: 9,  team: 'Weekend Only', nation: '🇿🇦' },
      { rank: 7, name: 'JustForFun',    points: 300, wins: 8,  team: 'Just Vibing',  nation: '🇿🇦' },
      { rank: 8, name: 'VibingVince',   points: 260, wins: 7,  team: 'Chill Crew',   nation: '🇿🇦' },
      { rank: 9, name: 'SundayPlayer',  points: 220, wins: 6,  team: 'Weekend Only', nation: '🇿🇦' },
      { rank: 10, name: 'GoodVibesOnly',points: 180, wins: 5,  team: 'Just Vibing',  nation: '🇿🇦' },
    ],
    rules: ['No minimums', 'All games count', 'Top 5000 promote to Amateur', 'Friendly play encouraged', 'Weekly fun challenges'],
    benefits: ['Casual badge', 'Fun weekly rewards', 'Access to casual events', 'No pressure environment', 'Great way to explore all games'],
  },
}

export default function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const league = LEAGUES[id] || LEAGUES.elite

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24 pb-16">
        <section className="section-container max-w-6xl mx-auto">

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
            <Link href="/leagues" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition text-sm font-medium">
              <FaArrowLeft /> Back to Leagues
            </Link>
          </motion.div>

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="relative overflow-hidden glass-frosted rounded-3xl border-white/10 mb-10">
            <div className={`absolute inset-0 bg-gradient-to-br ${league.color} opacity-15`} />
            <div className="relative z-10 p-8 sm:p-12">
              <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-5xl">{league.icon}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">{league.tier}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25">
                      <motion.span animate={{ opacity:[1,0.4,1] }} transition={{ duration:1.5, repeat:Infinity }} className="inline-block mr-1 w-1.5 h-1.5 rounded-full bg-green-400 align-middle" />
                      {league.season} Active
                    </span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">{league.name}</h1>
                  <p className="text-gray-400 text-lg max-w-xl leading-relaxed">{league.description}</p>
                </div>
                <div className="glass-frosted rounded-2xl p-6 border-white/10 text-center min-w-36">
                  <div className={`text-2xl font-black bg-gradient-to-r ${league.color} bg-clip-text text-transparent mb-1`}>{league.prizePool}</div>
                  <div className="text-gray-500 text-xs">Season Prize Pool</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: FaUsers,    label: 'Members',         val: league.members },
                  { icon: FaTrophy,   label: 'Monthly Rewards', val: league.monthlyRewards },
                  { icon: FaGamepad,  label: 'Season',          val: league.season },
                  { icon: FaShieldAlt,label: 'Requirement',     val: league.requirements },
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
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2"><FaFire className="text-orange-400" /> League Rules</h2>
              <ul className="space-y-3">
                {league.rules.map((r: string, i: number) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                    className="flex items-start gap-3 text-gray-300 text-sm">
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${league.color} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>{i + 1}</span>
                    {r}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            {/* Benefits */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-frosted rounded-2xl p-7 border-white/10">
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2"><FaStar className="text-amber-400" /> Member Benefits</h2>
              <ul className="space-y-3">
                {league.benefits.map((b: string, i: number) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }}
                    className="flex items-start gap-3 text-gray-300 text-sm">
                    <span className="text-amber-400 font-bold">★</span> {b}
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
              <h2 className="text-xl font-black text-white">Current Leaderboard</h2>
              <span className="ml-auto text-xs text-gray-500">{league.totalMembers.toLocaleString()} members</span>
            </div>
            <div className="divide-y divide-white/5">
              {league.leaderboard.map((player: any, idx: number) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + idx * 0.04 }}
                  className="flex items-center gap-5 px-7 py-4 hover:bg-white/3 transition-colors">
                  <div className={`w-10 text-center font-black text-xl ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-600 text-base'}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${player.rank}`}
                  </div>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${league.color} flex items-center justify-center text-white text-sm font-black shrink-0`}>
                    {player.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">{player.name}</p>
                    <p className="text-xs text-gray-500">{player.nation} {player.team}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white text-sm">{player.points.toLocaleString()} pts</p>
                    <p className="text-xs text-gray-500">{player.wins} wins</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Games */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="glass-frosted rounded-2xl p-7 border-white/10 mb-8">
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2"><FaGamepad className="text-violet-400" /> Games in this League</h2>
            <div className="flex flex-wrap gap-3">
              {league.games.map((g: string) => (
                <span key={g} className={`px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${league.color} opacity-80`}>{g}</span>
              ))}
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
