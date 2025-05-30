"use client"

import { useEffect, useState } from "react"
import type { FoldLine } from "@/components/sheet-metal-designer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash } from "lucide-react"

interface FoldLinesListProps {
  foldLines: FoldLine[]
  sheetWidth: number
  sheetLength: number
  onAdd: () => void
  onUpdate: (
    id: string,
    startPoint?: { x: number; y: number },
    endPoint?: { x: number; y: number },
    direction?: "up" | "down",
  ) => void
  onRemove: (id: string) => void
}

export function FoldLinesList({ foldLines, sheetWidth, sheetLength, onAdd, onUpdate, onRemove }: FoldLinesListProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading fold lines...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Fold Lines</h3>
        <Button onClick={onAdd} size="sm" id="add-fold-line-btn">
          Add Fold Line
        </Button>
      </div>

      {foldLines.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          No fold lines added yet. Click the button above to add one.
        </div>
      ) : (
        <div className="space-y-4">
          {foldLines.map((line, index) => (
            <div key={line.id} className="border rounded-lg p-3 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Fold Line {index + 1}</h4>
                <Button variant="ghost" size="icon" onClick={() => onRemove(line.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>

              {/* Start Point */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`start-x-${line.id}`}>Start X (mm)</Label>
                  <Input
                    id={`start-x-${line.id}`}
                    type="number"
                    value={line.startPoint.x}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (!isNaN(value) && value >= 0 && value <= sheetWidth) {
                        onUpdate(line.id, { x: value, y: line.startPoint.y })
                      }
                    }}
                    min="0"
                    max={sheetWidth}
                  />
                </div>
                <div>
                  <Label htmlFor={`start-y-${line.id}`}>Start Y (mm)</Label>
                  <Input
                    id={`start-y-${line.id}`}
                    type="number"
                    value={line.startPoint.y}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (!isNaN(value) && value >= 0 && value <= sheetLength) {
                        onUpdate(line.id, { x: line.startPoint.x, y: value })
                      }
                    }}
                    min="0"
                    max={sheetLength}
                  />
                </div>
              </div>

              {/* End Point */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`end-x-${line.id}`}>End X (mm)</Label>
                  <Input
                    id={`end-x-${line.id}`}
                    type="number"
                    value={line.endPoint.x}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (!isNaN(value) && value >= 0 && value <= sheetWidth) {
                        onUpdate(line.id, undefined, { x: value, y: line.endPoint.y })
                      }
                    }}
                    min="0"
                    max={sheetWidth}
                  />
                </div>
                <div>
                  <Label htmlFor={`end-y-${line.id}`}>End Y (mm)</Label>
                  <Input
                    id={`end-y-${line.id}`}
                    type="number"
                    value={line.endPoint.y}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (!isNaN(value) && value >= 0 && value <= sheetLength) {
                        onUpdate(line.id, undefined, { x: line.endPoint.x, y: value })
                      }
                    }}
                    min="0"
                    max={sheetLength}
                  />
                </div>
              </div>

              {/* Bend Direction */}
              <div className="grid gap-2">
                <Label>Bend Direction</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`direction-up-${line.id}`}
                      name={`direction-${line.id}`}
                      value="up"
                      checked={line.direction === "up"}
                      onChange={() => onUpdate(line.id, undefined, undefined, "up")}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <Label htmlFor={`direction-up-${line.id}`} className="cursor-pointer text-sm">
                      Up
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`direction-down-${line.id}`}
                      name={`direction-${line.id}`}
                      value="down"
                      checked={line.direction === "down"}
                      onChange={() => onUpdate(line.id, undefined, undefined, "down")}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <Label htmlFor={`direction-down-${line.id}`} className="cursor-pointer text-sm">
                      Down
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
