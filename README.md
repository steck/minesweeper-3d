# Surface — 3D Minesweeper

A React and TypeScript game with a lightweight Canvas perspective renderer. Run `npm install` and `npm run dev`, then open http://localhost:3000.

- Torus: 24 × 12 quadrilateral cells, periodic in both directions.
- Icosahedron: each of 20 faces subdivided into 16 equilateral triangles (320 cells).
- Cells sharing a vertex are neighbors. Adjacency is deduplicated across all seams.
- The first reveal and its neighborhood are safe. Empty regions flood open. Reveal every non-mine cell to win.
- Left click reveals, right click toggles flags, drag rotates, wheel zooms. Arrow keys rotate and +/− zoom. Flag mode supports touch interaction.

Geometry and game state live in `lib/game.ts`; new surfaces can supply polygons to the shared adjacency builder. Rendering and pointer controls are in `app/page.tsx`.

Validation: `node --experimental-strip-types --test lib/game.test.ts`, `npx tsc --noEmit`, and `npm run build`.

Optional WebMCP tools expose visible board state and cell actions in supporting browsers. Native WebMCP validation was unavailable in the development environment.
