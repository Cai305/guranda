'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaTwitter, FaDiscord, FaInstagram, FaGithub, FaTiktok, FaYoutube } from 'react-icons/fa'

const LINKS = {
  Product:  [{ label: 'Home', href: '/' }, { label: 'Roadmap', href: '/roadmap' }, { label: 'Download', href: '/download' }, { label: 'Leagues', href: '/leagues' }],
  Company:  [{ label: 'About', href: '/contact' }, { label: 'Careers', href: '/contact' }, { label: 'Press', href: '/contact' }, { label: 'Blog', href: '/contact' }],
  Support:  [{ label: 'Contact Us', href: '/contact' }, { label: 'FAQ', href: '/#faq' }, { label: 'Privacy', href: '/contact' }, { label: 'Terms', href: '/contact' }],
}

const SOCIALS = [
  { icon: FaTwitter,  href: '#', label: 'Twitter',  color: 'hover:text-sky-400' },
  { icon: FaDiscord,  href: '#', label: 'Discord',  color: 'hover:text-indigo-400' },
  { icon: FaInstagram,href: '#', label: 'Instagram',color: 'hover:text-pink-400' },
  { icon: FaTiktok,   href: '#', label: 'TikTok',   color: 'hover:text-white' },
  { icon: FaYoutube,  href: '#', label: 'YouTube',  color: 'hover:text-red-500' },
  { icon: FaGithub,   href: '#', label: 'GitHub',   color: 'hover:text-white' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 mb-14">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="text-3xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Guranda
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-5 max-w-xs">
              The digital operating system for everyday life. One identity. One wallet. One world.
            </p>
            {/* Socials */}
            <div className="flex gap-3 flex-wrap">
              {SOCIALS.map(s => {
                const Icon = s.icon
                return (
                  <motion.a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    whileHover={{ scale: 1.2, y: -3 }}
                    whileTap={{ scale: 0.9 }}
                    className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 transition-colors ${s.color}`}
                  >
                    <Icon className="text-sm" />
                  </motion.a>
                )
              })}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([col, links]) => (
            <div key={col}>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest">{col}</h4>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors duration-200 hover:translate-x-1 inline-block"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © {year} Guranda. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
