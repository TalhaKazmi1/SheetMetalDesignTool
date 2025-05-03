import type { SheetDesign } from "@/components/sheet-metal-designer"

// Simple DXF writer implementation
export function writeDxf(design: SheetDesign): string {
  const { width, length, foldLines } = design

  // DXF header
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1021
0
ENDSEC
0
SECTION
2
ENTITIES
`

  // Add rectangle (sheet metal outline)
  dxf += `0
POLYLINE
8
0
66
1
0
VERTEX
8
0
10
0
20
0
0
VERTEX
8
0
10
${width}
20
0
0
VERTEX
8
0
10
${width}
20
${length}
0
VERTEX
8
0
10
0
20
${length}
0
VERTEX
8
0
10
0
20
0
0
SEQEND
`

  // Add fold lines
  foldLines.forEach((line) => {
    dxf += `0
LINE
8
1
10
0
20
${line.position}
11
${width}
21
${line.position}
`

    // Add direction indicator (small line perpendicular to fold line)
    const indicatorLength = 10
    const yOffset = line.direction === "up" ? -indicatorLength : indicatorLength

    dxf += `0
LINE
8
2
10
${width / 2}
20
${line.position}
11
${width / 2}
21
${line.position + yOffset}
`
  })

  // DXF footer
  dxf += `0
ENDSEC
0
SECTION
2
OBJECTS
0
ENDSEC
0
EOF
`

  return dxf
}
