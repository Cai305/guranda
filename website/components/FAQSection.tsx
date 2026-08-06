'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronDown, FaQuestionCircle, FaShieldAlt, FaGamepad, FaRocket, FaDollarSign, FaHeadset, FaRobot } from 'react-icons/fa'

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const faqsWithCategories = [
    {
      category: 'general',
      categoryName: 'General',
      icon: <FaQuestionCircle />,
      color: 'from-blue-500 to-cyan-500',
      questions: [
        {
          question: 'What is Guranda?',
          answer: 'Guranda is a digital operating system that connects all your digital needs into one unified platform. It combines messaging, gaming, live streaming, e-commerce, transport, food delivery, finance, learning, and more — all under one identity and one wallet.',
        },
        {
          question: 'Are Ride and Eat available yet?',
          answer: 'Yes. Both are live in the app today. Request a ride or go online as a driver, and order food for delivery with live order tracking, all without leaving Guranda.',
        },
        {
          question: 'What is Masheleni (MSH)?',
          answer: 'Masheleni (MSH) is the Guranda in-app currency. You earn it through gaming, live streaming, selling items, and content engagement. You can also deposit real money via PayShap to add MSH to your wallet and spend it across every service on the platform.',
        },
        {
          question: 'Is Guranda only for South Africa?',
          answer: 'Guranda is built in South Africa with an Africa-first focus, but it is open to anyone worldwide. The platform supports South African payment rails like PayShap, and many services are live in SA right now, with global expansion planned after the official January 2027 launch.',
        },
        {
          question: 'When is the official launch?',
          answer: 'Early access opens on 1 December 2026 for beta users. The full public launch is 1 January 2027. You can download the Android beta today and start using the app before launch day.',
        },
      ],
    },
    {
      category: 'ai',
      categoryName: 'AI Companion',
      icon: <FaRobot />,
      color: 'from-violet-500 to-purple-500',
      questions: [
        {
          question: 'What can the AI Companion do?',
          answer: 'Your AI Companion can act across every Guranda service on your behalf. Tell it to book a ride, order food, send MSH, challenge a friend to chess, find a course, or check your wallet — it will plan and execute the task using the right mini-app, but only after you approve anything that costs money or sends a message.',
        },
        {
          question: 'Is the AI safe to use?',
          answer: 'Yes. The AI Companion is designed with an approval-first model. It can suggest, plan, and prepare any action, but it cannot make payments, send messages, or book services without your explicit tap-to-confirm. You also have a full action log of everything the AI has done, and you can disable it at any time.',
        },
        {
          question: 'Does the AI learn about me?',
          answer: 'Over time, the AI learns your preferences — your favourite restaurant, regular routes, the games you play, and the people you talk to most. This makes it faster and more useful. All learning happens within your account and is not shared with other users.',
        },
        {
          question: 'Can I turn the AI off?',
          answer: 'Yes. You can disable the AI Companion from your profile settings at any time. All AI action history is stored in your account log and can be cleared.',
        },
      ],
    },
    {
      category: 'pricing',
      categoryName: 'Pricing & Money',
      icon: <FaDollarSign />,
      color: 'from-green-500 to-emerald-500',
      questions: [
        {
          question: 'Is Guranda free?',
          answer: 'Guranda is free to download and use. Most features — messaging, social feed, games, live watching, stories — are free. Some services like Ride, Eat, and marketplace transactions use MSH (which you can earn or deposit). Premium cosmetics and wager-based games are optional.',
        },
        {
          question: 'Can I earn money on Guranda?',
          answer: 'Yes, in multiple ways: win gaming tournaments, earn MSH through the Creator Fund when your stories get ranked, sell products via Live or Marketplace, drive for Ride, run a food store on Eat, teach a course on Learning, or complete gigs via Work.',
        },
        {
          question: 'How do I deposit money into my wallet?',
          answer: 'Currently via PayShap. Submit a deposit request in the app, transfer via PayShap to the provided merchant number, and your MSH will be credited once confirmed by admin. Automated PayShap webhook confirmation is coming before the December 2026 early-access launch.',
        },
      ],
    },
    {
      category: 'features',
      categoryName: 'Features & Usage',
      icon: <FaRocket />,
      color: 'from-orange-500 to-amber-500',
      questions: [
        {
          question: 'How does Live work?',
          answer: 'Guranda Live lets you broadcast to your audience in one tap. You can go live for social content, gaming, education, business, shopping, entertainment, sports, or music. Viewers can tip you in MSH, buy products you showcase, answer quiz questions, vote on polls, and more.',
        },
        {
          question: 'What games are available?',
          answer: 'The Games Hub has Chess (with ELO ratings), Ludo (multiplayer + AI), 8-Ball Pool, Morabaraba, Turbo Racing, Wordle Duel, Boggle, Scrabble, Five Cards and Cassino. Most support AI opponents and some support wager-based play with MSH on the line.',
        },
        {
          question: 'What mini-apps are in Guranda?',
          answer: 'Ride, Eat, Marketplace, Shopping, Property, Finance (Stokvels), Travel, Health, Learning, Work, Entertainment (movies/concerts/events), Car Find, Car Wash, and Hair booking — all live in the app behind one identity and one wallet.',
        },
        {
          question: 'What is the Stories feature?',
          answer: 'Stories on Guranda use a daily labeling system — OOTD (Outfit of the Day), COTD (Cook of the Day), FOTD (Face of the Day), and others. Your stories get ranked by the community and you earn MSH from the Creator Fund based on engagement. You can also sell items directly from your story.',
        },
      ],
    },
    {
      category: 'security',
      categoryName: 'Security & Privacy',
      icon: <FaShieldAlt />,
      color: 'from-purple-500 to-pink-500',
      questions: [
        {
          question: 'Is my data secure?',
          answer: 'Guranda uses industry-standard encryption for all communications and stores sensitive data (passwords, wallet keys) using best-practice hashing and encryption. Private keys for self-custodial wallets are encrypted and never stored in plaintext.',
        },
        {
          question: 'Can I transfer my data to other platforms?',
          answer: 'We are committed to user data portability. Tools to export your data will be available after the official January 2027 launch, in line with applicable regulations.',
        },
        {
          question: 'What happens if my account is suspended?',
          answer: 'Suspensions are reviewed by the admin team. If your account is suspended, you will be notified. You can appeal via the contact page. Suspensions are logged in the admin audit trail and are reversible.',
        },
      ],
    },
  ]

  const allQuestions = faqsWithCategories.flatMap(cat =>
    cat.questions.map((q, idx) => ({
      ...q,
      id: `${cat.category}-${idx}`,
      category: cat.category,
      categoryName: cat.categoryName,
      categoryColor: cat.color,
      categoryIcon: cat.icon,
    }))
  )

  const filteredQuestions = selectedCategory === 'all'
    ? allQuestions
    : allQuestions.filter(q => q.category === selectedCategory)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5 },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.3 },
    },
  }

  return (
    <section className="section-container max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <motion.div
          className="inline-block mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30"
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            ❓ Questions & Answers
          </span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          <span className="gradient-text">Frequently Asked Questions</span>
        </h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Everything you need to know about Guranda. Can't find what you're looking for?{' '}
          <a href="/contact" className="text-violet-400 hover:text-violet-300 transition">
            Contact us
          </a>
        </p>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        className="flex flex-wrap justify-center gap-3 mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        viewport={{ once: true }}
      >
        <motion.button
          onClick={() => setSelectedCategory('all')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg'
              : 'glass-frosted text-gray-300 hover:text-white backdrop-blur-xl'
          }`}
        >
          All Topics
        </motion.button>

        {faqsWithCategories.map((category) => (
          <motion.button
            key={category.category}
            onClick={() => setSelectedCategory(category.category)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2 rounded-full font-semibold transition-all flex items-center gap-2 ${
              selectedCategory === category.category
                ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                : 'glass-frosted text-gray-300 hover:text-white backdrop-blur-xl'
            }`}
          >
            <span className="text-lg">{category.icon}</span>
            {category.categoryName}
          </motion.button>
        ))}
      </motion.div>

      {/* FAQ Items */}
      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <AnimatePresence mode="wait">
          {filteredQuestions.map((faq, idx) => (
            <motion.div
              key={faq.id}
              variants={itemVariants}
              exit="exit"
              className="group"
            >
              <motion.div
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="glass-frosted rounded-2xl overflow-hidden border-white/20 cursor-pointer"
                whileHover={{ borderColor: 'rgba(255, 255, 255, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                transition={{ duration: 0.3 }}
              >
                {/* Question Header */}
                <motion.div
                  className="px-6 sm:px-8 py-5 sm:py-6 flex items-start justify-between text-left hover:bg-white/8 transition-colors backdrop-blur-xl gap-4"
                  whileHover={{ x: 4 }}
                >
                  {/* Icon and Question */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Category Color Dot */}
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full bg-gradient-to-r ${faq.categoryColor} mt-1.5`} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-400 mb-1 font-medium">{faq.categoryName}</p>
                      <h3 className="font-semibold text-base sm:text-lg text-white leading-tight">
                        {faq.question}
                      </h3>
                    </div>
                  </div>

                  {/* Chevron */}
                  <motion.div
                    animate={{ rotate: openIndex === idx ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="flex-shrink-0 text-violet-300 mt-1"
                  >
                    <FaChevronDown className="text-lg" />
                  </motion.div>
                </motion.div>

                {/* Answer Section */}
                <AnimatePresence>
                  {openIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
                        opacity: { duration: 0.25 },
                      }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15, duration: 0.3 }}
                        className="px-6 sm:px-8 py-6 border-t border-white/10 backdrop-blur-xl bg-white/5"
                      >
                        <p className="text-gray-200 leading-relaxed text-base">
                          {faq.answer}
                        </p>

                        {/* Helpful Footer */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3, duration: 0.3 }}
                          className="mt-6 pt-4 border-t border-white/10 flex items-center gap-4"
                        >
                          <span className="text-sm text-gray-400">Was this helpful?</span>
                          <button className="px-3 py-1 rounded-lg text-sm font-medium glass-subtle hover:bg-white/20 transition text-gray-300">
                            👍 Yes
                          </button>
                          <button className="px-3 py-1 rounded-lg text-sm font-medium glass-subtle hover:bg-white/20 transition text-gray-300">
                            👎 No
                          </button>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Still Need Help CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        viewport={{ once: true }}
        className="mt-16 glass-frosted p-8 sm:p-12 rounded-3xl text-center backdrop-blur-xl border-white/20"
      >
        <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-white">
          Still have questions?
        </h3>
        <p className="text-gray-300 mb-8 max-w-xl mx-auto">
          Can't find the answer you're looking for? Our support team is here to help you get the most out of Guranda.
        </p>
        <motion.a
          href="/contact"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block px-8 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Contact Support
        </motion.a>
      </motion.div>
    </section>
  )
}
