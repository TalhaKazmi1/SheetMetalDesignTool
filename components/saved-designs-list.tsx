"use client"

import { useEffect, useState } from "react"
import { Trash } from "lucide-react"
import { toast } from "sonner"
import type { SheetDesign } from "@/components/sheet-metal-designer"
import { Button } from "@/components/ui/button"

interface SavedDesignsListProps {
  onLoad: (design: SheetDesign) => void
}

export function SavedDesignsList({ onLoad }: SavedDesignsListProps) {
  const [savedDesigns, setSavedDesigns] = useState<SheetDesign[]>([])
  const [mounted, setMounted] = useState(false)

  // Load saved designs from local storage
  useEffect(() => {
    setMounted(true)
    const designs = localStorage.getItem("savedDesigns")
    if (designs) {
      try {
        setSavedDesigns(JSON.parse(designs))
      } catch (e) {
        console.error("Failed to load saved designs", e)
      }
    }
  }, [])

  // Delete a saved design
  const deleteDesign = (id: string) => {
    const updatedDesigns = savedDesigns.filter((design) => design.id !== id)
    setSavedDesigns(updatedDesigns)
    localStorage.setItem("savedDesigns", JSON.stringify(updatedDesigns))

    toast.success("Design Deleted", {
      description: "The design has been removed from your saved designs.",
    })
  }

  if (!mounted) {
    return <div>Loading saved designs...</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Saved Designs</h3>

      {savedDesigns.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          No saved designs found. Save a design to see it here.
        </div>
      ) : (
        <div className="space-y-2">
          {savedDesigns.map((design) => (
            <div key={design.id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <h4 className="font-medium">{design.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {design.width}mm × {design.length}mm • {design.foldLines.length} fold lines
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onLoad(design)}>
                  Load
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteDesign(design.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
