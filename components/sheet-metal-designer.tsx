"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Save } from "lucide-react"
import { toPng, toSvg } from "html-to-image"
import { saveAs } from "file-saver"
import { toast } from "sonner"
import { writeDxf } from "@/lib/dxf-writer"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SheetCanvas } from "@/components/sheet-canvas"
import { SheetMetal3DCanvas } from "@/components/sheet-metal-3d-canvas"
// import { FoldLinesList } from "@/components/fold-lines-list"
import { SavedDesignsList } from "@/components/saved-designs-list"
import { FoldLinesList } from "./fold-line-list"

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
  length: 200,
  foldLines: [],
}

export function SheetMetalDesigner() {
  const [design, setDesign] = useState<SheetDesign>({ ...DEFAULT_DESIGN })
  const [designName, setDesignName] = useState("New Design")
  const sheetCanvasRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

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

  if (!mounted) {
    return <div className="p-4 text-center">Loading designer...</div>
  }

  const updateDimensions = (field: "width" | "length", value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      setDesign((prev) => ({ ...prev, [field]: numValue }))
    }
  }

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

  const updateFoldLine = (id: string, position: number, direction: "up" | "down") => {
    setDesign((prev) => ({
      ...prev,
      foldLines: prev.foldLines.map((line) => (line.id === id ? { ...line, position, direction } : line)),
    }))
  }

  const removeFoldLine = (id: string) => {
    setDesign((prev) => ({
      ...prev,
      foldLines: prev.foldLines.filter((line) => line.id !== id),
    }))
  }

  const saveDesign = () => {
    const newId = design.id === "default" ? `design-${Math.random().toString(36).substring(2, 9)}` : design.id
    const designToSave = { ...design, id: newId, name: designName }

    setDesign(designToSave)

    localStorage.setItem("currentDesign", JSON.stringify(designToSave))

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

  const loadDesign = (designToLoad: SheetDesign) => {
    setDesign(designToLoad)
    setDesignName(designToLoad.name)
    localStorage.setItem("currentDesign", JSON.stringify(designToLoad))
  }

  const newDesign = () => {
    setDesign({ ...DEFAULT_DESIGN, id: `design-${Math.random().toString(36).substring(2, 9)}` })
    setDesignName("New Design")
  }

  // Export 3D preview as PNG
  const exportAsPng = async () => {
    if (!previewCanvasRef.current) return

    try {
      const dataUrl = await toPng(previewCanvasRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      })
      saveAs(dataUrl, `${designName.replace(/\s+/g, "-")}-3d.png`)

      toast.success("Export Successful", {
        description: "3D Preview exported as PNG.",
      })
    } catch (error) {
      console.error("Export failed", error)
      toast.error("Export Failed", {
        description: "Failed to export as PNG. Please try again.",
      })
    }
  }

  // Export 3D preview as SVG
  const exportAsSvg = async () => {
    if (!previewCanvasRef.current) return

    try {
      const dataUrl = await toSvg(previewCanvasRef.current, {
        backgroundColor: "#ffffff",
      })
      saveAs(dataUrl, `${designName.replace(/\s+/g, "-")}-3d.svg`)

      toast.success("Export Successful", {
        description: "3D Preview exported as SVG.",
      })
    } catch (error) {
      console.error("Export failed", error)
      toast.error("Export Failed", {
        description: "Failed to export as SVG. Please try again.",
      })
    }
  }

  // Export as DXF (still using the 2D sheet data)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        {/* Mobile: Controls at top, Desktop: Normal layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4">
          {/* Controls Section */}
          <div className="lg:col-span-1 order-1 lg:order-2">
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

          {/* Main Canvas Section */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <Card>
              <CardContent className="p-4">
                {/* Header */}
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
                </div>

                {/* Canvas Grid - Fixed Height */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 2D Sheet Canvas */}
                  <div ref={sheetCanvasRef}>
                    <h3 className="text-sm font-medium mb-2">2D Sheet View</h3>
                    <div className="h-64 md:h-80">
                      <SheetCanvas
                        width={design.width}
                        length={design.length}
                        foldLines={design.foldLines}
                        updateFoldLine={updateFoldLine}
                      />
                    </div>
                  </div>

                  {/* 3D Preview Canvas */}
                  <div ref={previewCanvasRef}>
                    <h3 className="text-sm font-medium mb-2">3D Preview</h3>
                    <div className="h-64 md:h-80">
                      <SheetMetal3DCanvas width={design.width} length={design.length} foldLines={design.foldLines} />
                    </div>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={exportAsPng} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export 3D as PNG
                  </Button>
                  <Button onClick={exportAsSvg} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export 3D as SVG
                  </Button>
                  <Button onClick={exportAsDxf} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export as DXF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
