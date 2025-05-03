// import { SheetMetalDesignerWrapper } from "@/components/sheet-metal-designer-wrapper"

import { SheetMetalDesignerWrapper } from "@/components/sheet-metal-designer-wrapper";

export default function Home() {
  return (
    <main className="container mx-auto py-4 px-4">
      <h1 className="text-3xl font-bold mb-6">Sheet Metal Design Preview Tool</h1>
      <SheetMetalDesignerWrapper />
    </main>
  )
}
