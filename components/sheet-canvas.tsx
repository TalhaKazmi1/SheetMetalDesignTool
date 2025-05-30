"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import type { FoldLine } from "@/components/sheet-metal-designer"

interface SheetCanvasProps {
  width: number
  length: number
  foldLines: FoldLine[]
  updateFoldLine: (
    id: string,
    startPoint?: { x: number; y: number },
    endPoint?: { x: number; y: number },
    direction?: "up" | "down",
  ) => void
}

export function SheetCanvas({ width, length, foldLines, updateFoldLine }: SheetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<{ lineId: string; point: "start" | "end" } | null>(null)
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

    // Highlight sheet border when dragging
    if (dragging) {
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.strokeRect(sheetX, sheetY, sheetWidth, sheetHeight)
      ctx.setLineDash([])
    }

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
      // Convert fold line coordinates to canvas coordinates
      const startX = sheetX + (line.startPoint.x / width) * sheetWidth
      const startY = sheetY + (line.startPoint.y / length) * sheetHeight
      const endX = sheetX + (line.endPoint.x / width) * sheetWidth
      const endY = sheetY + (line.endPoint.y / length) * sheetHeight

      // Check if fold line is within sheet bounds
      if (
        startX >= sheetX &&
        startX <= sheetX + sheetWidth &&
        startY >= sheetY &&
        startY <= sheetY + sheetHeight &&
        endX >= sheetX &&
        endX <= sheetX + sheetWidth &&
        endY >= sheetY &&
        endY <= sheetY + sheetHeight
      ) {
        // Draw fold line
        const isDraggingThis = dragging?.lineId === line.id
        ctx.strokeStyle = isDraggingThis ? "#3b82f6" : "#ef4444"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Draw start point handle
        const startPointSize = 8
        ctx.fillStyle = dragging?.lineId === line.id && dragging?.point === "start" ? "#3b82f6" : "#10b981"
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(startX, startY, startPointSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Draw end point handle
        const endPointSize = 8
        ctx.fillStyle = dragging?.lineId === line.id && dragging?.point === "end" ? "#3b82f6" : "#8b5cf6"
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(endX, endY, endPointSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Draw direction indicator at the middle of the line
        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2
        const indicatorSize = 12

        ctx.fillStyle = line.direction === "up" ? "#10b981" : "#8b5cf6"
        ctx.strokeStyle = line.direction === "up" ? "#10b981" : "#8b5cf6"
        ctx.lineWidth = 2

        // Draw circle background
        ctx.beginPath()
        ctx.arc(midX, midY, indicatorSize, 0, Math.PI * 2)
        ctx.fillStyle = "#ffffff"
        ctx.fill()
        ctx.stroke()

        // Draw arrow
        ctx.fillStyle = line.direction === "up" ? "#10b981" : "#8b5cf6"
        ctx.font = "14px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(line.direction === "up" ? "↑" : "↓", midX, midY)

        // Draw coordinate labels
        ctx.fillStyle = "#374151"
        ctx.font = "10px Arial"
        ctx.textAlign = "left"
        ctx.fillText(`(${line.startPoint.x}, ${line.startPoint.y})`, startX + 10, startY - 5)
        ctx.fillText(`(${line.endPoint.x}, ${line.endPoint.y})`, endX + 10, endY - 5)
      }
    })

    // Draw instructions
    ctx.fillStyle = "#6b7280"
    ctx.font = "11px Arial"
    ctx.textAlign = "left"
    ctx.fillText(
      "Drag green/purple circles to move fold line points • Click arrow to change direction",
      10,
      containerHeight - 10,
    )
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
    if (dragging) return "move"
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

  // Convert canvas coordinates to sheet coordinates with border constraint
  const canvasToSheetCoordinates = (canvasX: number, canvasY: number) => {
    const sheetX = 20 + panOffset.x
    const sheetY = 20 + panOffset.y
    const sheetWidth = width * scale
    const sheetHeight = length * scale

    const relativeX = (canvasX - sheetX) / sheetWidth
    const relativeY = (canvasY - sheetY) / sheetHeight

    // Convert to sheet coordinates
    const x = relativeX * width
    const y = relativeY * length

    // BORDER CONSTRAINT: Snap to nearest edge
    // Calculate distances to each edge
    const distToLeft = Math.abs(x - 0)
    const distToRight = Math.abs(x - width)
    const distToTop = Math.abs(y - 0)
    const distToBottom = Math.abs(y - length)

    // Find the minimum distance to any edge
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom)

    let constrainedX = x
    let constrainedY = y

    // Snap to the nearest edge
    if (minDist === distToLeft) {
      // Snap to left edge
      constrainedX = 0
      constrainedY = Math.max(0, Math.min(length, y))
    } else if (minDist === distToRight) {
      // Snap to right edge
      constrainedX = width
      constrainedY = Math.max(0, Math.min(length, y))
    } else if (minDist === distToTop) {
      // Snap to top edge
      constrainedX = Math.max(0, Math.min(width, x))
      constrainedY = 0
    } else if (minDist === distToBottom) {
      // Snap to bottom edge
      constrainedX = Math.max(0, Math.min(width, x))
      constrainedY = length
    }

    return {
      x: Math.round(constrainedX),
      y: Math.round(constrainedY),
    }
  }

  // Check if point is on a fold line point
  const getFoldLinePointAtPosition = (x: number, y: number) => {
    const sheetX = 20 + panOffset.x
    const sheetY = 20 + panOffset.y
    const sheetWidth = width * scale
    const sheetHeight = length * scale

    for (const line of foldLines) {
      // Check start point
      const startX = sheetX + (line.startPoint.x / width) * sheetWidth
      const startY = sheetY + (line.startPoint.y / length) * sheetHeight
      const startDistance = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2)

      if (startDistance <= 12) {
        return { lineId: line.id, point: "start" as const }
      }

      // Check end point
      const endX = sheetX + (line.endPoint.x / width) * sheetWidth
      const endY = sheetY + (line.endPoint.y / length) * sheetHeight
      const endDistance = Math.sqrt((x - endX) ** 2 + (y - endY) ** 2)

      if (endDistance <= 12) {
        return { lineId: line.id, point: "end" as const }
      }
    }
    return null
  }

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)

    // Check if click is on a fold line point first
    const foldLinePoint = getFoldLinePointAtPosition(x, y)
    if (foldLinePoint) {
      setDragging(foldLinePoint)
    } else {
      // If not clicking on fold line point, start panning
      setPanning(true)
      setLastPanPoint({ x, y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)

    if (dragging) {
      // Handle fold line point dragging with border constraint
      const sheetCoords = canvasToSheetCoordinates(x, y)

      if (dragging.point === "start") {
        updateFoldLine(dragging.lineId, sheetCoords)
      } else {
        updateFoldLine(dragging.lineId, undefined, sheetCoords)
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
    const sheetWidth = width * scale
    const sheetHeight = length * scale

    // Check if click is on a direction indicator
    for (const line of foldLines) {
      const startX = sheetX + (line.startPoint.x / width) * sheetWidth
      const startY = sheetY + (line.startPoint.y / length) * sheetHeight
      const endX = sheetX + (line.endPoint.x / width) * sheetWidth
      const endY = sheetY + (line.endPoint.y / length) * sheetHeight

      const midX = (startX + endX) / 2
      const midY = (startY + endY) / 2
      const distance = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2)

      if (distance <= 12) {
        const newDirection = line.direction === "up" ? "down" : "up"
        updateFoldLine(line.id, undefined, undefined, newDirection)
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
    e.preventDefault()
    e.stopPropagation()

    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY)

    setTouchStartTime(Date.now())
    setTouchStartPos({ x, y })
    setIsTouchDragging(false)

    // Check if touch is on a fold line point first
    const foldLinePoint = getFoldLinePointAtPosition(x, y)
    if (foldLinePoint) {
      setDragging(foldLinePoint)
    } else {
      setPanning(true)
      setLastPanPoint({ x, y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (dragging || panning) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY)

    const dx = x - touchStartPos.x
    const dy = y - touchStartPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 5) {
      setIsTouchDragging(true)
    }

    if (dragging) {
      e.preventDefault()
      e.stopPropagation()

      // Handle fold line point dragging with border constraint
      const sheetCoords = canvasToSheetCoordinates(x, y)

      if (dragging.point === "start") {
        updateFoldLine(dragging.lineId, sheetCoords)
      } else {
        updateFoldLine(dragging.lineId, undefined, sheetCoords)
      }
    } else if (panning && isTouchDragging) {
      e.preventDefault()
      e.stopPropagation()

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
    if (dragging || (panning && isTouchDragging)) {
      e.preventDefault()
      e.stopPropagation()
    }

    const touchDuration = Date.now() - touchStartTime

    if (touchDuration < 300 && !isTouchDragging && !dragging) {
      // Handle tap on direction indicator
      const canvas = canvasRef.current
      if (!canvas) return

      const lastTouch = e.changedTouches[0]
      const { x, y } = getCanvasCoordinates(lastTouch.clientX, lastTouch.clientY)

      const sheetX = 20 + panOffset.x
      const sheetY = 20 + panOffset.y
      const sheetWidth = width * scale
      const sheetHeight = length * scale

      for (const line of foldLines) {
        const startX = sheetX + (line.startPoint.x / width) * sheetWidth
        const startY = sheetY + (line.startPoint.y / length) * sheetHeight
        const endX = sheetX + (line.endPoint.x / width) * sheetWidth
        const endY = sheetY + (line.endPoint.y / length) * sheetHeight

        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2
        const distance = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2)

        if (distance <= 20) {
          e.preventDefault()
          e.stopPropagation()

          const newDirection = line.direction === "up" ? "down" : "up"
          updateFoldLine(line.id, undefined, undefined, newDirection)
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
        style={{
          cursor: getCursorStyle(),
          touchAction: "none",
        }}
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
