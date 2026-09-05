/**
 * Central API Client for ForgeOps IDP
 * Provides unified request timeout, structured error handling, and backend connectivity detection.
 */

export const BACKEND_URL =
  typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? window.location.origin
    : 'http://localhost:7007';

export interface ApiError {
  type: 'BACKEND_OFFLINE' | 'BACKSTAGE_UNAVAILABLE' | 'TIMEOUT' | 'SERVER_ERROR' | 'NETWORK_ERROR';
  message: string;
  url: string;
  status?: number;
  retryable: boolean;
}

export async function fetchWithTimeout(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      const error: ApiError = {
        type: 'TIMEOUT',
        message: `Request to ${url} timed out after ${timeoutMs / 1000}s. Please retry.`,
        url,
        retryable: true,
      };
      throw error;
    }
    const error: ApiError = {
      type: 'BACKEND_OFFLINE',
      message: `ForgeOps Backend service is offline or unreachable at ${BACKEND_URL}. Check if backend is running on port 7007.`,
      url,
      retryable: true,
    };
    throw error;
  }
}

export async function fetchJson<T = any>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<T> {
  const res = await fetchWithTimeout(endpoint, options, timeoutMs);
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
      else if (body.message) errorMsg = body.message;
    } catch {}
    const error: ApiError = {
      type: res.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
      message: errorMsg,
      url: endpoint,
      status: res.status,
      retryable: true,
    };
    throw error;
  }
  return res.json();
}
