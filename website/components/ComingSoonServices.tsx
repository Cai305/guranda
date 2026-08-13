'use client'

import { motion } from 'framer-motion'
import {
  FaStore, FaCar, FaUtensils, FaHome, FaWallet, FaBook,
  FaPlane, FaHospital, FaRobot, FaBriefcase, FaGamepad, FaBroadcastTower,
  FaCut, FaCalendarAlt, FaChartLine, FaBolt
} from 'react-icons/fa'

const SERVICES = [
  { icon: FaStore,           label: 'Marketplace',     desc: 'Buy, sell & bid in one ecosystem',                              color: 'from-amber-500 to-orange-600' },
  { icon: FaCar,             label: 'Ride',            desc: 'Request a ride or drive and earn',                              color: 'from-purple-500 to-pink-600' },
  { icon: FaUtensils,        label: 'Eat',             desc: 'Food delivery, ordered and tracked',                            color: 'from-red-500 to-orange-600' },
  { icon: FaHome,            label: 'Property',        desc: 'Rentals, leases & tenancy management',                         color: 'from-blue-500 to-cyan-600' },
  { icon: FaWallet,          label: 'Finance',         desc: 'Stokvels backed by real XRPL multisig',                        color: 'from-green-500 to-emerald-600' },
  { icon: FaBook,            label: 'Learning',        desc: 'Courses, tutors & study communities',                          color: 'from-indigo-500 to-purple-600' },
  { icon: FaPlane,           label: 'Travel',          desc: 'Flights, stays, cars & packages',                              color: 'from-cyan-500 to-blue-600' },
  { icon: FaHospital,        label: 'Health',          desc: 'Practitioner booking & pharmacy orders',                       color: 'from-pink-500 to-rose-600' },
  { icon: FaRobot,           label: 'AI Companion',    desc: 'A personal AI that acts across every service, with your approval', color: 'from-violet-500 to-purple-600' },
  { icon: FaBriefcase,       label: 'Work',            desc: 'Jobs, gigs & company pages',                                   color: 'from-orange-500 to-amber-600' },
  { icon: FaGamepad,         label: 'Games Hub',       desc: 'Chess, Ludo, Pool, Morabaraba, Turbo Racing, Word Battle',     color: 'from-yellow-500 to-orange-600' },
  { icon: FaBroadcastTower,  label: 'Live & Calling',  desc: 'Go live to viewers or call a friend 1:1',                     color: 'from-fuchsia-500 to-pink-600' },
  { icon: FaCut,             label: 'Salon & Spa',     desc: 'Book haircuts and beauty services instantly',                  color: 'from-rose-500 to-pink-600' },
  { icon: FaCalendarAlt,     label: 'Events',          desc: 'Create and manage RSVPs for any occasion',                     color: 'from-blue-500 to-indigo-600' },
  { icon: FaChartLine,       label: 'Creator Tools',   desc: 'Detailed post analytics and engagement metrics',               color: 'from-emerald-500 to-teal-600' },
  { icon: FaBolt,            label: 'Instant UI',      desc: 'Zero-latency persistent offline caching architecture',         color: 'from-yellow-400 to-amber-500' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function ComingSoonServices() {
  return (
    <section className="section-container max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <div className="inline-block mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30">
          <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            ✅ Live in the app today
          </span>
        </div>
        <h2 className="text-5xl sm:text-6xl font-black gradient-text mb-4">One App, Every Service</h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          These aren't on a roadmap. They're already running inside Guranda, all behind one identity and one wallet.
        </p>
      </motion.div>

      <motion.div
        className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {SERVICES.map((service, idx) => {
          const Icon = service.icon
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative overflow-hidden rounded-2xl cursor-default"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`} />
              <div className="relative z-10 glass-frosted p-6 rounded-2xl border-white/10 group-hover:border-white/25 transition-all h-full flex flex-col items-center text-center">
                <motion.div
                  className={`mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white text-xl shadow-lg`}
                  whileHover={{ rotate: 12, scale: 1.15 }}
                  transition={{ type: 'spring', stiffness: 350 }}
                >
                  <Icon />
                </motion.div>
                <h3 className="text-base font-bold mb-1.5 text-white">{service.label}</h3>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed flex-1">{service.desc}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-white/5">
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: idx * 0.12 }}
                    className="inline-block"
                  >✅</motion.span>
                  <span className={`bg-gradient-to-r ${service.color} bg-clip-text text-transparent`}>Live Now</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
