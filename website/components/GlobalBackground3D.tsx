'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

// ── Drifting particle field ───────────────────────────────────────────────────
function Particles({ count = 80 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const { positions, speeds, phases } = useMemo(() => {
    const positions: [number, number, number][] = []
    const speeds: number[] = []
    const phases: number[] = []
    for (let i = 0; i < count; i++) {
      positions.push([
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
      ])
      speeds.push(0.2 + Math.random() * 0.5)
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
        x + Math.sin(t * speeds[i] * 0.3 + phases[i]) * 0.8,
        y + Math.cos(t * speeds[i] * 0.25 + phases[i]) * 0.6,
        z + Math.sin(t * speeds[i] * 0.15 + phases[i]) * 0.4,
      )
      const scale = 0.012 + Math.abs(Math.sin(t * speeds[i] + phases[i])) * 0.015
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.45} />
    </instancedMesh>
  )
}

// ── Large ambient blobs ───────────────────────────────────────────────────────
function Blob({ position, color, speed, size }: {
  position: [number, number, number]
  color: string
  speed: number
  size: number
}) {
  const mesh = useRef<THREE.Mesh>(null)

  const { vertexShader, fragmentShader } = useMemo(() => ({
    vertexShader: `
      uniform float uTime;
      uniform float uSpeed;
      varying vec3 vNormal;
      void main() {
        vNormal = normal;
        vec3 pos = position;
        float wave = sin(pos.x * 1.5 + uTime * uSpeed) *
                     cos(pos.y * 1.5 + uTime * uSpeed * 0.8) * 0.18;
        pos += normal * wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      void main() {
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(uColor, uOpacity * (0.5 + fresnel * 0.5));
      }
    `,
  }), [])

  const uniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uSpeed:   { value: speed },
    uColor:   { value: new THREE.Color(color) },
    uOpacity: { value: 0.13 },
  }), [color, speed])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const mat = mesh.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = clock.getElapsedTime()
    mesh.current.rotation.y = clock.getElapsedTime() * speed * 0.12
    mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * speed * 0.08) * 0.2
  })

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[size, 48, 48]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Wireframe floating geo ────────────────────────────────────────────────────
function WireGeo({ position, color, shape = 'icosa' }: {
  position: [number, number, number]
  color: string
  shape?: 'icosa' | 'octa' | 'torus'
}) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    mesh.current.rotation.x = t * 0.06
    mesh.current.rotation.y = t * 0.09
    mesh.current.position.y = position[1] + Math.sin(t * 0.4) * 0.4
  })

  return (
    <mesh ref={mesh} position={position}>
      {shape === 'icosa' && <icosahedronGeometry args={[0.8, 1]} />}
      {shape === 'octa'  && <octahedronGeometry args={[0.9, 0]} />}
      {shape === 'torus' && <torusGeometry args={[0.6, 0.05, 12, 60]} />}
      <meshBasicMaterial color={color} wireframe transparent opacity={0.2} />
    </mesh>
  )
}

// ── Camera drift ──────────────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree()
  useFrame(({ clock, mouse }) => {
    const t = clock.getElapsedTime()
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 1.5, 0.03)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 1.0 + Math.sin(t * 0.15) * 0.4, 0.03)
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ── Full scene ────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <CameraRig />

      {/* Deep stars */}
      <Stars radius={80} depth={40} count={900} factor={2.5} saturation={0.1} fade speed={0.4} />

      {/* Particles */}
      <Particles count={80} />

      {/* Ambient blobs */}
      <Blob position={[-5,  2, -6]} color="#7c3aed" speed={0.5} size={3.5} />
      <Blob position={[ 5, -2, -7]} color="#06b6d4" speed={0.4} size={3.0} />
      <Blob position={[ 1,  4, -8]} color="#ec4899" speed={0.6} size={2.5} />
      <Blob position={[-3, -3, -5]} color="#8b5cf6" speed={0.35} size={2.0} />

      {/* Wireframe shapes */}
      <WireGeo position={[-7,  4, -7]} color="#a78bfa" shape="icosa" />
      <WireGeo position={[ 7, -3, -8]} color="#67e8f9" shape="octa" />
      <WireGeo position={[ 4,  5, -6]} color="#f9a8d4" shape="torus" />
      <WireGeo position={[-5, -4, -9]} color="#a78bfa" shape="octa" />
      <WireGeo position={[ 0,  6, -9]} color="#67e8f9" shape="icosa" />
    </>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function GlobalBackground3D() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 65 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        dpr={[1, 1.2]}
        style={{ background: 'transparent' }}
        frameloop="always"
      >
        <Scene />
      </Canvas>
    </div>
  )
}
