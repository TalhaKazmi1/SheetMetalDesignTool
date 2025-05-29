"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FoldLine } from "@/components/sheet-metal-designer"

interface SheetMetal3DCanvasProps {
  width: number
  length: number
  foldLines: FoldLine[]
}

export function SheetMetal3DCanvas({ width, length, foldLines }: SheetMetal3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const [mounted, setMounted] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [autoRotate, setAutoRotate] = useState(true)
  const [panning, setPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate sheet segments based on fold lines
  const calculateSegments = useCallback(() => {
    const sortedFoldLines = [...foldLines].sort((a, b) => a.position - b.position)
    const segments: {
      width: number
      length: number
      x: number
      y: number
      z: number
      rotationX: number
      color: string
    }[] = []

    // Dynamic scaling based on sheet size and number of folds
    const maxDimension = Math.max(width, length)
    const baseFactor = 120 / maxDimension // Base scale to fit in canvas
    const foldFactor = Math.max(0.3, 1 - foldLines.length * 0.1) // Reduce scale with more folds
    const scaleFactor = baseFactor * foldFactor

    if (sortedFoldLines.length === 0) {
      segments.push({
        width: width * scaleFactor,
        length: length * scaleFactor,
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        color: "#88ccff",
      })
    } else {
      let lastPosition = 0
      let currentY = -(length * scaleFactor) / 2 // Start from top
      let currentZ = 0
      let currentRotationX = 0

      // First segment
      const firstSegmentLength = sortedFoldLines[0].position - lastPosition
      const firstSegmentScaled = firstSegmentLength * scaleFactor

      segments.push({
        width: width * scaleFactor,
        length: firstSegmentScaled,
        x: 0,
        y: currentY + firstSegmentScaled / 2,
        z: currentZ,
        rotationX: 0,
        color: `hsl(210, 70%, 60%)`,
      })

      currentY += firstSegmentScaled
      lastPosition = sortedFoldLines[0].position

      // Subsequent segments
      for (let i = 0; i < sortedFoldLines.length; i++) {
        const foldLine = sortedFoldLines[i]
        const nextPosition = i < sortedFoldLines.length - 1 ? sortedFoldLines[i + 1].position : length
        const segmentLength = nextPosition - foldLine.position
        const segmentScaled = segmentLength * scaleFactor

        // Apply fold angle (smaller angles for better visibility)
        const foldAngle = foldLine.direction === "up" ? Math.PI / 6 : -Math.PI / 6
        currentRotationX += foldAngle

        // Calculate new position
        const halfSegmentLength = segmentScaled / 2
        const offsetY = Math.cos(currentRotationX) * halfSegmentLength
        const offsetZ = Math.sin(currentRotationX) * halfSegmentLength

        segments.push({
          width: width * scaleFactor,
          length: segmentScaled,
          x: 0,
          y: currentY + offsetY,
          z: currentZ + offsetZ,
          rotationX: currentRotationX,
          color: `hsl(${210 + i * 20}, 70%, ${60 + i * 5}%)`,
        })

        // Update position for next segment
        currentY += Math.cos(currentRotationX) * segmentScaled
        currentZ += Math.sin(currentRotationX) * segmentScaled
        lastPosition = nextPosition
      }
    }

    return segments
  }, [width, length, foldLines])

  // Convert 3D coordinates to 2D isometric projection
  const project3DTo2D = (x: number, y: number, z: number, rotationY: number) => {
    // Apply Y rotation
    const cosY = Math.cos(rotationY)
    const sinY = Math.sin(rotationY)
    const rotatedX = x * cosY - z * sinY
    const rotatedZ = x * sinY + z * cosY

    // Isometric projection
    const isoX = (rotatedX - rotatedZ) * Math.cos(Math.PI / 6)
    const isoY = y + (rotatedX + rotatedZ) * Math.sin(Math.PI / 6)

    return { x: isoX, y: isoY }
  }

  // Draw a 3D rectangle (sheet segment) in isometric view
  const drawIsometricRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    z: number,
    width: number,
    length: number,
    rotationX: number,
    rotationY: number,
    color: string,
    centerX: number,
    centerY: number,
  ) => {
    // Calculate the four corners of the rectangle
    const halfWidth = width / 2
    const halfLength = length / 2

    // Apply rotation around X axis
    const corners = [
      { x: -halfWidth, y: -halfLength, z: 0 },
      { x: halfWidth, y: -halfLength, z: 0 },
      { x: halfWidth, y: halfLength, z: 0 },
      { x: -halfWidth, y: halfLength, z: 0 },
    ]

    // Apply X rotation to corners
    const rotatedCorners = corners.map((corner) => ({
      x: corner.x,
      y: corner.y * Math.cos(rotationX) - corner.z * Math.sin(rotationX),
      z: corner.y * Math.sin(rotationX) + corner.z * Math.cos(rotationX),
    }))

    // Translate to segment position
    const translatedCorners = rotatedCorners.map((corner) => ({
      x: corner.x + x,
      y: corner.y + y,
      z: corner.z + z,
    }))

    // Project to 2D
    const projectedCorners = translatedCorners.map((corner) => project3DTo2D(corner.x, corner.y, corner.z, rotationY))

    // Apply zoom and pan offset
    const zoomedCorners = projectedCorners.map((corner) => ({
      x: centerX + corner.x * zoom + panOffset.x,
      y: centerY - corner.y * zoom + panOffset.y,
    }))

    // Draw the rectangle
    ctx.fillStyle = color
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 1

    ctx.beginPath()
    zoomedCorners.forEach((corner, index) => {
      if (index === 0) {
        ctx.moveTo(corner.x, corner.y)
      } else {
        ctx.lineTo(corner.x, corner.y)
      }
    })
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Add some shading for 3D effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
    ctx.fill()
  }

  // Main drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match container
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    canvas.width = containerWidth
    canvas.height = containerHeight

    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight)

    // Set background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, containerWidth, containerHeight)

    const centerX = containerWidth / 2
    const centerY = containerHeight / 2

    // Calculate segments
    const segments = calculateSegments()

    // Draw grid for reference
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"
    ctx.lineWidth = 1
    for (let i = 0; i < containerWidth; i += 20) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, containerHeight)
      ctx.stroke()
    }
    for (let i = 0; i < containerHeight; i += 20) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(containerWidth, i)
      ctx.stroke()
    }

    // Draw segments
    segments.forEach((segment) => {
      drawIsometricRect(
        ctx,
        segment.x,
        segment.y,
        segment.z,
        segment.width,
        segment.length,
        segment.rotationX,
        rotation,
        segment.color,
        centerX,
        centerY,
      )
    })

    // Draw title and info
    ctx.fillStyle = "#374151"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("3D Preview", centerX, 20)

    ctx.font = "10px Arial"
    ctx.fillText(`Zoom: ${Math.round(zoom * 100)}%`, centerX, containerHeight - 30)

    // Draw pan instructions
    ctx.fillStyle = "#6b7280"
    ctx.font = "10px Arial"
    ctx.textAlign = "left"
    ctx.fillText("Drag to pan • Scroll to zoom ", 55, containerHeight - 10)
  }, [calculateSegments, rotation, zoom, panOffset])

  // Animation loop
  useEffect(() => {
    if (!mounted) return

    const animate = () => {
      if (autoRotate) {
        setRotation((prev) => prev + 0.01)
      }
      drawCanvas()
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [drawCanvas, mounted, autoRotate])

  // Get cursor style based on interaction state
  const getCursorStyle = () => {
    if (panning) return "grabbing"
    return "grab"
  }

  // Handle mouse events for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPanning(true)
    setLastPanPoint({ x, y })
    // setAutoRotate(false) // Stop auto-rotation when user interacts
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !panning) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const deltaX = x - lastPanPoint.x
    const deltaY = y - lastPanPoint.y

    setPanOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }))

    setLastPanPoint({ x, y })
  }

  const handleMouseUp = () => {
    setPanning(false)
  }

  // Zoom controls
  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3))
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.3))
  const resetView = () => {
    setZoom(1)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
    setAutoRotate(true)
  }
  const toggleAutoRotate = () => setAutoRotate((prev) => !prev)

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.max(0.3, Math.min(3, prev + delta)))
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse">Loading 3D preview...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <Button variant="outline" size="sm" onClick={zoomIn} className="h-6 w-6 p-0">
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={zoomOut} className="h-6 w-6 p-0">
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={resetView} className="h-6 w-6 p-0">
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Auto-rotate toggle */}
      {/* <div className="absolute bottom-2 left-2 z-10">
        <Button
          variant={autoRotate ? "default" : "outline"}
          size="sm"
          onClick={toggleAutoRotate}
          className="text-xs h-6"
        >
          {autoRotate ? "Auto" : "Manual"}
        </Button>
      </div> */}

      <canvas
        ref={canvasRef}
        className="w-full h-full border border-gray-300 rounded-lg"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  )
}
