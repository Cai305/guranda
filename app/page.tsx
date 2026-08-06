import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Hero from '@/components/Hero'
import WhatIsSection from '@/components/WhatIsSection'
import MessagingSection from '@/components/MessagingSection'
import GamingSection from '@/components/GamingSection'
import LiveSection from '@/components/LiveSection'
import AISection from '@/components/AISection'
import ComingSoonServices from '@/components/ComingSoonServices'
import BenefitsSection from '@/components/BenefitsSection'
import ScreenshotsCarousel from '@/components/ScreenshotsCarousel'
import StatsSection from '@/components/StatsSection'
import UpcomingEventsSection from '@/components/UpcomingEventsSection'
import FAQSection from '@/components/FAQSection'
import DownloadCTA from '@/components/DownloadCTA'

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <Hero />
        <WhatIsSection />
        <MessagingSection />
        <GamingSection />
        <LiveSection />
        <AISection />
        <ComingSoonServices />
        <BenefitsSection />
        <ScreenshotsCarousel />
        <StatsSection />
        <UpcomingEventsSection />
        <FAQSection />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  )
}
