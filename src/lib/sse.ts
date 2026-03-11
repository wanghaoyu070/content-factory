interface ConsumeSseOptions<T> {
  onEvent: (event: T) => void | Promise<void>;
  expectedContentType?: string;
  getEventError?: (event: T) => string | null;
}

function parseErrorMessageFromPayload(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export async function consumeSseStream<T>(
  response: Response,
  {
    onEvent,
    expectedContentType = 'text/event-stream',
    getEventError,
  }: ConsumeSseOptions<T>
): Promise<void> {
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes(expectedContentType)) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessageFromPayload(payload, `请求失败（${response.status}）`));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const dataLines = chunk
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6));

      if (dataLines.length === 0) continue;
      const parsed = JSON.parse(dataLines.join('\n')) as T;
      const eventError = getEventError ? getEventError(parsed) : null;
      if (eventError) {
        throw new Error(eventError);
      }
      await onEvent(parsed);
    }
  }
}
