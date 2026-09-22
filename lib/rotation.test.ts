import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityRotation, rotatePoint, rotateView } from './rotation.ts';

test('horizontal drag follows the screen direction after a vertical half turn', () => {
  const flipped = rotateView(identityRotation, 0, Math.PI);
  const facingPoint: [number, number, number] = [0, 0, -1];
  assert.ok(rotatePoint(facingPoint, flipped)[2] > 0.99);

  const draggedRight = rotatePoint(facingPoint, rotateView(flipped, 0.1, 0));
  const draggedLeft = rotatePoint(facingPoint, rotateView(flipped, -0.1, 0));
  assert.ok(draggedRight[0] > 0);
  assert.ok(draggedLeft[0] < 0);
});

test('vertical drag follows the screen direction after a horizontal quarter turn', () => {
  const turned = rotateView(identityRotation, Math.PI / 2, 0);
  const facingPoint: [number, number, number] = [-1, 0, 0];
  assert.ok(rotatePoint(facingPoint, turned)[2] > 0.99);

  const draggedDown = rotatePoint(facingPoint, rotateView(turned, 0, 0.1));
  const draggedUp = rotatePoint(facingPoint, rotateView(turned, 0, -0.1));
  assert.ok(draggedDown[1] < 0); // Canvas screen Y increases downward.
  assert.ok(draggedUp[1] > 0);
});
