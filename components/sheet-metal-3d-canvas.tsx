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
  const [touchStartTime, setTouchStartTime] = useState(0)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })
  const [isTouchDragging, setIsTouchDragging] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Create a grid of points representing the sheet
  const createSheetGrid = useCallback(() => {
    const gridSize = 10 // Number of grid points in each dimension
    const points = []

    // Dynamic scaling based on sheet size
    const maxDimension = Math.max(width, length)
    const baseFactor = 120 / maxDimension
    const scaleFactor = baseFactor * 0.8

    const sheetWidth = width * scaleFactor
    const sheetLength = length * scaleFactor

    // Create a grid of points
    for (let y = 0; y <= gridSize; y++) {
      for (let x = 0; x <= gridSize; x++) {
        // Calculate position in sheet coordinates
        const xPos = (x / gridSize) * width
        const yPos = (y / gridSize) * length

        // Convert to 3D space coordinates
        const xCoord = (xPos / width - 0.5) * sheetWidth
        const yCoord = (yPos / length - 0.5) * sheetLength

        // Start with flat sheet
        let zCoord = 0
        const color = "#88ccff"

        // Apply all fold effects to this point
        foldLines.forEach((foldLine) => {
          // Calculate distance from point to fold line
          const foldStartX = (foldLine.startPoint.x / width) * sheetWidth - sheetWidth / 2
          const foldStartY = (foldLine.startPoint.y / length) * sheetLength - sheetLength / 2
          const foldEndX = (foldLine.endPoint.x / width) * sheetWidth - sheetWidth / 2
          const foldEndY = (foldLine.endPoint.y / length) * sheetLength - sheetLength / 2

          // Calculate fold line vector
          const foldVectorX = foldEndX - foldStartX
          const foldVectorY = foldEndY - foldStartY
          const foldLength = Math.sqrt(foldVectorX * foldVectorX + foldVectorY * foldVectorY)

          if (foldLength > 0) {
            // Normalize fold vector
            const foldDirX = foldVectorX / foldLength
            const foldDirY = foldVectorY / foldLength

            // Calculate perpendicular vector
            const perpX = -foldDirY
            const perpY = foldDirX

            // Calculate point relative to fold line
            const relX = xCoord - foldStartX
            const relY = yCoord - foldStartY

            // Project point onto fold line
            const projDist = relX * foldDirX + relY * foldDirY

            // Calculate perpendicular distance
            const perpDist = relX * perpX + relY * perpY

            // Check if point is within fold line segment
            if (projDist >= 0 && projDist <= foldLength) {
              // Apply fold effect based on perpendicular distance
              const foldDirection = foldLine.direction === "up" ? 1 : -1
              const foldAngle = Math.PI / 6 // 30 degrees

              // Only apply fold to one side of the line
              if (perpDist > 0) {
                // Calculate fold effect
                const foldEffect = Math.min(Math.abs(perpDist), sheetLength / 2) * Math.sin(foldAngle) * foldDirection
                zCoord += foldEffect

                // Remove this color change line:
                // const colorShift = Math.abs(foldEffect) * 20
                // color = `hsl(${210 + colorShift}, 70%, ${60 - colorShift / 2}%)`
              }
            }
          }
        })

        points.push({ x: xCoord, y: yCoord, z: zCoord, color })
      }
    }

    return { points, gridSize, sheetWidth, sheetLength }
  }, [width, length, foldLines])

  // Draw the sheet with folds
  const drawSheet = useCallback(
    (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
      const { points, gridSize, sheetWidth, sheetLength } = createSheetGrid()

      // Draw grid cells
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          // Get the four corners of this grid cell
          const idx1 = y * (gridSize + 1) + x
          const idx2 = y * (gridSize + 1) + (x + 1)
          const idx3 = (y + 1) * (gridSize + 1) + (x + 1)
          const idx4 = (y + 1) * (gridSize + 1) + x

          const p1 = points[idx1]
          const p2 = points[idx2]
          const p3 = points[idx3]
          const p4 = points[idx4]

          // Project to 2D
          const proj1 = project3DTo2D(p1.x, p1.y, p1.z, rotation)
          const proj2 = project3DTo2D(p2.x, p2.y, p2.z, rotation)
          const proj3 = project3DTo2D(p3.x, p3.y, p3.z, rotation)
          const proj4 = project3DTo2D(p4.x, p4.y, p4.z, rotation)

          // Apply zoom and pan
          const screen1 = { x: centerX + proj1.x * zoom + panOffset.x, y: centerY - proj1.y * zoom + panOffset.y }
          const screen2 = { x: centerX + proj2.x * zoom + panOffset.x, y: centerY - proj2.y * zoom + panOffset.y }
          const screen3 = { x: centerX + proj3.x * zoom + panOffset.x, y: centerY - proj3.y * zoom + panOffset.y }
          const screen4 = { x: centerX + proj4.x * zoom + panOffset.x, y: centerY - proj4.y * zoom + panOffset.y }

          // Calculate average color - use consistent color instead
          // const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4
          // const colorShift = Math.abs(avgZ) * 20
          // const color = `hsl(${210 + colorShift}, 70%, ${60 - colorShift / 2}%)`
          const color = "#88ccff"

          // Draw the grid cell
          ctx.fillStyle = color
          ctx.strokeStyle = "#333333"
          ctx.lineWidth = 0.5

          ctx.beginPath()
          ctx.moveTo(screen1.x, screen1.y)
          ctx.lineTo(screen2.x, screen2.y)
          ctx.lineTo(screen3.x, screen3.y)
          ctx.lineTo(screen4.x, screen4.y)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }
      }

      // Draw fold lines
      foldLines.forEach((foldLine) => {
        // Convert fold line to 3D coordinates
        const foldStartX = (foldLine.startPoint.x / width) * sheetWidth - sheetWidth / 2
        const foldStartY = (foldLine.startPoint.y / length) * sheetLength - sheetLength / 2
        const foldEndX = (foldLine.endPoint.x / width) * sheetWidth - sheetWidth / 2
        const foldEndY = (foldLine.endPoint.y / length) * sheetLength - sheetLength / 2

        // Find z-coordinates at fold line points
        const startZ = 0
        const endZ = 0

        // Project to 2D
        const projStart = project3DTo2D(foldStartX, foldStartY, startZ, rotation)
        const projEnd = project3DTo2D(foldEndX, foldEndY, endZ, rotation)

        // Apply zoom and pan
        const screenStart = {
          x: centerX + projStart.x * zoom + panOffset.x,
          y: centerY - projStart.y * zoom + panOffset.y,
        }
        const screenEnd = { x: centerX + projEnd.x * zoom + panOffset.x, y: centerY - projEnd.y * zoom + panOffset.y }

        // Draw fold line
        ctx.strokeStyle = "#333333"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(screenStart.x, screenStart.y)
        ctx.lineTo(screenEnd.x, screenEnd.y)
        ctx.stroke()
      })
    },
    [createSheetGrid, rotation, zoom, panOffset],
  )

  // Main drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    canvas.width = containerWidth
    canvas.height = containerHeight

    ctx.clearRect(0, 0, containerWidth, containerHeight)

    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, containerWidth, containerHeight)

    const centerX = containerWidth / 2
    const centerY = containerHeight / 2

    // Draw grid
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

    // Draw the sheet
    drawSheet(ctx, centerX, centerY)

    // Draw title and info
    ctx.fillStyle = "#374151"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("3D Preview", centerX, 20)

    ctx.font = "10px Arial"
    ctx.fillText(`Zoom: ${Math.round(zoom * 100)}%`, centerX, containerHeight - 30)

    ctx.fillStyle = "#6b7280"
    ctx.font = "10px Arial"
    ctx.textAlign = "left"
    ctx.fillText("Drag to pan • Scroll to zoom • Controls to adjust", 10, containerHeight - 10)
  }, [drawSheet, zoom, panOffset])

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

  // All event handlers remain the same...
  const getCursorStyle = () => {
    if (panning) return "grabbing"
    return "grab"
  }

  const getCanvasCoordinates = (pageX: number, pageY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: pageX - rect.left,
      y: pageY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)

    setPanning(true)
    setLastPanPoint({ x, y })
    // setAutoRotate(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !panning) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)

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

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY)

    setTouchStartTime(Date.now())
    setTouchStartPos({ x, y })
    setIsTouchDragging(false)

    setPanning(true)
    setLastPanPoint({ x, y })
    // setAutoRotate(false)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY)

    const dx = x - touchStartPos.x
    const dy = y - touchStartPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 5) {
      setIsTouchDragging(true)
    }

    if (panning) {
      const deltaX = x - lastPanPoint.x
      const deltaY = y - lastPanPoint.y

      setPanOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }))

      setLastPanPoint({ x, y })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setPanning(false)
    setIsTouchDragging(false)
  }

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3))
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.3))
  const resetView = () => {
    setZoom(1)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
    setAutoRotate(true)
  }

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

      {/* <div className="absolute bottom-2 left-2 z-10">
        <Button
          variant={autoRotate ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoRotate(!autoRotate)}
          className="text-xs h-6"
        >
          {autoRotate ? "Auto" : "Manual"}
        </Button>
      </div> */}

      <canvas
        ref={canvasRef}
        className="w-full h-full border border-gray-300 rounded-lg"
        style={{ cursor: getCursorStyle(), touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  )
}
