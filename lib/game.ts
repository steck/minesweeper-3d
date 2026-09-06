export type Vec = [number, number, number];
export type Cell = {
  vertices: Vec[];
  neighbors: number[];
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  count: number;
};
export type Board = {
  cells: Cell[];
  mines: number;
  status: 'ready' | 'playing' | 'won' | 'lost';
  started: number;
};
export function makeBoard(shape: string, density: number): Board {
  const polygons: Vec[][] = [];
  if (shape === 'torus') {
    const u = 24,
      v = 12;
    const point = (i: number, j: number): Vec => {
      const a = (i / u) * Math.PI * 2,
        b = (j / v) * Math.PI * 2;
      return [
        (0.84 + 0.34 * Math.cos(b)) * Math.cos(a),
        0.34 * Math.sin(b),
        (0.84 + 0.34 * Math.cos(b)) * Math.sin(a),
      ];
    };
    for (let i = 0; i < u; i++)
      for (let j = 0; j < v; j++)
        polygons.push([
          point(i, j),
          point(i + 1, j),
          point(i + 1, j + 1),
          point(i, j + 1),
        ]);
  } else {
    const t = (1 + Math.sqrt(5)) / 2;
    const verts: Vec[] = [
      [-1, t, 0],
      [1, t, 0],
      [-1, -t, 0],
      [1, -t, 0],
      [0, -1, t],
      [0, 1, t],
      [0, -1, -t],
      [0, 1, -t],
      [t, 0, -1],
      [t, 0, 1],
      [-t, 0, -1],
      [-t, 0, 1],
    ];
    const faces = [
      [0, 11, 5],
      [0, 5, 1],
      [0, 1, 7],
      [0, 7, 10],
      [0, 10, 11],
      [1, 5, 9],
      [5, 11, 4],
      [11, 10, 2],
      [10, 7, 6],
      [7, 1, 8],
      [3, 9, 4],
      [3, 4, 2],
      [3, 2, 6],
      [3, 6, 8],
      [3, 8, 9],
      [4, 9, 5],
      [2, 4, 11],
      [6, 2, 10],
      [8, 6, 7],
      [9, 8, 1],
    ];
    const n = 4;
    for (const f of faces) {
      const [a, b, c] = f.map((i) => verts[i]);
      const p = (i: number, j: number): Vec =>
        a.map(
          (x, k) => (x + ((b[k] - x) * i) / n + ((c[k] - x) * j) / n) * 0.62,
        ) as Vec;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n - i; j++) {
          polygons.push([p(i, j), p(i + 1, j), p(i, j + 1)]);
          if (i + j < n - 1)
            polygons.push([p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)]);
        }
    }
  }
  const cells: Cell[] = polygons.map((vertices) => ({
    vertices,
    neighbors: [],
    mine: false,
    revealed: false,
    flagged: false,
    count: 0,
  }));
  const vertices = new Map<string, number[]>();
  cells.forEach((c, i) =>
    c.vertices.forEach((p) => {
      const key = p.map((x) => Math.round(x * 1e6)).join(',');
      vertices.set(key, [...(vertices.get(key) || []), i]);
    }),
  );
  const adj = cells.map(() => new Set<number>());
  for (const ids of vertices.values())
    for (const a of ids) for (const b of ids) if (a !== b) adj[a].add(b);
  cells.forEach((c, i) => (c.neighbors = [...adj[i]]));
  return {
    cells,
    mines: Math.round(cells.length * density),
    status: 'ready',
    started: 0,
  };
}
export function flag(b: Board, id: number) {
  if (!['ready', 'playing'].includes(b.status) || b.cells[id].revealed) return;
  b.cells[id].flagged = !b.cells[id].flagged;
}
export function canChord(b: Board, id: number) {
  const c = b.cells[id];
  return b.status === 'playing' && c.revealed && !c.mine && c.count > 0 &&
    c.neighbors.filter((n) => b.cells[n].flagged).length === c.count;
}
export function reveal(b: Board, id: number, rng = Math.random) {
  if (
    !['ready', 'playing'].includes(b.status) ||
    b.cells[id].flagged
  )
    return;
  if (b.cells[id].revealed && !canChord(b, id)) return;
  if (b.status === 'ready') {
    const safe = new Set([id, ...b.cells[id].neighbors]);
    const pool = b.cells.map((_, i) => i).filter((i) => !safe.has(i));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.slice(0, b.mines).forEach((i) => (b.cells[i].mine = true));
    b.cells.forEach(
      (c) => (c.count = c.neighbors.filter((i) => b.cells[i].mine).length),
    );
    b.status = 'playing';
    b.started = Date.now();
  }
  const targets = b.cells[id].revealed
    ? b.cells[id].neighbors.filter((n) => !b.cells[n].revealed && !b.cells[n].flagged)
    : [id];
  const hitMine = targets.some((n) => b.cells[n].mine);
  const queue = [...targets];
  while (queue.length) {
    const c = b.cells[queue.pop()!];
    if (c.revealed || c.flagged || c.mine) continue;
    c.revealed = true;
    if (c.count === 0) queue.push(...c.neighbors);
  }
  if (hitMine) {
    b.status = 'lost';
    b.cells.forEach((c) => {
      if (c.mine) c.revealed = true;
    });
    return;
  }
  if (b.cells.every((c) => c.mine || c.revealed)) b.status = 'won';
}
