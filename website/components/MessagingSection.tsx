'use client'

import {
  FaComment, FaPhone, FaVideo, FaUsers,
  FaUserFriends, FaComments, FaHeart, FaLock,
} from 'react-icons/fa'
import FeatureShowcase from './FeatureShowcase'

const FEATURES = [
  { icon: <FaComment />,      label: 'Direct Messages' },
  { icon: <FaPhone />,        label: 'Voice Calls' },
  { icon: <FaVideo />,        label: 'Video Calls' },
  { icon: <FaUsers />,        label: 'Communities' },
  { icon: <FaUserFriends />,  label: 'Groups' },
  { icon: <FaComments />,     label: 'Threads' },
  { icon: <FaHeart />,        label: 'Reactions' },
  { icon: <FaLock />,         label: 'Private Chats' },
]

export default function MessagingSection() {
  return (
    <FeatureShowcase
      title="Messaging"
      description="Stay connected with everyone that matters. From instant messages to live video calls, communities to private threads. All your conversations in one place."
      features={FEATURES}
      gradient="from-cyan-500 to-blue-600"
      image={
        <div className="relative flex items-center justify-center">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[2.5rem] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_90px_rgba(6,182,212,0.35)]">
            <FaComment className="text-white text-6xl sm:text-7xl" />
          </div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl shadow-lg ring-4 ring-black/20">
            <FaVideo />
          </div>
        </div>
      }
      badge="💬 Real-time, end-to-end"
    />
  )
}
