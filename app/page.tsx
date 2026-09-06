'use client';
import { useEffect, useRef, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { makeBoard, reveal, flag, canChord, type Board, type Vec } from '@/lib/game';
import { registerGameTools } from '@/lib/webmcp';

export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Board>(makeBoard('torus', 0.14));
  const view = useRef({ x: 0.85, y: 0.25, zoom: 1 });
  const [shape, setShape] = useState('torus');
  const [density, setDensity] = useState(0.14);
  const [revision, update] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [mark, setMark] = useState(false);
  const [help, setHelp] = useState(false);
  const drawRef = useRef<() => void>(() => {});
  const reset = (s = shape, d = density) => {
    game.current = makeBoard(s, d);
    setSeconds(0);
    update((v) => v + 1);
  };
  useEffect(
    () =>
      registerGameTools(
        () => game.current,
        (id, action) => {
          if (action === 'flag') flag(game.current, id);
          else reveal(game.current, id);
          update((v) => v + 1);
        },
      ),
    [],
  );
  useEffect(() => {
    const t = setInterval(() => {
      if (game.current.status === 'playing')
        setSeconds(Math.floor((Date.now() - game.current.started) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext('2d')!;
    let hovered = -1;
    let faces: { id: number; points: number[][]; z: number }[] = [];
    const rotate = ([x, y, z]: Vec): Vec => {
      const a = view.current;
      const xx = x * Math.cos(a.y) + z * Math.sin(a.y),
        zz = -x * Math.sin(a.y) + z * Math.cos(a.y);
      return [
        xx,
        y * Math.cos(a.x) - zz * Math.sin(a.x),
        y * Math.sin(a.x) + zz * Math.cos(a.x),
      ];
    };
    const draw = () => {
      const w = el.clientWidth,
        h = el.clientHeight,
        dpr = Math.min(devicePixelRatio, 2);
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min(w * 0.36, h * 0.36) * view.current.zoom;
      faces = game.current.cells
        .map((c, id) => {
          const vs = c.vertices.map(rotate);
          return {
            id,
            z: vs.reduce((s, p) => s + p[2], 0) / vs.length,
            points: vs.map((p) => [
              w / 2 + (p[0] * scale * 5) / (5 - p[2]),
              h / 2 - (p[1] * scale * 5) / (5 - p[2]),
            ]),
          };
        })
        .sort((a, b) => a.z - b.z);
      for (const f of faces) {
        const c = game.current.cells[f.id];
        const chordReady = canChord(game.current, f.id);
        const chordHovered = chordReady && f.id === hovered;
        const pts = f.points;
        const light = Math.max(0, Math.min(1, (f.z + 1.5) / 3));
        ctx.beginPath();
        pts.forEach((p, i) =>
          i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
        );
        ctx.closePath();
        ctx.fillStyle = c.revealed
          ? c.mine
            ? '#bd5355'
            : `hsl(170 19% ${15 + light * 9}%)`
          : c.flagged
            ? '#a6bb73'
            : `hsl(163 ${32 + light * 16}% ${24 + light * 30}%)`;
        if (f.id === hovered && !c.revealed) ctx.fillStyle = '#b6f3ce';
        if (chordHovered) ctx.fillStyle = '#b8e5f5';
        ctx.fill();
        ctx.strokeStyle = '#0b211e';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Paint labels with each face so nearer surfaces occlude them.
        if (c.flagged || (c.revealed && (c.count || c.mine))) {
          const x = pts.reduce((s, p) => s + p[0], 0) / pts.length,
            y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          const area = Math.abs(
            pts.reduce(
              (s, p, i) =>
                s +
                p[0] * pts[(i + 1) % pts.length][1] -
                pts[(i + 1) % pts.length][0] * p[1],
              0,
            ) / 2,
          );
          if (area > 65) {
            ctx.font = `600 ${Math.max(10, Math.min(23, Math.sqrt(area) * 0.47))}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = chordHovered ? '#163641' : c.flagged
              ? '#193728'
              : ['#e6fff7', '#a7e9ff', '#bce9b0', '#ffca90', '#d8b8ff'][
                  Math.min(c.count, 4)
                ];
            ctx.fillText(
              c.flagged ? '⚑' : c.mine ? '✹' : String(c.count),
              x,
              y,
            );
          }
        }
      }
    };
    drawRef.current = draw;
    const hit = (x: number, y: number) => {
      for (let i = faces.length - 1; i >= 0; i--) {
        const p = faces[i].points;
        let inside = false;
        for (let j = 0, k = p.length - 1; j < p.length; k = j++) {
          if (
            p[j][1] > y !== p[k][1] > y &&
            x <
              ((p[k][0] - p[j][0]) * (y - p[j][1])) / (p[k][1] - p[j][1]) +
                p[j][0]
          )
            inside = !inside;
        }
        if (inside) return faces[i].id;
      }
      return -1;
    };
    let down: {
      x: number;
      y: number;
      lastX: number;
      lastY: number;
      button: number;
      moved: boolean;
    } | null = null;
    const pos = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const start = (e: PointerEvent) => {
      if (down) return;
      el.focus();
      el.setPointerCapture(e.pointerId);
      down = {
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        button: e.button,
        moved: false,
      };
    };
    const move = (e: PointerEvent) => {
      if (down) {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5)
          down.moved = true;
        if (down.moved) {
          view.current.y += (e.clientX - down.lastX) * 0.008;
          view.current.x += (e.clientY - down.lastY) * 0.008;
          hovered = -1;
        }
        down.lastX = e.clientX;
        down.lastY = e.clientY;
      } else {
        const [x, y] = pos(e);
        hovered = hit(x, y);
      }
      draw();
    };
    const end = (e: PointerEvent) => {
      if (down && !down.moved) {
        const [x, y] = pos(e),
          id = hit(x, y);
        if (id >= 0) {
          if (down.button === 2 || mark) flag(game.current, id);
          else if (down.button === 0) reveal(game.current, id);
          update((v) => v + 1);
        }
      }
      down = null;
      draw();
    };
    const cancel = () => {
      down = null;
    };
    const leave = () => {
      hovered = -1;
      draw();
    };
    const menu = (e: Event) => e.preventDefault();
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.zoom = Math.max(
        0.55,
        Math.min(1.7, view.current.zoom * Math.exp(-e.deltaY * 0.001)),
      );
      draw();
    };
    const key = (e: KeyboardEvent) => {
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-'].includes(
          e.key,
        )
      ) {
        e.preventDefault();
        view.current.y +=
          e.key === 'ArrowLeft' ? -0.15 : e.key === 'ArrowRight' ? 0.15 : 0;
        view.current.x +=
          e.key === 'ArrowUp' ? -0.15 : e.key === 'ArrowDown' ? 0.15 : 0;
        if (e.key === '+' || e.key === '-')
          view.current.zoom = Math.max(
            0.55,
            Math.min(1.7, view.current.zoom + (e.key === '+' ? 0.1 : -0.1)),
          );
        draw();
      }
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('contextmenu', menu);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('keydown', key);
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    draw();
    return () => {
      ro.disconnect();
      el.removeEventListener('pointerdown', start);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', cancel);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('contextmenu', menu);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('keydown', key);
    };
  }, [mark]);
  useEffect(() => {
    drawRef.current();
  }, [revision]);
  const b = game.current,
    cleared = b.cells.filter((c) => c.revealed && !c.mine).length,
    flags = b.cells.filter((c) => c.flagged).length;
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ◈ <span>SURFACE</span>
          <small>MINESWEEPER / 3D</small>
        </a>
        <button className="quiet" onClick={() => setHelp(!help)}>
          {help ? 'Close guide' : 'How to play'} <span>↗</span>
        </button>
      </header>
      <div className="workspace">
        <aside>
          <div className="eyebrow">01 / CONFIGURATION</div>
          <h1>
            A new dimension
            <br />
            of deduction.
          </h1>
          <p className="intro">Find the mines. Read the surface.</p>
          <div className="section-label">Choose your surface</div>
          <RadioGroup
            value={shape}
            onValueChange={(v) => {
              setShape(String(v));
              reset(String(v));
            }}
            className="shape-options"
            aria-label="Board shape"
          >
            {[
              ['torus', '◎', 'Torus', 'Connected square grid'],
              ['icosahedron', '◇', 'Icosahedron', 'Triangular terrain'],
            ].map(([id, icon, title, sub]) => (
              <label
                className={'shape-option ' + (shape === id ? 'selected' : '')}
                key={id}
              >
                <span className="shape-icon">{icon}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{sub}</small>
                </span>
                <RadioGroupItem value={id} />
              </label>
            ))}
          </RadioGroup>
          <div className="section-label">Mine density</div>
          <RadioGroup
            value={String(density)}
            onValueChange={(v) => {
              setDensity(Number(v));
              reset(shape, Number(v));
            }}
            className="difficulties"
            aria-label="Difficulty"
          >
            {[
              [0.1, 'Easy'],
              [0.14, 'Normal'],
              [0.2, 'Hard'],
            ].map(([v, t]) => (
              <label key={v} className={density === v ? 'active' : ''}>
                <RadioGroupItem value={String(v)} />
                {t}
              </label>
            ))}
          </RadioGroup>
          <button className="new-game" onClick={() => reset()}>
            New game <span>↻</span>
          </button>
          <div className="safe-note">
            <span>✧</span> Your first reveal is always safe.
          </div>
          <div className="board-info">
            <span>TOPOLOGY</span>
            <strong>
              {b.cells.length}{' '}
              {shape === 'torus' ? 'quadrilateral' : 'equilateral triangle'}{' '}
              cells
            </strong>
            <p>
              {shape === 'torus'
                ? 'An endless grid. Neighbors wrap around both directions.'
                : 'Twenty faces. Neighbors connect across every seam.'}
            </p>
          </div>
        </aside>
        <section className="play-area" aria-label="Minesweeper game">
          <div className="game-top">
            <div className="live-label">
              <i />{' '}
              {b.status === 'ready'
                ? 'AWAITING FIRST MOVE'
                : b.status === 'playing'
                  ? 'EXPEDITION IN PROGRESS'
                  : b.status === 'won'
                    ? 'SURFACE CLEARED'
                    : 'MINE DETECTED'}
            </div>
            <div className="stats">
              <div>
                <small>MINES − FLAGS</small>
                <strong>{String(b.mines - flags).padStart(2, '0')}</strong>
              </div>
              <div>
                <small>TIME</small>
                <strong>
                  {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                  {String(seconds % 60).padStart(2, '0')}
                </strong>
              </div>
            </div>
          </div>
          <canvas
            ref={canvas}
            tabIndex={0}
            aria-label="3D minesweeper surface. Click to reveal, right click to flag, drag to rotate, scroll to zoom. Arrow keys rotate."
          />
          <div className="surface-caption">
            <span>{shape === 'torus' ? '01 / TORUS' : '02 / ICOSAHEDRON'}</span>
            <button
              onClick={() => {
                view.current = { x: 0.85, y: 0.25, zoom: 1 };
                drawRef.current();
              }}
            >
              Reset view ⤾
            </button>
          </div>
          {(b.status === 'won' || b.status === 'lost') && (
            <div className="result" role="status">
              <strong>
                {b.status === 'won'
                  ? 'Beautifully deduced.'
                  : 'A mine beneath the surface.'}
              </strong>
              <span>
                {b.status === 'won'
                  ? 'Every safe cell revealed.'
                  : 'Rotate to inspect the board, or try a new field.'}
              </span>
              <button onClick={() => reset()}>Play again ↗</button>
            </div>
          )}
          {help && (
            <div className="help">
              <h2>Read between the mines.</h2>
              <p>
                Reveal every safe cell to win. Each number counts mines in cells
                that share an edge or a corner. Empty areas open automatically.
              </p>
              <p>
                Numbers highlight blue on hover when touching flags match their value.
                Click to reveal all their unflagged neighbors. Misplaced flags
                can expose a mine. Too few or too many flags disable this move.
              </p>
              <p>
                Right-click a cell to flag a suspected mine. Drag in any
                direction to see the other side; scroll to zoom. On touch
                screens, use Flag mode to place markers.
              </p>
              <p>
                Your first reveal and its neighbors contain no mines. Later
                moves may require a guess.
              </p>
            </div>
          )}
          <div className="game-bottom">
            <div className="progress-label">
              <strong>
                {cleared}
                <span> / {b.cells.length - b.mines}</span>
              </strong>
              <small>SAFE CELLS REVEALED</small>
            </div>
            <div className="progress-track">
              <div
                style={{
                  width: `${(cleared / (b.cells.length - b.mines)) * 100}%`,
                }}
              />
            </div>
            <button
              className={'flag-mode ' + (mark ? 'on' : '')}
              aria-pressed={mark}
              onClick={() => setMark(!mark)}
            >
              ⚑ Flag mode {mark ? 'on' : 'off'}
            </button>
          </div>
        </section>
      </div>
      <footer>
        <span>
          <b>Left click</b> Reveal
        </span>
        <span>
          <b>Right click</b> Flag
        </span>
        <span>
          <b>Drag</b> Rotate
        </span>
        <span>
          <b>Scroll</b> Zoom
        </span>
        <em>EVERY SIDE HAS A SECRET.</em>
      </footer>
    </main>
  );
}
