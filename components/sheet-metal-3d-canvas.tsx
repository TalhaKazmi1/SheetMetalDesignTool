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

  // Create flat segments separated by fold lines
  const createSheetSegments = useCallback(() => {
    const segments = []

    // Dynamic scaling based on sheet size
    const maxDimension = Math.max(width, length)
    const baseFactor = 120 / maxDimension
    const scaleFactor = baseFactor * 0.8

    const sheetWidth = width * scaleFactor
    const sheetLength = length * scaleFactor

    if (foldLines.length === 0) {
      // No fold lines - single flat sheet
      segments.push({
        vertices: [
          { x: -sheetWidth / 2, y: -sheetLength / 2, z: 0 },
          { x: sheetWidth / 2, y: -sheetLength / 2, z: 0 },
          { x: sheetWidth / 2, y: sheetLength / 2, z: 0 },
          { x: -sheetWidth / 2, y: sheetLength / 2, z: 0 },
        ],
        color: "#88ccff",
      })
    } else {
      // For each fold line, create two segments
      foldLines.forEach((foldLine, index) => {
        // Convert fold line to 3D coordinates
        const foldStartX = (foldLine.startPoint.x / width) * sheetWidth - sheetWidth / 2
        const foldStartY = (foldLine.startPoint.y / length) * sheetLength - sheetLength / 2
        const foldEndX = (foldLine.endPoint.x / width) * sheetWidth - sheetWidth / 2
        const foldEndY = (foldLine.endPoint.y / length) * sheetLength - sheetLength / 2

        // Create the base segment (always flat)
        const baseSegment = {
          vertices: [
            { x: -sheetWidth / 2, y: -sheetLength / 2, z: 0 },
            { x: sheetWidth / 2, y: -sheetLength / 2, z: 0 },
            { x: foldEndX, y: foldEndY, z: 0 },
            { x: foldStartX, y: foldStartY, z: 0 },
          ],
          color: "#88ccff",
        }

        // Create the folded segment
        const foldAngle = foldLine.direction === "up" ? Math.PI / 6 : -Math.PI / 6

        // Calculate fold line vector for rotation axis
        const foldVectorX = foldEndX - foldStartX
        const foldVectorY = foldEndY - foldStartY
        const foldLength = Math.sqrt(foldVectorX * foldVectorX + foldVectorY * foldVectorY)

        if (foldLength > 0) {
          // Normalize fold vector
          const foldDirX = foldVectorX / foldLength
          const foldDirY = foldVectorY / foldLength

          // Create the second segment vertices
          const segment2Vertices = [
            { x: foldStartX, y: foldStartY, z: 0 },
            { x: foldEndX, y: foldEndY, z: 0 },
            { x: sheetWidth / 2, y: sheetLength / 2, z: 0 },
            { x: -sheetWidth / 2, y: sheetLength / 2, z: 0 },
          ]

          // Apply rotation to the second segment around the fold line
          const rotatedVertices = segment2Vertices.map((vertex) => {
            // Translate to fold line start
            const relX = vertex.x - foldStartX
            const relY = vertex.y - foldStartY
            const relZ = vertex.z

            // Calculate perpendicular distance from fold line
            const perpDist = relX * -foldDirY + relY * foldDirX

            // Only rotate points on one side of the fold line
            if (perpDist > 0) {
              // Apply rotation around the fold line
              const rotatedY = relY * Math.cos(foldAngle) - relZ * Math.sin(foldAngle)
              const rotatedZ = relY * Math.sin(foldAngle) + relZ * Math.cos(foldAngle)

              return {
                x: vertex.x,
                y: rotatedY + foldStartY,
                z: rotatedZ,
              }
            } else {
              return vertex
            }
          })

          const foldedSegment = {
            vertices: rotatedVertices,
            color: "#88ccff",
          }

          segments.push(baseSegment, foldedSegment)
        }
      })

      // If no valid segments were created, add a flat sheet
      if (segments.length === 0) {
        segments.push({
          vertices: [
            { x: -sheetWidth / 2, y: -sheetLength / 2, z: 0 },
            { x: sheetWidth / 2, y: -sheetLength / 2, z: 0 },
            { x: sheetWidth / 2, y: sheetLength / 2, z: 0 },
            { x: -sheetWidth / 2, y: sheetLength / 2, z: 0 },
          ],
          color: "#88ccff",
        })
      }
    }

    return segments
  }, [width, length, foldLines])

  // Draw a flat segment
  const drawSegment = useCallback(
    (ctx: CanvasRenderingContext2D, segment: any, centerX: number, centerY: number) => {
      // Project all vertices to 2D
      const projectedVertices = segment.vertices.map((vertex: any) =>
        project3DTo2D(vertex.x, vertex.y, vertex.z, rotation),
      )

      // Apply zoom and pan
      const screenVertices = projectedVertices.map((vertex: any) => ({
        x: centerX + vertex.x * zoom + panOffset.x,
        y: centerY - vertex.y * zoom + panOffset.y,
      }))

      // Draw the segment
      ctx.fillStyle = segment.color
      // ctx.strokeStyle = "#333333"
      // ctx.lineWidth = 1

      ctx.beginPath()
      screenVertices.forEach((vertex: any, index: number) => {
        if (index === 0) {
          ctx.moveTo(vertex.x, vertex.y)
        } else {
          ctx.lineTo(vertex.x, vertex.y)
        }
      })
      ctx.closePath()
      ctx.fill()
      // ctx.stroke()
    },
    [rotation, zoom, panOffset],
  )

  // Draw the sheet with segments
  const drawSheet = useCallback(
    (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
      const segments = createSheetSegments()

      // Draw all segments
      segments.forEach((segment) => {
        drawSegment(ctx, segment, centerX, centerY)
      })

      // Draw fold lines
      const maxDimension = Math.max(width, length)
      const baseFactor = 120 / maxDimension
      const scaleFactor = baseFactor * 0.8
      const sheetWidth = width * scaleFactor
      const sheetLength = length * scaleFactor

      foldLines.forEach((foldLine) => {
        // Convert fold line to 3D coordinates
        const foldStartX = (foldLine.startPoint.x / width) * sheetWidth - sheetWidth / 2
        const foldStartY = (foldLine.startPoint.y / length) * sheetLength - sheetLength / 2
        const foldEndX = (foldLine.endPoint.x / width) * sheetWidth - sheetWidth / 2
        const foldEndY = (foldLine.endPoint.y / length) * sheetLength - sheetLength / 2

        // Project to 2D
        const projStart = project3DTo2D(foldStartX, foldStartY, 0, rotation)
        const projEnd = project3DTo2D(foldEndX, foldEndY, 0, rotation)

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
    [createSheetSegments, drawSegment, rotation, zoom, panOffset, width, length, foldLines],
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
