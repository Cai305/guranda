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
      image={<div className="text-8xl">💬</div>}
      badge="💬 Real-time, end-to-end"
    />
  )
}
