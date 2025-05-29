"use client"

import { useEffect, useState } from "react"
import type { FoldLine } from "@/components/sheet-metal-designer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Trash } from "lucide-react"

interface FoldLinesListProps {
  foldLines: FoldLine[]
  sheetLength: number
  onAdd: () => void
  onUpdate: (id: string, position: number, direction: "up" | "down") => void
  onRemove: (id: string) => void
}

export function FoldLinesList({ foldLines, sheetLength, onAdd, onUpdate, onRemove }: FoldLinesListProps) {
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
          {foldLines.map((line) => (
            <div key={line.id} className="border rounded-lg p-3 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Fold Line</h4>
                <Button variant="ghost" size="icon" onClick={() => onRemove(line.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`position-${line.id}`}>Position (mm)</Label>
                <Input
                  id={`position-${line.id}`}
                  type="number"
                  value={line.position}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value)
                    if (!isNaN(value) && value >= 0 && value <= sheetLength) {
                      onUpdate(line.id, value, line.direction)
                    }
                  }}
                  min="0"
                  max={sheetLength}
                />
              </div>

              <div className="grid gap-2">
                <Label>Bend Direction</Label>
                <RadioGroup
                  value={line.direction}
                  onValueChange={(value) => onUpdate(line.id, line.position, value as "up" | "down")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="up" id={`direction-up-${line.id}`} />
                    <Label htmlFor={`direction-up-${line.id}`} className="cursor-pointer text-sm">
                      Up
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="down" id={`direction-down-${line.id}`} />
                    <Label htmlFor={`direction-down-${line.id}`} className="cursor-pointer text-sm">
                      Down
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
