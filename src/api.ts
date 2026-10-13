import type { RawRecord } from './types';

export class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, key: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${key}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new RequestError(body === undefined ? 'Connection lost. Resume your search to check existing jobs.' : 'The request outcome is unknown. Check your Bright Data dashboard before retrying a paid collection.', 0);
  }
  const data = await response.json().catch(() => ({ error: 'Unexpected server response. Try resuming.' }));
  if (!response.ok) throw new RequestError(data.error || 'Request failed. Try again in a moment.', response.status);
  return data as T;
}
export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Paused', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Paused', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
export async function collect(snapshot: string, key: string, signal: AbortSignal, onStatus: (status: string) => void): Promise<RawRecord[]> {
  const started = Date.now();
  while (Date.now() - started < 15 * 60_000) {
    const { status } = await api<{ status: string }>(`status?id=${snapshot}`, key, undefined, signal);
    onStatus(status);
    if (['failed', 'canceled', 'cancelled'].includes(status)) throw new Error('Bright Data could not complete this collection. Try another keyword.');
    if (status === 'ready') {
      const result = await api<{ records?: RawRecord[]; pending?: boolean }>(`result?id=${snapshot}`, key, undefined, signal);
      if (Array.isArray(result.records)) return result.records;
    }
    await wait(8_000, signal);
  }
  throw new Error('This collection is taking longer than expected. Resume to keep checking the same job.');
}
