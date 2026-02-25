import { type NextRequest } from 'next/server';
import { getHandler, hasHandler } from '../../../../lib/scriptRegistry';
import type { LogEntry, LogFn } from '../../../../lib/types/logging';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { scriptId, config, inputs } = body;

  if (!scriptId || !config?.orgUrl || !config?.apiToken) {
    return new Response(JSON.stringify({ error: 'Missing scriptId or config' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasHandler(scriptId)) {
    return new Response(JSON.stringify({ error: `Unknown script: ${scriptId}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const handler = getHandler(scriptId)!;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const log: LogFn = (entry) => {
        const full: LogEntry = { ...entry, timestamp: Date.now() };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(full)}\n\n`));
      };

      try {
        const result = await handler(config, inputs, log);
        log({
          level: result.success ? 'success' : 'error',
          message: result.message,
          done: true,
          result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log({
          level: 'error',
          message,
          done: true,
          result: { success: false, message },
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
