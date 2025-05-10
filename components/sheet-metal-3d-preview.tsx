"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid, Center, Environment } from "@react-three/drei"
import * as THREE from "three"
import type { FoldLine } from "@/components/sheet-metal-designer"

interface SheetMetal3DPreviewProps {
  width: number
  length: number
  foldLines: FoldLine[]
}

// Animated sheet segment component
function SheetSegment({
  width,
  length,
  position,
  rotation,
  color = "#88ccff",
  index,
}: {
  width: number
  length: number
  position: [number, number, number]
  rotation?: [number, number, number]
  color?: string
  index: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Add subtle animation to each segment
  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Add a subtle floating animation
      meshRef.current.position.y += Math.sin(clock.getElapsedTime() * 2 + index * 0.5) * 0.0003

      // Add a subtle pulsing effect
      const scale = 1 + Math.sin(clock.getElapsedTime() * 1.5 + index * 0.7) * 0.01
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <mesh ref={meshRef} position={position} rotation={rotation || [0, 0, 0]}>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        metalness={0.4}
        roughness={0.4}
        envMapIntensity={0.8}
      />
    </mesh>
  )
}

// Animated scene component
function AnimatedScene({ sheetSegments }: { sheetSegments: any[] }) {
  const groupRef = useRef<THREE.Group>(null)

  // Auto-rotate the entire model
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Smooth rotation around Y axis
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.2

      // Subtle tilt animation
      groupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.1
      groupRef.current.rotation.z = Math.cos(clock.getElapsedTime() * 0.3) * 0.05
    }
  })

  return (
    <Center>
      <group ref={groupRef} scale={1.5}>
        {sheetSegments.map((segment, index) => (
          <SheetSegment
            key={index}
            width={segment.width}
            length={segment.length}
            position={segment.position}
            rotation={segment.rotation}
            index={index}
            // Add color variation based on index
            color={`hsl(${210 + index * 10}, 70%, ${60 + index * 3}%)`}
          />
        ))}
      </group>
    </Center>
  )
}

export function SheetMetal3DPreview({ width, length, foldLines }: SheetMetal3DPreviewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate sheet segments and their positions/rotations
  const sheetSegments = useMemo(() => {
    // Sort fold lines by position
    const sortedFoldLines = [...foldLines].sort((a, b) => a.position - b.position)

    // Calculate the scale factor to make the model fit in the scene
    const scaleFactor = 1 / Math.max(width, length)

    // Create sheet segments based on fold lines
    const segments: {
      width: number
      length: number
      position: [number, number, number]
      rotation: [number, number, number]
    }[] = []

    if (sortedFoldLines.length === 0) {
      // If no fold lines, create a single segment for the entire sheet
      segments.push({
        width: width * scaleFactor,
        length: length * scaleFactor,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      })
    } else {
      // Create segments between fold lines
      let lastPosition = 0
      let currentY = (-length * scaleFactor) / 2
      let currentZ = 0
      let currentRotationX = 0

      // First segment
      const firstSegmentLength = sortedFoldLines[0].position - lastPosition
      segments.push({
        width: width * scaleFactor,
        length: firstSegmentLength * scaleFactor,
        position: [0, currentY + (firstSegmentLength * scaleFactor) / 2, 0],
        rotation: [0, 0, 0],
      })

      currentY += firstSegmentLength * scaleFactor
      lastPosition = sortedFoldLines[0].position

      // Middle segments
      for (let i = 0; i < sortedFoldLines.length; i++) {
        const foldLine = sortedFoldLines[i]
        const nextPosition = i < sortedFoldLines.length - 1 ? sortedFoldLines[i + 1].position : length
        const segmentLength = nextPosition - foldLine.position

        // Apply fold angle
        const foldAngle = foldLine.direction === "up" ? Math.PI / 4 : -Math.PI / 4
        currentRotationX += foldAngle

        // Calculate new position based on fold
        const halfSegmentLength = (segmentLength * scaleFactor) / 2
        const offsetY = Math.cos(currentRotationX) * halfSegmentLength
        const offsetZ = Math.sin(currentRotationX) * halfSegmentLength

        segments.push({
          width: width * scaleFactor,
          length: segmentLength * scaleFactor,
          position: [0, currentY + offsetY, currentZ + offsetZ],
          rotation: [currentRotationX, 0, 0],
        })

        // Update position for next segment
        currentY += Math.cos(currentRotationX) * segmentLength * scaleFactor
        currentZ += Math.sin(currentRotationX) * segmentLength * scaleFactor
        lastPosition = nextPosition
      }
    }

    return segments
  }, [width, length, foldLines])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse">Loading 3D preview...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full" style={{ minHeight: "250px" }}>
      <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
        {/* Enhanced lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 5]} intensity={1} castShadow />
        <directionalLight position={[-2, -2, -5]} intensity={0.3} />

        {/* Environment map for realistic reflections */}
        <Environment preset="city" />

        {/* Animated scene with sheet segments */}
        <AnimatedScene sheetSegments={sheetSegments} />

        {/* Grid and controls */}
        <Grid infiniteGrid fadeDistance={10} fadeStrength={1.5} />
        <OrbitControls
          enableDamping
          dampingFactor={0.25}
          autoRotate={false} // We're handling rotation manually
          enableZoom={true}
          enablePan={true}
          minDistance={1}
          maxDistance={10}
        />
      </Canvas>
    </div>
  )
}
