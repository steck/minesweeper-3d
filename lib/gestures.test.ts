import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGestures, clampZoom } from './gestures.ts';

function setup() {
  const calls: string[] = [];
  let zoom = 1;
  const gestures = createGestures({
    hit: (x) => (x < 200 ? 7 : 8),
    reveal: (id) => calls.push(`reveal:${id}`),
    flag: (id) => calls.push(`flag:${id}`),
    rotate: () => calls.push('rotate'),
    zoom: (ratio) => {
      zoom = clampZoom(zoom * ratio);
    },
  });
  return { gestures, calls, zoom: () => zoom };
}

void test('tap reveals and right-click flags without a mode switch', () => {
  const { gestures: g, calls } = setup();
  g.down(1, 10, 10, 0, true);
  g.up(1, 10, 10);
  g.down(2, 10, 10, 2, false);
  g.up(2, 10, 10);
  assert.deepEqual(calls, ['reveal:7', 'flag:7']);
});

void test('hold flags exactly once and release never reveals', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { gestures: g, calls } = setup();
  g.down(1, 10, 10, 0, true);
  t.mock.timers.tick(449);
  assert.deepEqual(calls, []);
  t.mock.timers.tick(1);
  t.mock.timers.tick(1000);
  g.up(1, 10, 10);
  assert.deepEqual(calls, ['flag:7']);
});

void test('drag cancels hold and reveal; unknown pointers do not rotate', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { gestures: g, calls } = setup();
  g.down(1, 10, 10, 0, true);
  g.move(99, 400, 400);
  g.move(1, 30, 10);
  t.mock.timers.tick(500);
  g.up(1, 30, 10);
  assert.deepEqual(calls, ['rotate']);
});

void test('pinch zooms without rotation, flags, or accidental taps after one finger lifts', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { gestures: g, calls, zoom } = setup();
  g.down(1, 10, 10, 0, true);
  g.down(2, 110, 10, 0, true);
  g.move(2, 210, 10);
  assert.equal(zoom(), 2);
  t.mock.timers.tick(500);
  g.up(2, 210, 10);
  g.move(1, 30, 40);
  g.up(1, 30, 40);
  assert.deepEqual(calls, []);
  g.down(3, 10, 10, 0, true);
  g.up(3, 10, 10);
  assert.deepEqual(calls, ['reveal:7']);
});

void test('cancellation clears pending holds and all fingers', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { gestures: g, calls } = setup();
  g.down(1, 10, 10, 0, true);
  g.cancel();
  t.mock.timers.tick(500);
  g.up(1, 10, 10);
  assert.deepEqual(calls, []);
  assert.equal(g.active(), false);
});

void test('release on another cell does not reveal and zoom stays bounded', () => {
  const { gestures: g, calls } = setup();
  g.down(1, 198, 10, 0, true);
  g.up(1, 202, 10);
  assert.deepEqual(calls, []);
  assert.equal(clampZoom(100), 4);
  assert.equal(clampZoom(0.1), 0.55);
});
