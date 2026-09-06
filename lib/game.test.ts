import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, reveal, flag } from './game.ts';
for (const shape of ['torus', 'icosahedron']) {
  test(`${shape}: closed mesh, symmetric adjacency, and equilateral triangles`, () => {
    const b = makeBoard(shape, 0.14);
    assert.equal(b.cells.length, shape === 'torus' ? 288 : 320);
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
