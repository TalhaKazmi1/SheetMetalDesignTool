"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Save, ZoomIn, ZoomOut } from "lucide-react"
import { toPng, toSvg } from "html-to-image"
import { saveAs } from "file-saver"
import { toast } from "sonner"
import { writeDxf } from "@/lib/dxf-writer"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SheetCanvas } from "@/components/sheet-canvas"
// import { FoldLinesList } from "@/components/fold-lines-list"
import { SavedDesignsList } from "@/components/saved-designs-list"
import { FoldLinesList } from "./fold-line-list"

// Dynamically import the 3D preview component with no SSR
const SheetMetal3DPreview = dynamic(
  () => import("@/components/sheet-metal-3d-preview").then((mod) => mod.SheetMetal3DPreview),
  { ssr: false },
)

export interface FoldLine {
  id: string
  position: number
  direction: "up" | "down"
}

export interface SheetDesign {
  id: string
  name: string
  width: number
  length: number
  foldLines: FoldLine[]
}

const DEFAULT_DESIGN: SheetDesign = {
  id: "default",
  name: "New Design",
  width: 300,
  length: 300,
  foldLines: [],
}

export function SheetMetalDesigner() {
  const [design, setDesign] = useState<SheetDesign>({ ...DEFAULT_DESIGN })
  const [designName, setDesignName] = useState("New Design")
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Only run after component is mounted
  useEffect(() => {
    setMounted(true)

    // Load saved designs from local storage
    const savedDesign = localStorage.getItem("currentDesign")
    if (savedDesign) {
      try {
        const parsed = JSON.parse(savedDesign)
        setDesign(parsed)
        setDesignName(parsed.name)
      } catch (e) {
        console.error("Failed to load saved design", e)
      }
    }
  }, [])

  // If not mounted yet, show a simple loading state
  if (!mounted) {
    return <div className="p-4 text-center">Loading designer...</div>
  }

  // Update dimensions
  const updateDimensions = (field: "width" | "length", value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      setDesign((prev) => ({ ...prev, [field]: numValue }))
    }
  }

  // Add a new fold line
  const addFoldLine = () => {
    const newPosition = Math.round(design.length / 2)
    const newFoldLine: FoldLine = {
      id: `fold-${Math.random().toString(36).substring(2, 9)}`,
      position: newPosition,
      direction: "up",
    }
    setDesign((prev) => ({
      ...prev,
      foldLines: [...prev.foldLines, newFoldLine],
    }))
  }

  // Update a fold line
  const updateFoldLine = (id: string, position: number, direction: "up" | "down") => {
    setDesign((prev) => ({
      ...prev,
      foldLines: prev.foldLines.map((line) => (line.id === id ? { ...line, position, direction } : line)),
    }))
  }

  // Remove a fold line
  const removeFoldLine = (id: string) => {
    setDesign((prev) => ({
      ...prev,
      foldLines: prev.foldLines.filter((line) => line.id !== id),
    }))
  }

  // Save the current design to local storage
  const saveDesign = () => {
    const newId = design.id === "default" ? `design-${Math.random().toString(36).substring(2, 9)}` : design.id
    const designToSave = { ...design, id: newId, name: designName }

    setDesign(designToSave)

    // Save to localStorage
    localStorage.setItem("currentDesign", JSON.stringify(designToSave))

    // Save to designs list
    const savedDesigns = JSON.parse(localStorage.getItem("savedDesigns") || "[]")
    const existingIndex = savedDesigns.findIndex((d: SheetDesign) => d.id === designToSave.id)

    if (existingIndex >= 0) {
      savedDesigns[existingIndex] = designToSave
    } else {
      savedDesigns.push(designToSave)
    }

    localStorage.setItem("savedDesigns", JSON.stringify(savedDesigns))

    toast.success("Design Saved", {
      description: `"${designName}" has been saved successfully.`,
    })
  }

  // Load a design
  const loadDesign = (designToLoad: SheetDesign) => {
    setDesign(designToLoad)
    setDesignName(designToLoad.name)
    localStorage.setItem("currentDesign", JSON.stringify(designToLoad))
  }

  // Create a new design
  const newDesign = () => {
    setDesign({ ...DEFAULT_DESIGN, id: `design-${Math.random().toString(36).substring(2, 9)}` })
    setDesignName("New Design")
  }

  // Export as PNG
  const exportAsPng = async () => {
    if (!canvasRef.current) return

    try {
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      })
      saveAs(dataUrl, `${designName.replace(/\s+/g, "-")}.png`)

      toast.success("Export Successful", {
        description: "Design exported as PNG.",
      })
    } catch (error) {
      console.error("Export failed", error)
      toast.error("Export Failed", {
        description: "Failed to export as PNG. Please try again.",
      })
    }
  }

  // Export as SVG
  const exportAsSvg = async () => {
    if (!canvasRef.current) return

    try {
      const dataUrl = await toSvg(canvasRef.current, {
        backgroundColor: "#ffffff",
      })
      saveAs(dataUrl, `${designName.replace(/\s+/g, "-")}.svg`)

      toast.success("Export Successful", {
        description: "Design exported as SVG.",
      })
    } catch (error) {
      console.error("Export failed", error)
      toast.error("Export Failed", {
        description: "Failed to export as SVG. Please try again.",
      })
    }
  }

  // Export as DXF
  const exportAsDxf = () => {
    try {
      const dxfContent = writeDxf(design)
      const blob = new Blob([dxfContent], { type: "application/dxf" })
      saveAs(blob, `${designName.replace(/\s+/g, "-")}.dxf`)

      toast.success("Export Successful", {
        description: "Design exported as DXF.",
      })
    } catch (error) {
      console.error("DXF export failed", error)
      toast.error("Export Failed", {
        description: "Failed to export as DXF. Please try again.",
      })
    }
  }

  // Zoom controls
  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2))
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col">
        <Card className="mb-4 flex-grow">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Input
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className="max-w-[200px]"
                  placeholder="Design Name"
                />
                <Button variant="outline" size="icon" onClick={saveDesign}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow">
              <div
                className="lg:col-span-2"
                ref={canvasRef}
                style={{ height: "calc(100vh - 300px)", maxHeight: "400px" }}
              >
                <div className="bg-white border rounded-lg overflow-auto h-full">
                  <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                    <SheetCanvas
                      width={design.width}
                      length={design.length}
                      foldLines={design.foldLines}
                      updateFoldLine={updateFoldLine}
                    />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1 h-full">
                <div className="bg-white border rounded-lg overflow-hidden h-full">
                  {mounted && (
                    <SheetMetal3DPreview width={design.width} length={design.length} foldLines={design.foldLines} />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={exportAsPng}>
            <Download className="mr-2 h-4 w-4" />
            Export as PNG
          </Button>
          <Button onClick={exportAsSvg} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export as SVG
          </Button>
          <Button onClick={exportAsDxf} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export as DXF
          </Button>
        </div>
      </div>
      <div>
        <Tabs defaultValue="dimensions">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
            <TabsTrigger value="folds">Fold Lines</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
          <TabsContent value="dimensions">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="width">Width (mm)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={design.width}
                    onChange={(e) => updateDimensions("width", e.target.value)}
                    min="10"
                    max="2000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="length">Length (mm)</Label>
                  <Input
                    id="length"
                    type="number"
                    value={design.length}
                    onChange={(e) => updateDimensions("length", e.target.value)}
                    min="10"
                    max="2000"
                  />
                </div>
                <Button onClick={newDesign} variant="outline" className="w-full">
                  Create New Design
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="folds">
            <Card>
              <CardContent className="pt-6">
                <FoldLinesList
                  foldLines={design.foldLines}
                  sheetLength={design.length}
                  onAdd={addFoldLine}
                  onUpdate={updateFoldLine}
                  onRemove={removeFoldLine}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="saved">
            <Card>
              <CardContent className="pt-6">
                <SavedDesignsList onLoad={loadDesign} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
