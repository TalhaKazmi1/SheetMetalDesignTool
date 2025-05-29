"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import type { FoldLine } from "@/components/sheet-metal-designer"

interface SheetCanvasProps {
  width: number
  length: number
  foldLines: FoldLine[]
  updateFoldLine: (id: string, position: number, direction: "up" | "down") => void
}

export function SheetCanvas({ width, length, foldLines, updateFoldLine }: SheetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [scale, setScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [touchStartTime, setTouchStartTime] = useState(0)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })
  const [isTouchDragging, setIsTouchDragging] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate scale to fit the sheet in the viewport with padding
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      const containerWidth = container.clientWidth - 40 // Padding
      const containerHeight = container.clientHeight - 40 // Padding

      // Calculate scale to fit both width and height
      const scaleX = containerWidth / width
      const scaleY = containerHeight / length
      const newScale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond 1:1

      setScale(newScale)

      // Center the sheet when scale changes
      const scaledWidth = width * newScale
      const scaledHeight = length * newScale
      setPanOffset({
        x: (containerWidth - scaledWidth) / 2,
        y: (containerHeight - scaledHeight) / 2,
      })
    }
  }, [width, length])

  // Draw the sheet and fold lines on canvas
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

    // Calculate sheet position with pan offset
    const sheetX = 20 + panOffset.x
    const sheetY = 20 + panOffset.y
    const sheetWidth = width * scale
    const sheetHeight = length * scale

    // Draw sheet background
    ctx.fillStyle = "#f3f4f6"
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 2
    ctx.fillRect(sheetX, sheetY, sheetWidth, sheetHeight)
    ctx.strokeRect(sheetX, sheetY, sheetWidth, sheetHeight)

    // Draw dimensions labels
    ctx.fillStyle = "#374151"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`Width: ${width}mm`, sheetX + sheetWidth / 2, sheetY - 5)

    ctx.save()
    ctx.translate(sheetX - 10, sheetY + sheetHeight / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`Length: ${length}mm`, 0, 0)
    ctx.restore()

    // Draw fold lines
    foldLines.forEach((line) => {
      const y = sheetY + line.position * scale

      // Only draw if fold line is within sheet bounds
      if (y >= sheetY && y <= sheetY + sheetHeight) {
        // Draw fold line
        ctx.strokeStyle = dragging === line.id ? "#3b82f6" : "#ef4444"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(sheetX, y)
        ctx.lineTo(sheetX + sheetWidth, y)
        ctx.stroke()

        // Draw direction indicator
        const indicatorX = sheetX + 20
        const indicatorY = y
        const indicatorSize = 12

        ctx.fillStyle = line.direction === "up" ? "#10b981" : "#8b5cf6"
        ctx.strokeStyle = line.direction === "up" ? "#10b981" : "#8b5cf6"
        ctx.lineWidth = 2

        // Draw circle background
        ctx.beginPath()
        ctx.arc(indicatorX, indicatorY, indicatorSize, 0, Math.PI * 2)
        ctx.fillStyle = "#ffffff"
        ctx.fill()
        ctx.stroke()

        // Draw arrow
        ctx.fillStyle = line.direction === "up" ? "#10b981" : "#8b5cf6"
        ctx.font = "14px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(line.direction === "up" ? "↑" : "↓", indicatorX, indicatorY)

        // Draw position label
        const labelX = sheetX + sheetWidth - 50
        const labelY = y
        ctx.fillStyle = "#374151"
        ctx.fillRect(labelX, labelY - 8, 45, 16)
        ctx.fillStyle = "#ffffff"
        ctx.font = "10px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(`${line.position}mm`, labelX + 22, labelY)
      }
    })

    // Draw pan instructions
    ctx.fillStyle = "#6b7280"
    ctx.font = "11px Arial"
    ctx.textAlign = "left"
    ctx.fillText("Drag to pan • Click fold lines to move • Click arrows to change direction", 10, containerHeight - 10)
  }, [width, length, foldLines, scale, dragging, panOffset])

  // Redraw canvas when dependencies change
  useEffect(() => {
    if (mounted) {
      drawCanvas()
    }
  }, [drawCanvas, mounted])

  // Get cursor style based on interaction state
  const getCursorStyle = () => {
    if (panning) return "grabbing"
    if (dragging) return "ns-resize"
    return "grab"
  }

  // Convert page coordinates to canvas coordinates
  const getCanvasCoordinates = (pageX: number, pageY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: pageX - rect.left,
      y: pageY - rect.top,
    }
  }

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)

    const sheetX = 20 + panOffset.x
    const sheetY = 20 + panOffset.y
    const sheetWidth = width * scale
    const sheetHeight = length * scale

    // Check if click is on a fold line first
    let clickedOnFoldLine = false
    for (const line of foldLines) {
      const lineY = sheetY + line.position * scale
      if (Math.abs(y - lineY) < 10 && x >= sheetX && x <= sheetX + sheetWidth) {
        setDragging(line.id)
        clickedOnFoldLine = true
        break
      }
    }

    // If not clicking on fold line, start panning
    if (!clickedOnFoldLine) {
      setPanning(true)
      setLastPanPoint({ x, y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)

    if (dragging) {
      // Handle fold line dragging
      const sheetY = 20 + panOffset.y
      const newPosition = Math.max(0, Math.min(length, Math.round((y - sheetY) / scale)))

      const foldLine = foldLines.find((line) => line.id === dragging)
      if (foldLine) {
        updateFoldLine(dragging, newPosition, foldLine.direction)
      }
    } else if (panning) {
      // Handle panning
      const deltaX = x - lastPanPoint.x
      const deltaY = y - lastPanPoint.y

      setPanOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }))

      setLastPanPoint({ x, y })
    }
  }

  const handleMouseUp = () => {
    setDragging(null)
    setPanning(false)
  }

  // Handle click on direction indicator to toggle direction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging || panning) return

    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)

    const sheetX = 20 + panOffset.x
    const sheetY = 20 + panOffset.y

    // Check if click is on a direction indicator
    for (const line of foldLines) {
      const indicatorX = sheetX + 20
      const indicatorY = sheetY + line.position * scale
      const distance = Math.sqrt((x - indicatorX) ** 2 + (y - indicatorY) ** 2)

      if (distance <= 12) {
        const newDirection = line.direction === "up" ? "down" : "up"
        updateFoldLine(line.id, line.position, newDirection)
        break
      }
    }
  }

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.1, Math.min(2, scale + delta))
    setScale(newScale)
  }

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY)

    // Record touch start time and position for distinguishing between tap and drag
    setTouchStartTime(Date.now())
    setTouchStartPos({ x, y })
    setIsTouchDragging(false)

    const sheetX = 20 + panOffset.x
    const sheetY = 20 + panOffset.y
    const sheetWidth = width * scale
    const sheetHeight = length * scale

    // Check if touch is on a fold line first
    let touchedFoldLine = false
    for (const line of foldLines) {
      const lineY = sheetY + line.position * scale
      // Make touch target area larger on mobile
      if (Math.abs(y - lineY) < 15 && x >= sheetX && x <= sheetX + sheetWidth) {
        setDragging(line.id)
        touchedFoldLine = true
        break
      }
    }

    // If not touching a fold line, start panning
    if (!touchedFoldLine) {
      setPanning(true)
      setLastPanPoint({ x, y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY)

    // Calculate distance moved from touch start
    const dx = x - touchStartPos.x
    const dy = y - touchStartPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // If moved more than threshold, consider it a drag
    if (distance > 5) {
      setIsTouchDragging(true)
    }

    if (dragging) {
      // Handle fold line dragging
      const sheetY = 20 + panOffset.y
      const newPosition = Math.max(0, Math.min(length, Math.round((y - sheetY) / scale)))

      const foldLine = foldLines.find((line) => line.id === dragging)
      if (foldLine) {
        updateFoldLine(dragging, newPosition, foldLine.direction)
      }
    } else if (panning) {
      // Handle panning
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
    // If it was a short tap (not a drag) and not on a fold line
    const touchDuration = Date.now() - touchStartTime

    if (touchDuration < 300 && !isTouchDragging && !dragging) {
      // Handle tap on direction indicator
      const canvas = canvasRef.current
      if (!canvas) return

      const lastTouch = e.changedTouches[0]
      const { x, y } = getCanvasCoordinates(lastTouch.clientX, lastTouch.clientY)

      const sheetX = 20 + panOffset.x
      const sheetY = 20 + panOffset.y

      // Check if tap is on a direction indicator
      for (const line of foldLines) {
        const indicatorX = sheetX + 20
        const indicatorY = sheetY + line.position * scale
        const distance = Math.sqrt((x - indicatorX) ** 2 + (y - indicatorY) ** 2)

        if (distance <= 20) {
          // Larger touch target for mobile
          const newDirection = line.direction === "up" ? "down" : "up"
          updateFoldLine(line.id, line.position, newDirection)
          break
        }
      }
    }

    setDragging(null)
    setPanning(false)
    setIsTouchDragging(false)
  }

  if (!mounted) {
    return <div>Loading canvas...</div>
  }

  return (
    <div ref={containerRef} className="w-full h-full border border-gray-300 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  )
}
