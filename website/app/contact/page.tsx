'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import {
  FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaTwitter, FaDiscord, FaInstagram, FaTiktok, FaArrowRight,
  FaCheckCircle, FaRocket, FaHandshake, FaNewspaper, FaHeadset,
} from 'react-icons/fa'

const CATEGORIES = [
  { value: 'general',     label: 'General Enquiry',      icon: '💬' },
  { value: 'business',    label: 'Business Partnership',  icon: '🤝' },
  { value: 'investor',    label: 'Investor Relations',    icon: '💹' },
  { value: 'media',       label: 'Media Enquiry',         icon: '📰' },
  { value: 'support',     label: 'Support',               icon: '🎧' },
]

const CONTACT_METHODS = [
  { icon: FaEnvelope,     color: 'from-violet-500 to-purple-600', title: 'General Support', value: 'support@guranda.app',      link: 'mailto:support@guranda.app' },
  { icon: FaHandshake,    color: 'from-cyan-500 to-blue-600',     title: 'Partnerships',    value: 'partners@guranda.app',     link: 'mailto:partners@guranda.app' },
  { icon: FaNewspaper,    color: 'from-pink-500 to-rose-600',     title: 'Press & Media',   value: 'press@guranda.app',        link: 'mailto:press@guranda.app' },
  { icon: FaMapMarkerAlt, color: 'from-amber-500 to-orange-500',  title: 'Headquarters',    value: 'South Africa 🇿🇦',         link: '#' },
]

const SOCIALS = [
  { icon: FaTwitter,   href: '#', label: 'Twitter',   color: 'hover:bg-sky-500/20 hover:border-sky-500/40 hover:text-sky-400' },
  { icon: FaDiscord,   href: '#', label: 'Discord',   color: 'hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-400' },
  { icon: FaInstagram, href: '#', label: 'Instagram', color: 'hover:bg-pink-500/20 hover:border-pink-500/40 hover:text-pink-400' },
  { icon: FaTiktok,    href: '#', label: 'TikTok',    color: 'hover:bg-white/10 hover:border-white/30 hover:text-white' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', category: 'general', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 1000))
    setSending(false)
    setSubmitted(true)
    setTimeout(() => { setForm({ name: '', email: '', subject: '', category: 'general', message: '' }); setSubmitted(false) }, 4000)
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24">
        <section className="section-container max-w-6xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
            <motion.div className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-full bg-violet-500/10 border border-violet-500/30" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <FaEnvelope className="text-violet-400 text-sm" />
              <span className="text-sm font-semibold text-violet-300">We're listening</span>
            </motion.div>
            <h1 className="text-6xl sm:text-7xl font-black gradient-text mb-4">Get in Touch</h1>
            <p className="text-gray-400 text-xl max-w-xl mx-auto">Questions, partnerships, press or just a hello — we'd love to hear from you.</p>
          </motion.div>

          {/* Contact method cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {CONTACT_METHODS.map((m, i) => {
              const Icon = m.icon
              return (
                <motion.a key={i} href={m.link} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group glass-frosted rounded-2xl p-6 text-center border-white/10 hover:border-white/25 transition-all cursor-pointer block">
                  <motion.div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.color} mx-auto mb-4 flex items-center justify-center text-white text-xl shadow-lg`}
                    whileHover={{ rotate: 10, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Icon />
                  </motion.div>
                  <h3 className="font-bold text-white text-sm mb-1">{m.title}</h3>
                  <p className="text-gray-400 text-sm">{m.value}</p>
                </motion.a>
              )
            })}
          </div>

          {/* Form + side info */}
          <div className="grid lg:grid-cols-5 gap-10 mb-16">

            {/* Form */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
              className="lg:col-span-3 relative">
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-violet-600/20 to-pink-600/10 blur-sm" />
              <div className="relative glass-frosted rounded-3xl p-8 sm:p-10 border-white/10">
                <h2 className="text-2xl font-black text-white mb-7">Send a Message</h2>
                {submitted ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-14">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} className="text-6xl mb-5">✅</motion.div>
                    <h3 className="text-2xl font-black text-white mb-2">Message Sent!</h3>
                    <p className="text-gray-400">We'll get back to you within 24 hours.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      {[{ name: 'name', label: 'Your Name', type: 'text', placeholder: 'Full name' },
                        { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@email.com' }].map(f => (
                        <div key={f.name}>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{f.label}</label>
                          <input type={f.type} name={f.name} value={form[f.name as keyof typeof form]} onChange={handleChange} required
                            placeholder={f.placeholder}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                      <select name="category" value={form.category} onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/60 transition">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                      <input type="text" name="subject" value={form.subject} onChange={handleChange} placeholder="What's it about?"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Message</label>
                      <textarea name="message" value={form.message} onChange={handleChange} required rows={5} placeholder="Tell us everything…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition resize-none" />
                    </div>
                    <motion.button type="submit" disabled={sending} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                      className="w-full button-primary py-4 flex items-center justify-center gap-2.5 text-base shadow-[0_0_30px_rgba(124,58,237,0.3)] disabled:opacity-60">
                      {sending ? (
                        <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />Sending…</>
                      ) : (
                        <><FaRocket /> Send Message <FaArrowRight className="text-sm" /></>
                      )}
                    </motion.button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Side panel */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
              className="lg:col-span-2 space-y-5">
              <div className="glass-frosted rounded-2xl p-6 border-white/10">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2"><FaHeadset className="text-violet-400" /> Response Times</h3>
                {[{ label: 'General support', time: '< 24 hours', color: 'text-green-400' },
                  { label: 'Partnerships',    time: '1–2 days',   color: 'text-cyan-400' },
                  { label: 'Press enquiries', time: '< 4 hours',  color: 'text-pink-400' }].map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`text-sm font-bold ${r.color}`}>{r.time}</span>
                  </div>
                ))}
              </div>

              <div className="glass-frosted rounded-2xl p-6 border-white/10">
                <h3 className="font-bold text-white mb-4">Follow Guranda</h3>
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">Stay updated with news, feature drops, and community highlights.</p>
                <div className="grid grid-cols-2 gap-3">
                  {SOCIALS.map(s => {
                    const Icon = s.icon
                    return (
                      <motion.a key={s.label} href={s.href} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 transition-all text-sm font-medium ${s.color}`}>
                        <Icon className="shrink-0" /> {s.label}
                      </motion.a>
                    )
                  })}
                </div>
              </div>

              <div className="glass-frosted rounded-2xl p-6 border-white/10">
                <h3 className="font-bold text-white mb-3">🌍 Based in South Africa</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Building the digital operating system for everyday African life — and beyond.</p>
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-violet-400 transition">← Back to Home</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
