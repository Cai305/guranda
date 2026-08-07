'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const GREETING = "Hi! I'm the Guranda Assistant. Ask me anything about the app — features, pricing, launch dates, how something works, all that.";
const MAX_LEN = 800

export default function AssistantWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  // Internal admin dashboard — not the place for a public FAQ widget.
  if (pathname?.startsWith('/admin')) return null

  const send = async () => {
    const text = input.trim().slice(0, MAX_LEN)
    if (!text || sending) return
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-9, -1),
        }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || "Sorry, something went wrong. Try again or reach out at support@guranda.app." }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "I couldn't reach the server just now. Please try again in a moment." }])
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-4">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-[min(92vw,380px)] h-[min(70vh,560px)] flex flex-col glass-frosted rounded-3xl border-white/15 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                <FaRobot />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">Guranda Assistant</p>
                <p className="text-xs text-gray-400 leading-tight flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> Answers Guranda questions
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-violet-600 to-pink-600 text-white rounded-br-md'
                        : 'bg-white/8 border border-white/10 text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gray-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-white/10 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={MAX_LEN}
                placeholder="Ask about Guranda…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition"
              />
              <motion.button
                onClick={send}
                disabled={sending || !input.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Send message"
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <FaPaperPlane className="text-xs" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? 'Close Guranda Assistant' : 'Open Guranda Assistant'}
        className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white text-xl shadow-[0_8px_30px_rgba(124,58,237,0.5)]"
      >
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 -z-10"
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <FaTimes />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <FaRobot />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
