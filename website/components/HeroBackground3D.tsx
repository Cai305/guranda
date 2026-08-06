'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Sphere, MeshDistortMaterial, Stars } from '@react-three/drei'
import * as THREE from 'three'

// ── Floating particle field ──────────────────────────────────────────────────
function Particles({ count = 180 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const { positions, speeds, phases } = useMemo(() => {
    const positions: [number, number, number][] = []
    const speeds: number[] = []
    const phases: number[] = []
    for (let i = 0; i < count; i++) {
      positions.push([
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 14,
      ])
      speeds.push(0.3 + Math.random() * 0.7)
      phases.push(Math.random() * Math.PI * 2)
    }
    return { positions, speeds, phases }
  }, [count])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const [x, y, z] = positions[i]
      dummy.position.set(
        x + Math.sin(t * speeds[i] * 0.4 + phases[i]) * 0.6,
        y + Math.cos(t * speeds[i] * 0.3 + phases[i]) * 0.5,
        z + Math.sin(t * speeds[i] * 0.2 + phases[i] + 1) * 0.4,
      )
      const scale = 0.015 + Math.abs(Math.sin(t * speeds[i] + phases[i])) * 0.02
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.6} />
    </instancedMesh>
  )
}

// ── Morphing blob ─────────────────────────────────────────────────────────────
function Blob({ position, color, speed, distort, radius }: {
  position: [number, number, number]
  color: string
  speed: number
  distort: number
  radius: number
}) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime() * speed
    mesh.current.rotation.x = Math.sin(t * 0.3) * 0.4
    mesh.current.rotation.y = t * 0.15
    mesh.current.rotation.z = Math.cos(t * 0.2) * 0.2
  })

  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={mesh} position={position}>
        <sphereGeometry args={[radius, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={speed * 2}
          roughness={0.1}
          metalness={0.05}
          transparent
          opacity={0.18}
        />
      </mesh>
    </Float>
  )
}

// ── Wireframe icosahedron ─────────────────────────────────────────────────────
function WireGeo({ position, color }: { position: [number, number, number]; color: string }) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    mesh.current.rotation.x = t * 0.08
    mesh.current.rotation.y = t * 0.12
    mesh.current.rotation.z = t * 0.05
  })

  return (
    <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.6}>
      <mesh ref={mesh} position={position}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.25} />
      </mesh>
    </Float>
  )
}

// ── Torus ring ────────────────────────────────────────────────────────────────
function Ring({ position, color }: { position: [number, number, number]; color: string }) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    mesh.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.3
    mesh.current.rotation.y = t * 0.1
  })

  return (
    <Float speed={0.8} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={mesh} position={position}>
        <torusGeometry args={[0.7, 0.04, 16, 80]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </Float>
  )
}

// ── Camera slow drift ─────────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree()
  useFrame(({ clock, mouse }) => {
    const t = clock.getElapsedTime()
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 1.2, 0.04)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 0.8 + Math.sin(t * 0.2) * 0.3, 0.04)
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <CameraRig />
      <Stars radius={60} depth={30} count={1200} factor={3} saturation={0.2} fade speed={0.6} />
      <Particles count={160} />

      {/* Main blobs */}
      <Blob position={[-4.5,  1.5, -3]} color="#7c3aed" speed={0.6} distort={0.55} radius={3.2} />
      <Blob position={[ 4.2, -1.2, -4]} color="#06b6d4" speed={0.5} distort={0.45} radius={2.8} />
      <Blob position={[ 0.5,  2.8, -5]} color="#ec4899" speed={0.7} distort={0.50} radius={2.2} />
      <Blob position={[-2.5, -2.5, -2]} color="#8b5cf6" speed={0.4} distort={0.40} radius={1.6} />

      {/* Wireframe geometry */}
      <WireGeo position={[-6,  3.5, -6]} color="#a78bfa" />
      <WireGeo position={[ 6, -2.5, -7]} color="#67e8f9" />
      <WireGeo position={[ 3,  4.0, -5]} color="#f9a8d4" />

      {/* Rings */}
      <Ring position={[-3.5, -3.5, -4]} color="#7c3aed" />
      <Ring position={[ 5,    2.5, -6]} color="#06b6d4" />
      <Ring position={[-1,    4.5, -8]} color="#ec4899" />
    </>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function HeroBackground3D() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
