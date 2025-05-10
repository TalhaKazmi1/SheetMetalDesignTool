"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import type { FoldLine } from "@/components/sheet-metal-designer"

interface SheetCanvasProps {
  width: number
  length: number
  foldLines: FoldLine[]
  updateFoldLine: (id: string, position: number, direction: "up" | "down") => void
}

export function SheetCanvas({ width, length, foldLines, updateFoldLine }: SheetCanvasProps) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate scale to fit the sheet in the viewport
  useEffect(() => {
    if (containerRef.current) {
      const parentWidth = containerRef.current.parentElement?.clientWidth || 800
      const scaleFactor = Math.min(1, (parentWidth - 40) / width)
      setScale(scaleFactor)
    }
  }, [width, containerRef])

  // Handle mouse down on a fold line
  const handleMouseDown = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(id)
  }

  // Handle mouse move for dragging fold lines
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    // Calculate position relative to the container, accounting for padding
    const relativeY = (e.clientY - rect.top - 20) / scale

    // Ensure the fold line stays within the sheet boundaries
    const newPosition = Math.max(0, Math.min(length, Math.round(relativeY)))

    const foldLine = foldLines.find((line) => line.id === dragging)
    if (foldLine) {
      updateFoldLine(dragging, newPosition, foldLine.direction)
    }
  }

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setDragging(null)
  }

  // Handle touch events for mobile support
  const handleTouchStart = (id: string) => (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(id)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging || !containerRef.current || e.touches.length === 0) return

    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const relativeY = (touch.clientY - rect.top - 20) / scale

    const newPosition = Math.max(0, Math.min(length, Math.round(relativeY)))

    const foldLine = foldLines.find((line) => line.id === dragging)
    if (foldLine) {
      updateFoldLine(dragging, newPosition, foldLine.direction)
    }
  }

  const handleTouchEnd = () => {
    setDragging(null)
  }

  // Toggle fold direction
  const toggleDirection = (id: string) => {
    const foldLine = foldLines.find((line) => line.id === id)
    if (foldLine) {
      updateFoldLine(id, foldLine.position, foldLine.direction === "up" ? "down" : "up")
    }
  }

  if (!mounted) {
    return <div>Loading canvas...</div>
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-14 my-5 cursor-grab"
      style={{
        width: `${width * scale}px`,
        height: `${length * scale}px`,
        padding: "20px",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sheet metal */}
      <div
        className="bg-gray-100 border border-gray-300"
        style={{
          width: `${width * scale}px`,
          height: `${length * scale}px`,
          position: "relative",
        }}
      >
        {/* Fold lines */}
        {foldLines.map((line) => (
          <div key={line.id} className="relative">
            {/* Fold line */}
            <div
              className={`absolute left-0 w-full h-[3px] ${dragging === line.id ? "bg-blue-500" : "bg-red-500"} cursor-ns-resize`}
              style={{
                top: `${line.position * scale}px`,
                zIndex: 10,
              }}
              onMouseDown={handleMouseDown(line.id)}
              onTouchStart={handleTouchStart(line.id)}
            />

            {/* Fold direction indicator */}
            <div
              className={`absolute left-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer bg-white border ${line.direction === "up" ? "border-green-500" : "border-purple-500"}`}
              style={{
                top: `${line.position * scale - 12}px`,
                zIndex: 20,
              }}
              onClick={() => toggleDirection(line.id)}
            >
              <span className={line.direction === "up" ? "text-green-500" : "text-purple-500"}>
                {line.direction === "up" ? "↑" : "↓"}
              </span>
            </div>

            {/* Position label */}
            <div
              className="absolute right-1 bg-white text-xs px-1 rounded border border-gray-300"
              style={{
                top: `${line.position * scale - 8}px`,
                zIndex: 20,
              }}
            >
              {line.position}mm
            </div>
          </div>
        ))}

        {/* Dimensions labels */}
        <div className="absolute -top-6 left-0 w-full flex justify-center text-xs">Width: {width}mm</div>
        <div
          className="absolute top-0 -left-6 h-full flex items-center text-xs"
          style={{ transform: "rotate(-90deg)", transformOrigin: "left center" }}
        >
          Length: {length}mm
        </div>
      </div>
    </div>
  )
}
