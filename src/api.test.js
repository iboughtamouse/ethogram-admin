import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiFetch,
  requestLink,
  verifyToken,
  fetchMe,
  logout,
  onUnauthorized,
} from './api';

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => payload };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonResponse({ success: true, data: {} }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('sends credentials and the CSRF header on every request', async () => {
    await apiFetch('/api/admin/me');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/me',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({ 'x-ethogram-admin': '1' }),
      })
    );
  });

  it('JSON-encodes bodies and sets Content-Type', async () => {
    await apiFetch('/x', { method: 'POST', body: { a: 1 } });

    const [, options] = fetch.mock.calls[0];
    expect(options.body).toBe('{"a":1}');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('returns ok/status/payload from the response', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(
        { success: false, error: 'nope' },
        { ok: false, status: 401 }
      )
    );
    const result = await apiFetch('/x');
    expect(result).toEqual({
      ok: false,
      status: 401,
      payload: { success: false, error: 'nope' },
    });
  });

  it('survives network failures without throwing', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const result = await apiFetch('/x');
    expect(result).toEqual({ ok: false, status: 0, payload: null });
  });

  it('survives non-JSON responses', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError('empty');
      },
    });
    const result = await apiFetch('/x');
    expect(result).toEqual({ ok: true, status: 204, payload: null });
  });
});

describe('onUnauthorized', () => {
  it('fires for a 401 from a dashboard endpoint', async () => {
    const handler = vi.fn();
    const unsubscribe = onUnauthorized(handler);
    fetch.mockResolvedValueOnce(
      jsonResponse(
        { success: false, error: 'Not signed in' },
        { ok: false, status: 401 }
      )
    );

    await apiFetch('/api/admin/overview');

    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it.each(['/api/admin/me', '/api/admin/auth/verify'])(
    'does not fire for a 401 from %s',
    async (path) => {
      const handler = vi.fn();
      const unsubscribe = onUnauthorized(handler);
      fetch.mockResolvedValueOnce(
        jsonResponse(
          { success: false, error: 'nope' },
          { ok: false, status: 401 }
        )
      );

      await apiFetch(path);

      expect(handler).not.toHaveBeenCalled();
      unsubscribe();
    }
  );

  it('does not fire after unsubscribe', async () => {
    const handler = vi.fn();
    onUnauthorized(handler)();
    fetch.mockResolvedValueOnce(
      jsonResponse({ success: false }, { ok: false, status: 401 })
    );

    await apiFetch('/api/admin/overview');

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('endpoint helpers', () => {
  it.each([
    [
      'requestLink',
      () => requestLink('a@b.c'),
      '/api/admin/auth/request-link',
      'POST',
    ],
    ['verifyToken', () => verifyToken('tok'), '/api/admin/auth/verify', 'POST'],
    ['fetchMe', () => fetchMe(), '/api/admin/me', 'GET'],
    ['logout', () => logout(), '/api/admin/auth/logout', 'POST'],
  ])('%s hits its endpoint', async (_name, call, path, method) => {
    await call();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`http://localhost:3000${path}`);
    expect(options.method).toBe(method);
  });
});
