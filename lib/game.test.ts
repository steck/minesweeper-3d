import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, reveal, flag, canChord } from './game.ts';
for (const shape of ['torus', 'icosahedron', 'heart']) {
  const chordBoard = () => {
    const b = makeBoard(shape, 0.14);
    b.status = 'playing';
    b.cells[0].revealed = true;
    b.cells[b.cells[0].neighbors[0]].mine = true;
    b.mines = 1;
    b.cells.forEach(c => c.count = c.neighbors.filter(n => b.cells[n].mine).length);
    return b;
  };
  test(`${shape}: chord requires exact flags and updates eligibility immediately`, () => {
    const b = chordBoard(), [mine, safe] = b.cells[0].neighbors;
    assert.equal(canChord(b, 0), false);
    let snapshot = JSON.stringify(b);
    reveal(b, 0);
    assert.equal(JSON.stringify(b), snapshot);
    flag(b, mine);
    assert.equal(canChord(b, 0), true);
    flag(b, safe);
    assert.equal(canChord(b, 0), false);
    snapshot = JSON.stringify(b);
    reveal(b, 0);
    assert.equal(JSON.stringify(b), snapshot);
    flag(b, safe);
    assert.equal(canChord(b, 0), true);
    reveal(b, 0);
    assert.ok(b.cells[0].neighbors.every(n => b.cells[n].flagged || b.cells[n].revealed));
    assert.ok(b.cells[mine].flagged && !b.cells[mine].revealed);
    assert.equal(b.status, 'won');
    assert.equal(canChord(b, 0), false);
  });
  test(`${shape}: matching but misplaced flags lose, preserving flags and opening safe neighbors`, () => {
    const b = chordBoard(), [mine, safe] = b.cells[0].neighbors;
    flag(b, safe);
    assert.equal(canChord(b, 0), true);
    reveal(b, 0);
    assert.equal(b.status, 'lost');
    assert.ok(b.cells[mine].revealed);
    assert.ok(b.cells[safe].flagged && !b.cells[safe].revealed);
    assert.ok(b.cells[0].neighbors.every(n => b.cells[n].flagged || b.cells[n].revealed));
    assert.equal(canChord(b, 0), false);
  });
  test(`${shape}: closed mesh, symmetric adjacency, and expected cell geometry`, () => {
    const b = makeBoard(shape, 0.14);
    assert.equal(b.cells.length, shape === 'torus' ? 288 : shape === 'heart' ? 180 : 320);
    const edges = new Map<string, number>();
    b.cells.forEach((c, i) => {
      assert.equal(new Set(c.neighbors).size, c.neighbors.length);
      assert.ok(!c.neighbors.includes(i));
      c.neighbors.forEach((n) => assert.ok(b.cells[n].neighbors.includes(i)));
      if (shape === 'torus') assert.equal(c.neighbors.length, 8);
      const lengths: number[] = [];
      c.vertices.forEach((p, j) => {
        const q = c.vertices[(j + 1) % c.vertices.length];
        const key = [p, q]
          .map((v) => v.map((x) => Math.round(x * 1e6)).join(','))
          .sort()
          .join('|');
        edges.set(key, (edges.get(key) || 0) + 1);
        lengths.push(Math.hypot(...p.map((x, k) => x - q[k])));
      });
      if (shape === 'icosahedron')
        assert.ok(Math.max(...lengths) - Math.min(...lengths) < 1e-9);
    });
    assert.ok([...edges.values()].every((n) => n === 2));
    const seen = new Set([0]),
      stack = [0];
    while (stack.length)
      for (const n of b.cells[stack.pop()!].neighbors)
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
    assert.equal(seen.size, b.cells.length);
  });
  test(`${shape}: safe opening, flags, counts, victory and loss`, () => {
    for (const density of [0.1, 0.14, 0.2]) {
      const b = makeBoard(shape, density);
      flag(b, 0);
      reveal(b, 0);
      assert.equal(b.status, 'ready');
      flag(b, 0);
      reveal(b, 0, () => 0.37);
      assert.equal(b.cells[0].count, 0);
      assert.ok(b.cells[0].revealed);
      assert.equal(b.cells.filter((c) => c.mine).length, b.mines);
      b.cells[0].neighbors.forEach((n) => assert.ok(!b.cells[n].mine));
      b.cells.forEach((c) =>
        assert.equal(
          c.count,
          c.neighbors.filter((n) => b.cells[n].mine).length,
        ),
      );
      b.cells.forEach((c, i) => {
        if (!c.mine) reveal(b, i);
      });
      assert.equal(b.status, 'won');
      const lost = makeBoard(shape, density);
      reveal(lost, 0);
      const mine = lost.cells.findIndex((c) => c.mine);
      reveal(lost, mine);
      assert.equal(lost.status, 'lost');
      const snapshot = JSON.stringify(lost);
      flag(lost, 1);
      reveal(lost, 1);
      assert.equal(JSON.stringify(lost), snapshot);
    }
  });
}

void test('heart: balanced mixed facets, symmetry, and nondegenerate convex cells', () => {
  const { cells } = makeBoard('heart', 0.14);
  assert.equal(cells.filter(c => c.vertices.length === 3).length, 86);
  assert.equal(cells.filter(c => c.vertices.length === 4).length, 94);
  const key = (v: number[]) => v.map(x => Math.round(x * 1e6)).join(',');
  const vertices = new Set(cells.flatMap(c => c.vertices.map(key)));
  for (const c of cells) {
    assert.ok(c.neighbors.length <= 14);
    // Side rectangles have zero XY area; use their XZ or YZ plane instead.
    const sideCell = c.vertices.some(v => v[2] === 0);
    const axis = Math.abs(c.vertices[0][0] - c.vertices[2][0]) >
      Math.abs(c.vertices[0][1] - c.vertices[2][1]) ? 0 : 1;
    const u = sideCell ? axis : 0, v = sideCell ? 2 : 1;
    const turns = c.vertices.map((a, i, vs) => {
      const b = vs[(i + 1) % vs.length], d = vs[(i + 2) % vs.length];
      assert.ok(a.every(Number.isFinite));
      assert.ok(vertices.has(key([-a[0], a[1], a[2]])));
      assert.ok(vertices.has(key([a[0], a[1], -a[2]])));
      return (b[u] - a[u]) * (d[v] - b[v]) - (b[v] - a[v]) * (d[u] - b[u]);
    });
    assert.ok(turns.every(t => Math.abs(t) > 1e-8));
    assert.ok(turns.every(t => Math.sign(t) === Math.sign(turns[0])));
  }
});

void test('heart: every shared corner is counted, including mixed facets and the back seam', () => {
  const { cells } = makeBoard('heart', 0.14);
  const key = (v: number[]) => v.map(x => Math.round(x * 1e6)).join(',');
  const corners = cells.map(c => new Set(c.vertices.map(key)));
  cells.forEach((c, i) => {
    const expected = cells.flatMap((_, j) =>
      i !== j && [...corners[j]].some(v => corners[i].has(v)) ? [j] : []);
    assert.deepEqual([...c.neighbors].sort((a, b) => a - b), expected);
  });
  assert.ok(cells.some(c => c.vertices.length === 3 &&
    c.neighbors.some(n => cells[n].vertices.length === 4)));
  assert.ok(cells.some(c => c.vertices.some(v => v[2] > 0) &&
    c.neighbors.some(n => cells[n].vertices.some(v => v[2] < 0))));
});

void test('heart: comparable cell areas and a continuous rectangular belt', () => {
  const { cells } = makeBoard('heart', 0.14);
  const winding = new Map<string, number>();
  const vertexKey = (v: number[]) => v.map(x => Math.round(x * 1e6)).join(',');
  for (const c of cells) c.vertices.forEach((p, i, vs) => {
    const a = vertexKey(p), b = vertexKey(vs[(i + 1) % vs.length]);
    const edge = [a, b].sort().join('|');
    winding.set(edge, (winding.get(edge) || 0) + (a < b ? 1 : -1));
  });
  assert.ok([...winding.values()].every(n => n === 0));
  const areas = cells.map(c => {
    const origin = c.vertices[0];
    let area = 0;
    for (let i = 1; i < c.vertices.length - 1; i++) {
      const a = c.vertices[i].map((x, k) => x - origin[k]);
      const b = c.vertices[i + 1].map((x, k) => x - origin[k]);
      area += Math.hypot(a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) / 2;
    }
    return area;
  });
  // A triangle may be smaller than a quad, but no tiny slivers are allowed.
  assert.ok(Math.min(...areas) > 0.02);
  assert.ok(Math.max(...areas) / Math.min(...areas) < 2.8);
  const belt = cells.filter(c => c.vertices.some(v => v[2] === 0));
  assert.equal(belt.length, 54);
  const notch = belt.filter(c => c.vertices.every(v => v[1] > 0) &&
    c.vertices.some(v => v[0] < 0) && c.vertices.some(v => v[0] > 0));
  assert.equal(notch.length, 2);
  for (const c of notch) {
    assert.ok(c.vertices.every(v => v[1] === c.vertices[0][1]));
    assert.ok(c.vertices[0][1] > 0.6);
  }
  for (const c of belt) {
    assert.equal(c.vertices.length, 4);
    c.vertices.forEach((p, i, vs) => {
      const a = vs[(i + 1) % 4].map((x, k) => x - p[k]);
      const b = vs[(i + 3) % 4].map((x, k) => x - p[k]);
      assert.ok(Math.abs(a.reduce((sum, x, k) => sum + x * b[k], 0)) < 1e-9);
    });
    assert.equal(c.neighbors.filter(n => belt.includes(cells[n])).length, 5);
  }
});
