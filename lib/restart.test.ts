import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRestartGuard, restartDelay } from './restart.ts';

function setup() {
  let time = 0;
  const guard = createRestartGuard(() => time);
  return { guard, advance: (ms: number) => { time += ms; } };
}

void test('the board tap cannot click through a newly displayed restart button', () => {
  const { guard, advance } = setup();
  assert.equal(guard.activate(1, 'touch'), false);
  // Even a delayed compatibility click needs a press on the actual button.
  advance(1000);
  assert.equal(guard.activate(1), false);
  assert.equal(guard.activate(0, 'touch'), false);
});

void test('rapid follow-up taps cannot skip the result', () => {
  const { guard, advance } = setup();
  advance(100);
  guard.press();
  assert.equal(guard.activate(1, 'touch'), false);
  advance(100);
  guard.press();
  // Starting during the pause and releasing after it is also rejected.
  advance(restartDelay);
  assert.equal(guard.activate(1, 'touch'), false);
});

void test('a fresh touch, mouse, or pen press can restart once', () => {
  for (const pointerType of ['touch', 'mouse', 'pen']) {
    const { guard, advance } = setup();
    advance(restartDelay);
    guard.press();
    assert.equal(guard.activate(1, pointerType), true);
    assert.equal(guard.activate(1, pointerType), false);
  }
});

void test('cancelled or abandoned presses do not authorize a later click', () => {
  const { guard, advance } = setup();
  advance(restartDelay);
  guard.press();
  guard.cancel();
  assert.equal(guard.activate(1, 'touch'), false);
});

void test('keyboard and assistive activation still work after the pause', () => {
  const { guard, advance } = setup();
  assert.equal(guard.activate(0), false);
  advance(restartDelay);
  assert.equal(guard.activate(0), true);
});
