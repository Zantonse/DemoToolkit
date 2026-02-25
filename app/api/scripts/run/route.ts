/**
 * SSE Route Handler — POST /api/scripts/run
 *
 * Receives { scriptId, config, inputs }, executes the matching script handler
 * from the registry, and streams LogEntry JSON objects back as Server-Sent Events.
 * The final event includes `done: true` with the full OktaActionResult.
 */

import { type NextRequest } from 'next/server';
import { getHandler } from '../../../../lib/scriptRegistry';
import type { LogEntry, LogFn } from '../../../../lib/types/logging';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { scriptId, config, inputs } = body as {
    scriptId?: string;
    config?: { orgUrl?: string; apiToken?: string; [key: string]: unknown };
    inputs?: Record<string, string | string[] | undefined>;
  };

  if (!scriptId || !config?.orgUrl || !config?.apiToken) {
    return new Response(JSON.stringify({ error: 'Missing scriptId or config' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const handler = getHandler(scriptId as Parameters<typeof getHandler>[0]);
  if (!handler) {
    return new Response(JSON.stringify({ error: `Unknown script: ${scriptId}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const log: LogFn = (entry) => {
        const full: LogEntry = { ...entry, timestamp: Date.now() };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(full)}\n\n`));
      };

      try {
        const result = await handler(config as Parameters<typeof handler>[0], inputs, log);
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
    },
  });
}
