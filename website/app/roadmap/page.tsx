'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { useEffect, useState, useCallback } from 'react'
import {
  FaStore, FaCar, FaUtensils, FaHome, FaWallet, FaBook,
  FaPlane, FaHospital, FaRobot, FaBriefcase, FaGamepad,
  FaBroadcastTower, FaCheckCircle, FaComments, FaVideo,
  FaUsers, FaHeart, FaShoppingBag, FaTshirt, FaClock,
  FaChess, FaDice, FaBullhorn, FaTrophy, FaRocket,
  FaShieldAlt, FaStar, FaCoins, FaMapMarkerAlt, FaCar as FaCarIcon,
  FaCut, FaFilm, FaMusic, FaArrowRight, FaGithub,
} from 'react-icons/fa'
import { GiCardJoker, GiPingPongBat } from 'react-icons/gi'

// ─────────────────────────────────────────────
// Countdown hook
// ─────────────────────────────────────────────
function useCountdown(targetDate: Date) {
  const calc = useCallback(() => {
    const diff = targetDate.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000)  / 60000),
      seconds: Math.floor((diff % 60000)    / 1000),
      done: false,
    }
  }, [targetDate])

  const [time, setTime] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [calc])
  return time
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
const EARLY_ACCESS = new Date('2026-12-01T00:00:00')
const OFFICIAL     = new Date('2027-01-01T00:00:00')

const PHASES = [
  {
    phase: 'Phase 1', title: 'Foundation',
    status: 'complete' as const,
    period: 'Completed',
    color: 'from-green-500 to-emerald-600',
    items: [
      'User registration & phone auth',
      'Profile & identity system',
      'Instant messaging (DMs, Groups, Channels)',
      'Voice & video calling (WebRTC)',
      'Community spaces',
      'Stories (OOTD / labeled feed)',
      'Social posts, likes, comments, reposts',
      'Follow graph & social feed',
      'Wallet (Masheleni / MSH)',
      'Username reputation system',
    ],
  },
  {
    phase: 'Phase 2', title: 'Gaming & Live',
    status: 'complete' as const,
    period: 'Completed',
    color: 'from-green-500 to-emerald-600',
    items: [
      'Chess (vs human + AI, time controls)',
      'Ludo (multiplayer + AI seats)',
      '8-Ball Pool',
      'Morabaraba (traditional board game)',
      'Turbo Racing',
      'Word Battle Hub (Wordle Duel, Boggle, Scrabble)',
      'Cards Platform (Five Cards & Cassino + wagers)',
      'Live broadcasting (one-to-many, multi-category)',
      'Live quiz, polls & predictions',
      'Games leaderboard & achievements',
    ],
  },
  {
    phase: 'Phase 3', title: 'Mini-Apps & Services',
    status: 'complete' as const,
    period: 'Completed',
    color: 'from-green-500 to-emerald-600',
    items: [
      'Ride (request / driver mode)',
      'Eat (food delivery + order tracking)',
      'Marketplace (listings, bids, invoices)',
      'Property (rentals, tenancy, rent payments)',
      'Shopping (storefronts + orders)',
      'Car Find (listings + enquiries)',
      'Car Wash (booking)',
      'Hair (salon booking)',
      'Finance (Stokvels + XRPL multisig)',
      'Entertainment (movies, concerts, events + ticketing)',
    ],
  },
  {
    phase: 'Phase 4', title: 'Intelligence & Work',
    status: 'complete' as const,
    period: 'Completed',
    color: 'from-green-500 to-emerald-600',
    items: [
      'AI Companion (acts across all services)',
      'Work (jobs, gigs, company pages)',
      'Learning (courses, tutors, study communities)',
      'Travel (flights, stays, cars, packages)',
      'Health (practitioners, pharmacy, fitness log)',
      'Discovery / Video feed',
      'MoonBase 2.0 (avatar + social rooms)',
      'Challenges (OOTD, AI-generated, sponsored)',
      'Referral system',
      'Admin dashboard & feature flags',
    ],
  },
  {
    phase: 'Phase 5', title: 'Early Access & Polish',
    status: 'active' as const,
    period: 'Now → 1 Dec 2026',
    color: 'from-violet-500 to-purple-600',
    items: [
      'Push notifications (Expo)',
      'Performance & load-time optimisation',
      'Full regression & QA pass',
      'Onboarding flow redesign',
      'Deep creator monetisation tools',
      'Production payment rails (PayShap PSP webhook)',
      'Expanded card tournament system',
      'In-app feedback & bug reporting',
      'Early-access beta programme',
    ],
  },
  {
    phase: 'Phase 6', title: 'Official Launch',
    status: 'upcoming' as const,
    period: '1 Jan 2027',
    color: 'from-amber-500 to-orange-500',
    items: [
      'App Store & Google Play listing',
      'Production infrastructure scaling',
      'Public API / developer platform',
      'Expanded mini-app partner programme',
      'iOS native build',
      'Web (PWA) version',
      'Guranda Ads self-serve platform',
      'Creator Fund public launch',
    ],
  },
]

const FEATURES = [
  // Social
  { cat: 'social',    icon: FaComments,     label: 'Messaging',          desc: 'DMs, groups, channels, threads',                  done: true  },
  { cat: 'social',    icon: FaVideo,        label: 'Voice & Video Calls', desc: 'Real-time 1:1 calls over WebRTC',                 done: true  },
  { cat: 'social',    icon: FaUsers,        label: 'Communities',         desc: 'Group spaces with roles & channels',              done: true  },
  { cat: 'social',    icon: FaTshirt,       label: 'Stories (OOTD)',      desc: 'Labeled story feed, ranked & sold',               done: true  },
  { cat: 'social',    icon: FaHeart,        label: 'Social Feed',         desc: 'Posts, likes, reposts, bookmarks',                done: true  },
  { cat: 'social',    icon: FaUsers,        label: 'Relationships',       desc: 'Couples, follow graph, friend requests',          done: true  },
  // Economy
  { cat: 'economy',   icon: FaCoins,        label: 'MSH Wallet',          desc: 'Masheleni token. Send, receive and earn.',        done: true  },
  { cat: 'economy',   icon: FaStore,        label: 'Marketplace',         desc: 'Buy, sell, bid, invoice',                         done: true  },
  { cat: 'economy',   icon: FaShoppingBag,  label: 'Shopping',            desc: 'Storefronts, orders, payouts',                    done: true  },
  { cat: 'economy',   icon: FaWallet,       label: 'Finance (Stokvels)',  desc: 'XRPL multisig group savings',                    done: true  },
  { cat: 'economy',   icon: FaBullhorn,     label: 'Advertising',         desc: 'Ad campaigns with reputation ranking',            done: true  },
  { cat: 'economy',   icon: FaStar,         label: 'Creator Funds',       desc: 'Story engagement → monthly MSH payout',          done: true  },
  // Services
  { cat: 'services',  icon: FaCar,          label: 'Ride',                desc: 'Request or drive, live matching',                 done: true  },
  { cat: 'services',  icon: FaUtensils,     label: 'Eat',                 desc: 'Food delivery with live tracking',                done: true  },
  { cat: 'services',  icon: FaHome,         label: 'Property',            desc: 'Rentals, tenancy, rent payments',                 done: true  },
  { cat: 'services',  icon: FaPlane,        label: 'Travel',              desc: 'Flights, stays, cars, packages',                  done: true  },
  { cat: 'services',  icon: FaHospital,     label: 'Health',              desc: 'Practitioners, pharmacy, fitness',                done: true  },
  { cat: 'services',  icon: FaBook,         label: 'Learning',            desc: 'Courses, tutors, study communities',              done: true  },
  { cat: 'services',  icon: FaBriefcase,    label: 'Work',                desc: 'Jobs, gigs, company pages',                      done: true  },
  { cat: 'services',  icon: FaFilm,         label: 'Entertainment',       desc: 'Movies, concerts, events + ticketing',            done: true  },
  { cat: 'services',  icon: FaCarIcon,      label: 'Car Find',            desc: 'Car listings, enquiries',                         done: true  },
  { cat: 'services',  icon: FaShieldAlt,    label: 'Car Wash',            desc: 'Booking system',                                  done: true  },
  { cat: 'services',  icon: FaCut,          label: 'Hair',                desc: 'Salon & barber booking',                          done: true  },
  // AI & Identity
  { cat: 'ai',        icon: FaRobot,        label: 'AI Companion',        desc: 'Acts across every service with approval',         done: true  },
  { cat: 'ai',        icon: FaStar,         label: 'Username Reputation', desc: 'Cross-platform trust & ranking',                  done: true  },
  { cat: 'ai',        icon: FaMapMarkerAlt, label: 'Discovery Feed',      desc: 'Video feed, interests, subscriptions',            done: true  },
  { cat: 'ai',        icon: FaMusic,        label: 'MoonBase 2.0',        desc: 'Avatar rooms & social spaces',                    done: true  },
  { cat: 'ai',        icon: FaTrophy,       label: 'Challenges',          desc: 'Daily, AI-generated & sponsored',                 done: true  },
  // Live
  { cat: 'live',      icon: FaBroadcastTower, label: 'Live Broadcasting', desc: 'One-to-many, 7 categories',                       done: true  },
  { cat: 'live',      icon: FaVideo,        label: 'Live Events',         desc: 'Quiz, polls, predictions, job fairs',             done: true  },
  // Upcoming
  { cat: 'upcoming',  icon: FaRocket,       label: 'Push Notifications',  desc: 'Expo push notifications in progress',             done: false },
  { cat: 'upcoming',  icon: FaStore,        label: 'iOS App',             desc: 'App Store build coming Jan 2027',                 done: false },
  { cat: 'upcoming',  icon: FaGamepad,      label: 'More Games',          desc: 'Expanding the arcade',                            done: false },
  { cat: 'upcoming',  icon: FaWallet,       label: 'PayShap Live PSP',    desc: 'Automated deposit confirmation',                  done: false },
  { cat: 'upcoming',  icon: FaUsers,        label: 'Developer API',       desc: 'Public partner platform',                         done: false },
]

const GAMES = [
  { icon: FaChess,       name: 'Chess',         desc: 'vs human or AI, time controls, ratings',   done: true  },
  { icon: FaDice,        name: 'Ludo',          desc: 'Multiplayer + AI seats, multiple modes',    done: true  },
  { icon: GiPingPongBat, name: '8-Ball Pool',   desc: 'Physics-based, lobby matchmaking',          done: true  },
  { icon: FaGamepad,     name: 'Morabaraba',    desc: 'Traditional Southern African board game',   done: true  },
  { icon: FaRocket,      name: 'Turbo Racing',  desc: 'Upgrade your car, race & wager',            done: true  },
  { icon: FaBook,        name: 'Wordle Duel',   desc: '1v1 real-time word guessing',               done: true  },
  { icon: FaComments,    name: 'Boggle',        desc: 'Timed word-finding on a letter grid',       done: true  },
  { icon: FaBook,        name: 'Scrabble',      desc: 'Classic tile placement word game',          done: true  },
  { icon: GiCardJoker,   name: 'Five Cards',    desc: 'Card game with wager support',              done: true  },
  { icon: GiCardJoker,   name: 'Cassino',       desc: 'Card-capture game, wager support',          done: true  },
  { icon: FaTrophy,      name: 'Card Tournaments', desc: 'Bracket-based competition with prizes',  done: true  },
  { icon: FaGamepad,     name: 'More Games',    desc: 'Expanding arcade. Watch this space.',               done: false },
]

const MINI_APPS = [
  { icon: '🚗', name: 'Ride',         status: 'Live',    color: 'from-purple-500 to-pink-600'    },
  { icon: '🍽️', name: 'Eat',          status: 'Live',    color: 'from-red-500 to-orange-600'     },
  { icon: '🛍️', name: 'Marketplace',  status: 'Live',    color: 'from-amber-500 to-orange-600'   },
  { icon: '🏠', name: 'Property',     status: 'Live',    color: 'from-blue-500 to-cyan-600'      },
  { icon: '🛒', name: 'Shopping',     status: 'Live',    color: 'from-cyan-500 to-blue-600'      },
  { icon: '💰', name: 'Finance',      status: 'Live',    color: 'from-green-500 to-emerald-600'  },
  { icon: '✈️', name: 'Travel',       status: 'Live',    color: 'from-sky-500 to-indigo-600'     },
  { icon: '🏥', name: 'Health',       status: 'Live',    color: 'from-pink-500 to-rose-600'      },
  { icon: '📚', name: 'Learning',     status: 'Live',    color: 'from-indigo-500 to-purple-600'  },
  { icon: '💼', name: 'Work',         status: 'Live',    color: 'from-orange-500 to-amber-600'   },
  { icon: '🎭', name: 'Entertainment',status: 'Live',    color: 'from-fuchsia-500 to-pink-600'   },
  { icon: '🚘', name: 'Car Find',     status: 'Live',    color: 'from-slate-500 to-gray-600'     },
  { icon: '🚿', name: 'Car Wash',     status: 'Live',    color: 'from-teal-500 to-cyan-600'      },
  { icon: '✂️', name: 'Hair',         status: 'Live',    color: 'from-rose-500 to-pink-600'      },
  { icon: '🤖', name: 'AI Companion', status: 'Live',    color: 'from-violet-500 to-purple-600'  },
  { icon: '🌕', name: 'MoonBase 2.0', status: 'Live',    color: 'from-yellow-500 to-amber-600'   },
  { icon: '📡', name: 'Live',         status: 'Live',    color: 'from-red-500 to-pink-600'       },
  { icon: '🗺️', name: 'Discovery',    status: 'Live',    color: 'from-lime-500 to-green-600'     },
  { icon: '📱', name: 'iOS App',      status: 'Soon',    color: 'from-gray-500 to-slate-600'     },
  { icon: '🌐', name: 'Web PWA',      status: 'Soon',    color: 'from-gray-500 to-slate-600'     },
]

const FEATURE_CATS = [
  { key: 'all',      label: 'All' },
  { key: 'social',   label: '💬 Social' },
  { key: 'economy',  label: '💰 Economy' },
  { key: 'services', label: '🛠️ Services' },
  { key: 'ai',       label: '🤖 AI & Identity' },
  { key: 'live',     label: '📡 Live' },
  { key: 'upcoming', label: '🚧 Upcoming' },
]

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function CountdownUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className={`w-full aspect-square max-w-[72px] rounded-2xl bg-white/5 border ${color} flex items-center justify-center shadow-xl relative overflow-hidden`}>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="text-2xl sm:text-3xl font-black gradient-text tabular-nums leading-none"
          >
            {String(value).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] text-gray-500 mt-1.5 font-bold uppercase tracking-widest text-center w-full">{label}</span>
    </div>
  )
}

function PhaseCard({ p, idx }: { p: typeof PHASES[0]; idx: number }) {
  const [open, setOpen] = useState(idx < 2)
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: idx * 0.07 }}
      viewport={{ once: true }}
      className="relative group"
    >
      {/* Left connector line */}
      {idx < PHASES.length - 1 && (
        <div className="absolute left-6 top-full w-0.5 h-8 bg-gradient-to-b from-white/20 to-transparent hidden lg:block" />
      )}
      <div
        className={`glass-frosted rounded-3xl overflow-hidden border transition-all cursor-pointer ${
          p.status === 'complete'  ? 'border-green-500/20 hover:border-green-500/40'  :
          p.status === 'active'   ? 'border-violet-500/40 hover:border-violet-500/60' :
          'border-white/10 hover:border-amber-500/30'
        }`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="p-6 flex items-center gap-4">
          {/* Status dot */}
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center shrink-0 shadow-lg`}>
            {p.status === 'complete'  ? <FaCheckCircle className="text-white text-lg" /> :
             p.status === 'active'   ? <motion.div animate={{ scale: [1,1.3,1] }} transition={{ duration:1.5, repeat:Infinity }} className="w-3 h-3 rounded-full bg-white" /> :
             <FaClock className="text-white text-lg" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                p.status === 'complete'  ? 'bg-green-500/15 text-green-400'   :
                p.status === 'active'   ? 'bg-violet-500/20 text-violet-300' :
                'bg-amber-500/15 text-amber-400'
              }`}>
                {p.status === 'complete' ? '✓ Complete' : p.status === 'active' ? '⚡ In Progress' : '⏳ Upcoming'}
              </span>
              <span className="text-xs text-gray-500">{p.period}</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">{p.phase}: {p.title}</h3>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="text-gray-500 text-sm shrink-0"
          >▼</motion.div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 grid sm:grid-cols-2 gap-2 border-t border-white/5 pt-4">
                {p.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      p.status === 'complete' ? 'bg-green-400' :
                      p.status === 'active'   ? 'bg-violet-400' : 'bg-amber-400'
                    }`} />
                    <span className={p.status === 'complete' ? 'text-gray-300' : p.status === 'active' ? 'text-white' : 'text-gray-500'}>
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function RoadmapPage() {
  const early   = useCountdown(EARLY_ACCESS)
  const official = useCountdown(OFFICIAL)
  const [featCat, setFeatCat] = useState('all')
  const [activeTab, setActiveTab] = useState<'features'|'games'|'apps'>('features')

  const visibleFeatures = featCat === 'all'
    ? FEATURES
    : FEATURES.filter(f => f.cat === featCat)

  const doneCount = FEATURES.filter(f => f.done).length
  const totalCount = FEATURES.length

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24 pb-0">

        {/* ── Hero ───────────────────────────────────────── */}
        <section className="section-container max-w-5xl mx-auto text-center relative">
          <div className="absolute inset-0 gradient-mesh opacity-10 blur-3xl -z-10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full bg-violet-500/10 border border-violet-500/30"
          >
            <motion.span animate={{ scale:[1,1.4,1] }} transition={{ duration:1.5, repeat:Infinity }} className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-sm font-semibold text-violet-300">Live progress, updated in real time</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black mb-5 leading-none"
          >
            <span className="gradient-text">Guranda</span>
            <br />
            <span className="text-white">Roadmap</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-gray-400 text-xl max-w-2xl mx-auto mb-6"
          >
            Every feature, game, and mini-app — what's live, what's in progress, and what's coming.
          </motion.p>

          {/* Overall progress bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="max-w-sm mx-auto mb-16"
          >
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Overall completion</span>
              <span className="text-violet-400 font-bold">{doneCount}/{totalCount} features</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${(doneCount / totalCount) * 100}%` }}
                transition={{ duration: 1.5, delay: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          {/* ── Dual Countdown ───────────────────────────── */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
            {/* Early Access */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="relative overflow-hidden glass-frosted rounded-3xl p-7 border-violet-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-purple-600/5" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 mb-4">
                  <span className="text-xs font-bold text-violet-300">🎟️ Early Access</span>
                </div>
                <p className="text-white font-bold mb-1">1 December 2026</p>
                <p className="text-xs text-gray-500 mb-5">Beta testers get first access</p>
                {early.done ? (
                  <div className="text-2xl font-black text-violet-400">Early Access is Live! 🎉</div>
                ) : (
                  <div className="flex gap-2 w-full">
                    <CountdownUnit value={early.days}    label="Days"  color="border-violet-500/30" />
                    <CountdownUnit value={early.hours}   label="Hours" color="border-violet-500/20" />
                    <CountdownUnit value={early.minutes} label="Mins"  color="border-violet-500/20" />
                    <CountdownUnit value={early.seconds} label="Secs"  color="border-violet-500/10" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Official Launch */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55, duration: 0.7 }}
              className="relative overflow-hidden glass-frosted rounded-3xl p-7 border-amber-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-orange-600/5" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 mb-4">
                  <span className="text-xs font-bold text-amber-300">🚀 Official Launch</span>
                </div>
                <p className="text-white font-bold mb-1">1 January 2027</p>
                <p className="text-xs text-gray-500 mb-5">Public release on all platforms</p>
                {official.done ? (
                  <div className="text-2xl font-black text-amber-400">Guranda is Live! 🎉</div>
                ) : (
                  <div className="flex gap-2 w-full">
                    <CountdownUnit value={official.days}    label="Days"  color="border-amber-500/30" />
                    <CountdownUnit value={official.hours}   label="Hours" color="border-amber-500/20" />
                    <CountdownUnit value={official.minutes} label="Mins"  color="border-amber-500/20" />
                    <CountdownUnit value={official.seconds} label="Secs"  color="border-amber-500/10" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Phase Timeline ─────────────────────────────── */}
        <section className="section-container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-black gradient-text mb-3">Development Timeline</h2>
            <p className="text-gray-400">Click any phase to expand its feature list</p>
          </motion.div>
          <div className="space-y-4">
            {PHASES.map((p, i) => <PhaseCard key={i} p={p} idx={i} />)}
          </div>
        </section>

        {/* ── Features / Games / Mini-Apps tabs ─────────── */}
        <section className="section-container max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-4xl sm:text-5xl font-black gradient-text mb-3">Complete Feature List</h2>
            <p className="text-gray-400">Every feature, game and mini-app — live or incoming</p>
          </motion.div>

          {/* Main tabs */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {(['features', 'games', 'apps'] as const).map(t => (
              <motion.button
                key={t}
                onClick={() => setActiveTab(t)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                  activeTab === t
                    ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-500/20'
                    : 'glass-frosted text-gray-400 hover:text-white border-white/10'
                }`}
              >
                {t === 'features' ? '⚡ Features' : t === 'games' ? '🎮 Games' : '📦 Mini-Apps'}
              </motion.button>
            ))}
          </div>

          {/* ── Features panel ── */}
          {activeTab === 'features' && (
            <>
              {/* Category filter */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {FEATURE_CATS.map(c => (
                  <motion.button
                    key={c.key}
                    onClick={() => setFeatCat(c.key)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      featCat === c.key
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {c.label}
                  </motion.button>
                ))}
              </div>

              <motion.div
                layout
                className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {visibleFeatures.map((f, i) => {
                    const Icon = f.icon
                    return (
                      <motion.div
                        key={f.label}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: i * 0.02 }}
                        whileHover={{ y: -5 }}
                        className={`relative overflow-hidden glass-frosted rounded-2xl p-5 border transition-all group cursor-default ${
                          f.done
                            ? 'border-white/10 hover:border-green-500/30'
                            : 'border-dashed border-white/10 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                            f.done
                              ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                              : 'bg-white/10'
                          }`}>
                            <Icon className="text-sm" />
                          </div>
                          {f.done
                            ? <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">✓ Live</span>
                            : <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Soon</span>
                          }
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1">{f.label}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            </>
          )}

          {/* ── Games panel ── */}
          {activeTab === 'games' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {GAMES.map((g, i) => {
                const Icon = g.icon
                return (
                  <motion.div
                    key={g.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className={`group relative overflow-hidden glass-frosted rounded-2xl p-6 border transition-all cursor-default ${
                      g.done ? 'border-white/10 hover:border-violet-500/30' : 'border-dashed border-white/10 opacity-60'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 group-hover:from-violet-600/5 to-transparent transition-all" />
                    <div className="relative z-10">
                      <motion.div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg ${
                          g.done ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-white/10'
                        }`}
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Icon />
                      </motion.div>
                      <h3 className="font-bold text-white mb-1">{g.name}</h3>
                      <p className="text-xs text-gray-500 mb-3">{g.desc}</p>
                      {g.done
                        ? <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">✓ Live</span>
                        : <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">Coming</span>
                      }
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* ── Mini-Apps panel ── */}
          {activeTab === 'apps' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {MINI_APPS.map((a, i) => (
                <motion.div
                  key={a.name}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -6, scale: 1.04 }}
                  className={`group relative overflow-hidden glass-frosted rounded-2xl p-5 text-center cursor-default border transition-all ${
                    a.status === 'Live'
                      ? 'border-white/10 hover:border-white/25'
                      : 'border-dashed border-white/10 opacity-50 hover:opacity-70'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${a.color} opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl`} />
                  <div className="relative z-10">
                    <motion.div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.color} mx-auto mb-3 flex items-center justify-center text-2xl shadow-lg`}
                      whileHover={{ rotate: 8, scale: 1.12 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      {a.icon}
                    </motion.div>
                    <p className="text-sm font-bold text-white mb-2">{a.name}</p>
                    {a.status === 'Live'
                      ? <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">✓ Live</span>
                      : <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">Coming</span>
                    }
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* ── What's remaining ───────────────────────────── */}
        <section className="section-container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden glass-frosted rounded-3xl p-10 border-amber-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-orange-600/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                  <FaRocket className="text-lg" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">What's Still Coming</h2>
                  <p className="text-gray-500 text-sm">Before & after official launch</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { item: 'Push notifications (Expo)',          when: 'Before Dec 2026' },
                  { item: 'Production PayShap PSP webhook',     when: 'Before Dec 2026' },
                  { item: 'Full regression & QA pass',          when: 'Before Dec 2026' },
                  { item: 'Onboarding redesign',                when: 'Before Dec 2026' },
                  { item: 'iOS App Store build',                when: 'Jan 2027' },
                  { item: 'Web PWA version',                    when: 'Jan 2027' },
                  { item: 'Public Developer API',               when: 'Jan 2027' },
                  { item: 'Guranda Ads self-serve platform',    when: 'Jan 2027' },
                  { item: 'Expanded card tournaments',          when: 'Jan 2027' },
                  { item: 'Creator Fund public launch',         when: 'Jan 2027' },
                  { item: 'Mini-app partner programme',         when: 'Q1 2027' },
                  { item: 'More arcade games',                  when: 'Ongoing' },
                ].map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-sm text-gray-300 truncate">{r.item}</span>
                    </div>
                    <span className="text-xs text-amber-400 font-semibold shrink-0">{r.when}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="section-container max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-frosted rounded-3xl p-10 border-white/10"
          >
            <h2 className="text-3xl font-black text-white mb-3">Want Early Access?</h2>
            <p className="text-gray-400 mb-8">
              Download the Android beta now and be the first in — before the 1 Dec early-access window opens publicly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link href="/download" className="button-primary inline-flex items-center gap-2.5 px-8 py-4 shadow-[0_0_30px_rgba(124,58,237,0.35)]">
                  Download Android Beta <FaArrowRight className="text-sm" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link href="/contact" className="button-secondary inline-flex items-center gap-2.5 px-8 py-4">
                  <FaGithub /> Give Feedback
                </Link>
              </motion.div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8"
          >
            <Link href="/" className="text-sm text-gray-600 hover:text-violet-400 transition">
              ← Back to Home
            </Link>
          </motion.div>
        </section>

      </main>
      <Footer />
    </>
  )
}
