import type { Vec } from './game';

export type Rotation = [number, number, number, number];

export const identityRotation: Rotation = [0, 0, 0, 1];

const multiply = (a: Rotation, b: Rotation): Rotation => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

const aroundX = (angle: number): Rotation => [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];
const aroundY = (angle: number): Rotation => [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];

// Apply each drag in screen space, independent of the field's previous orientation.
export function rotateView(rotation: Rotation, horizontal: number, vertical: number): Rotation {
  const next = multiply(multiply(aroundY(horizontal), aroundX(vertical)), rotation);
  const length = Math.hypot(...next);
  return next.map((value) => value / length) as Rotation;
}

export function initialRotation(shape = 'torus'): Rotation {
  if (shape === 'heart') return multiply(aroundX(-0.08), aroundY(0.12));
  return multiply(aroundX(0.85), aroundY(0.25));
}

export function rotatePoint([x, y, z]: Vec, [qx, qy, qz, qw]: Rotation): Vec {
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + qy * tz - qz * ty,
    y + qw * ty + qz * tx - qx * tz,
    z + qw * tz + qx * ty - qy * tx,
  ];
}
