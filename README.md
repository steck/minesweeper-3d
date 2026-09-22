# Surface — 3D Minesweeper

## Publish to GitHub Pages

1. In the GitHub repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Commit and push the included `.github/workflows/deploy-pages.yml` and static build files to `master`.
3. Open **Actions → Deploy game to GitHub Pages** to follow progress. A successful deployment serves the game at https://steck.github.io/minesweeper-3d/.

Every subsequent push to `master` runs tests, builds the game, and publishes it automatically. You can also select **Run workflow** in Actions. No personal access token or repository secret is needed: the workflow uses GitHub's built-in deployment permissions.

`npm run build:pages` produces the static website in `dist-pages`. The Pages-specific entry point reuses the same game component and styles. Its base path is set in `vite.pages.config.ts`; update that if you rename the repository. The existing `npm run dev` local preview still works.

A React and TypeScript game with a lightweight Canvas perspective renderer. Run `npm install` and `npm run dev`, then open http://localhost:3000.

- Torus: 24 × 12 quadrilateral cells, periodic in both directions.
- Icosahedron: each of 20 faces subdivided into 16 equilateral triangles (320 cells).
- Heart: a closed, symmetric gem with 86 triangles and 94 quadrilaterals (180 cells). Evenly spaced face cells meet a continuous, two-row rectangular belt. Cell surface areas vary by less than 2.8×.
- Cells sharing a vertex are neighbors. Adjacency is deduplicated across all seams.
- The first reveal and its neighborhood are safe. Empty regions flood open. Reveal every non-mine cell to win.
- Left click reveals, right click toggles flags, drag rotates, wheel zooms. Arrow keys rotate and +/− zoom. Flag mode supports touch interaction.

Geometry and game state live in `lib/game.ts`; new surfaces can supply polygons to the shared adjacency builder. Rendering and pointer controls are in `app/page.tsx`.

Validation: `node --experimental-strip-types --test lib/game.test.ts`, `npx tsc --noEmit`, and `npm run build`.

Optional WebMCP tools expose visible board state and cell actions in supporting browsers. Native WebMCP validation was unavailable in the development environment.

The fixed heart layout is in `lib/heart-mesh.ts`. To regenerate it, run `python scripts/generate-heart.py` with NumPy and SciPy installed; neither is required to build or play the game.
