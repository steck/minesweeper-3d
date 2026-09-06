import type { Board } from './game';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
export function registerGameTools(
  read: () => Board,
  act: (id: number, action: string) => void,
) {
  const context = (
    document as Document & {
      modelContext?: {
        registerTool: (
          tool: Tool,
          options: { signal: AbortSignal },
        ) => void | Promise<void>;
      };
    }
  ).modelContext;
  if (!context) return () => {};
  const lifecycle = new AbortController();
  const snapshot = () => ({
    status: read().status,
    mines: read().mines,
    cells: read().cells.map((c, id) => ({
      id,
      neighbors: c.neighbors,
      revealed: c.revealed,
      flagged: c.flagged,
      count: c.revealed ? c.count : null,
      mine: c.revealed ? c.mine : null,
    })),
  });
  const tools: Tool[] = [
    {
      name: 'read_minesweeper_board',
      description:
        'Read visible cells and surface adjacency without exposing hidden mines.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: snapshot,
    },
    {
      name: 'play_minesweeper_cell',
      description: 'Reveal a cell or toggle its flag on the current board.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 0 },
          action: { type: 'string', enum: ['reveal', 'flag'] },
        },
        required: ['id', 'action'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const v = input as { id: number; action: string };
        if (
          !v ||
          !Number.isInteger(v.id) ||
          v.id < 0 ||
          v.id >= read().cells.length ||
          !['reveal', 'flag'].includes(v.action)
        )
          throw new Error(
            'Expected a valid cell ID and reveal or flag action.',
          );
        act(v.id, v.action);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        return snapshot();
      },
    },
  ];
  for (const tool of tools)
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional browser API. */
    }
  return () => lifecycle.abort();
}
