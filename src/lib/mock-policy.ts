export function canUseMockFallback(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_DATA_FALLBACK === 'true';
}

export function isPlaceholderEndpoint(endpoint?: string | null): boolean {
  if (!endpoint) return true;
  return endpoint.includes('example.com');
}
