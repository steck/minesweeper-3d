'use client';

import { useEffect, useState } from 'react';
import { createRestartGuard, restartDelay } from '@/lib/restart';

export function RestartButton({ onRestart }: { onRestart: () => void }) {
  const [guard] = useState(() => createRestartGuard());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), restartDelay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      disabled={!ready}
      onPointerDown={() => guard.press()}
      onPointerCancel={() => guard.cancel()}
      onPointerLeave={(event) => guard.leave(event.buttons)}
      onBlur={() => guard.cancel()}
      onClick={(event) => {
        const native = event.nativeEvent as PointerEvent;
        if (guard.activate(event.detail, native.pointerType)) onRestart();
      }}
    >
      Play again ↗
    </button>
  );
}
