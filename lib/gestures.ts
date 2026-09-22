export const clampZoom = (zoom: number) => Math.max(0.55, Math.min(4, zoom));

type Contact = {
  x: number;
  y: number;
  originX: number;
  originY: number;
  cell: number;
  button: number;
};
type Actions = {
  hit: (x: number, y: number) => number;
  reveal: (cell: number) => void;
  flag: (cell: number) => void;
  rotate: (dx: number, dy: number) => void;
  zoom: (ratio: number) => void;
};

// A gesture owns all its contacts until every finger lifts. A pinch can never
// become a tap or a one-finger rotation halfway through.
export function createGestures(actions: Actions) {
  const contacts = new Map<number, Contact>();
  let mode: 'tap' | 'drag' | 'pinch' | 'held' = 'tap';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopHold = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const distance = () => {
    const [a, b] = [...contacts.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  return {
    down(id: number, x: number, y: number, button: number, touch: boolean) {
      contacts.set(id, {
        x,
        y,
        originX: x,
        originY: y,
        cell: actions.hit(x, y),
        button,
      });
      stopHold();
      if (contacts.size > 1) {
        mode = 'pinch';
        return;
      }
      mode = 'tap';
      const cell = contacts.get(id)!.cell;
      if (touch && cell >= 0)
        timer = setTimeout(() => {
          mode = 'held';
          actions.flag(cell);
        }, 450);
    },
    move(id: number, x: number, y: number) {
      const contact = contacts.get(id);
      if (!contact) return;
      const before = distance();
      const dx = x - contact.x,
        dy = y - contact.y;
      contact.x = x;
      contact.y = y;
      if (mode === 'pinch') {
        const after = distance();
        if (contacts.size === 2 && before > 0 && after > 0)
          actions.zoom(after / before);
        return;
      }
      if (mode === 'held') return;
      if (Math.hypot(x - contact.originX, y - contact.originY) > 8) {
        stopHold();
        mode = 'drag';
      }
      if (mode === 'drag') actions.rotate(dx, dy);
    },
    up(id: number, x: number, y: number) {
      const contact = contacts.get(id);
      if (!contact) return;
      stopHold();
      if (
        mode === 'tap' &&
        Math.hypot(x - contact.originX, y - contact.originY) <= 8 &&
        contact.cell >= 0 &&
        actions.hit(x, y) === contact.cell
      ) {
        if (contact.button === 2) actions.flag(contact.cell);
        else if (contact.button === 0) actions.reveal(contact.cell);
      }
      contacts.delete(id);
    },
    cancel() {
      stopHold();
      contacts.clear();
      mode = 'held';
    },
    active() {
      return contacts.size > 0;
    },
    has(id: number) {
      return contacts.has(id);
    },
  };
}
