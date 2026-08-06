'use client'

import dynamic from 'next/dynamic'

const GlobalBackground3D = dynamic(() => import('./GlobalBackground3D'), {
  ssr: false,
  loading: () => null,
})

export default function GlobalBackground3DWrapper() {
  return <GlobalBackground3D />
}
