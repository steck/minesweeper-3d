export const restartDelay = 500;

// A result can appear between a board's pointerup and the browser's click.
// Require a new press after a short pause, so neither that click nor a rapid
// follow-up tap can discard the finished board.
export function createRestartGuard(now = () => performance.now()) {
  const readyAt = now() + restartDelay;
  let pressed = false;
  return {
    press() {
      pressed = now() >= readyAt;
    },
    cancel() {
      pressed = false;
    },
    leave(buttons: number) {
      // Touch/pen pointers leave when lifted, before the compatibility click.
      // Only leaving while still pressed means the press was abandoned.
      if (buttons !== 0) pressed = false;
    },
    activate(detail: number, pointerType = '') {
      const intentional = pressed || (detail === 0 && pointerType === '');
      pressed = false;
      return now() >= readyAt && intentional;
    },
  };
}
