# Sheet Metal Design Preview Tool

A web-based tool for designing and previewing sheet metal parts with fold lines. This application allows users to define a rectangular sheet, add fold lines at specific positions, preview the design, and export it in various formats.

## Features

### Core Features
- ✅ Define sheet dimensions (length & width in mm)
- ✅ Add, remove, and position fold lines
- ✅ Interactive visual preview of the sheet with fold lines
- ✅ Export designs as PNG, SVG, and DXF
- ✅ Save and load designs using local storage

### Advanced Features
- ✅ Drag-to-move fold lines
- ✅ Bend direction support (up/down)
- ✅ Zoom functionality
- ✅ Responsive design for desktop and mobile

## Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Setup Instructions

1. Clone the repository:
\`\`\`bash
git clone https://github.com/TalhaKazmi1/SheetMetalDesignTool.git
cd sheet-metal-tool
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage Guide

### Creating a New Design
1. Set the sheet dimensions using the width and length input fields
2. Click "Add Fold Line" to add a new fold line to your sheet
3. Adjust the position of fold lines by:
   - Dragging them directly on the preview
   - Using the position input field
4. Set the bend direction (up or down) for each fold line
5. Save your design with a custom name

### Managing Designs
- Click the save icon to save your current design
- Navigate to the "Saved" tab to view, load, or delete saved designs
- Click "Create New Design" to start a fresh design

### Exporting Designs
- Click "Export as PNG" to download a PNG image of your design
- Click "Export as SVG" to download an SVG vector file
- Click "Export as DXF" to download a DXF file for CAD software

### Zoom Controls
- Use the + and - buttons to zoom in and out of the design preview

## Technologies Used

- **Framework**: [Next.js](https://nextjs.org/) with App Router
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Toast Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Export Functionality**: 
  - [html-to-image](https://github.com/bubkoo/html-to-image) for PNG/SVG export
  - Custom DXF writer for CAD export
- **File Saving**: [file-saver](https://github.com/eligrey/FileSaver.js/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Project Structure

\`\`\`
sheet-metal-tool/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── fold-lines-list.tsx # Fold lines management UI
│   ├── saved-designs-list.tsx # Saved designs management
│   ├── sheet-canvas.tsx    # Interactive sheet preview
│   ├── sheet-metal-designer.tsx # Main application component
│   ├── sheet-metal-designer-wrapper.tsx # Client-side wrapper
│   ├── theme-provider.tsx  # Theme provider component
│   └── ui/                 # shadcn/ui components
├── lib/                    # Utility functions
│   └── dxf-writer.ts       # DXF export functionality
├── public/                 # Static assets
├── README.md               # Project documentation
└── package.json            # Project dependencies
\`\`\`

## Future Enhancements

- 3D preview of the folded sheet metal
- Support for bend angles
- Material thickness configuration
- Multi-user collaboration
- Measurement tools

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for the styling system

---

Created with ❤️ by Talha Kazmi
