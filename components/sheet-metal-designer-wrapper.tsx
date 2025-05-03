"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

// Import the SheetMetalDesigner component with { ssr: false } to disable server-side rendering
const SheetMetalDesigner = dynamic(
  () => import("@/components/sheet-metal-designer").then((mod) => mod.SheetMetalDesigner),
  { ssr: false },
)

export function SheetMetalDesignerWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading designer...</div>}>
      <SheetMetalDesigner />
    </Suspense>
  )
}
