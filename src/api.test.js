import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiFetch,
  requestLink,
  verifyToken,
  fetchMe,
  logout,
  onUnauthorized,
  uploadToBucket,
  fetchAdmins,
  createAdmin,
  setAdminActive,
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

describe('uploadToBucket', () => {
  it('PUTs the bytes with the two signed headers the presigned URL requires', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const file = new File(['x'], 'd.webp', { type: 'image/webp' });

    const result = await uploadToBucket(
      'https://bucket.example/presigned',
      file
    );

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://bucket.example/presigned');
    expect(options.method).toBe('PUT');
    // Both are bound into the URL signature — Content-Type binds the declared
    // type, If-None-Match:* makes R2 refuse to overwrite an existing object
    expect(options.headers['Content-Type']).toBe('image/webp');
    expect(options.headers['If-None-Match']).toBe('*');
    expect(options.body).toBe(file);
    expect(result).toEqual({ ok: true, status: 200 });
  });

  it('reports failure (e.g. a 412 overwrite refusal) without throwing', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 412 });
    const result = await uploadToBucket(
      'https://bucket.example/presigned',
      new File(['x'], 'd')
    );
    expect(result).toEqual({ ok: false, status: 412 });
  });

  it('returns ok:false on a network error', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'));
    const result = await uploadToBucket(
      'https://bucket.example/presigned',
      new File(['x'], 'd')
    );
    expect(result).toEqual({ ok: false, status: 0 });
  });
});

describe('admin allowlist client', () => {
  it('lists admins with a GET', async () => {
    await fetchAdmins();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/admin/admin-users');
    expect(options.method).toBe('GET');
  });

  it('adds an admin with a POST body', async () => {
    await createAdmin({ email: 'a@b.co', displayName: 'A' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/admin/admin-users');
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"email":"a@b.co","displayName":"A"}');
  });

  it('toggles is_active with a PATCH to the id, encoding it', async () => {
    await setAdminActive('the id', false);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/admin/admin-users/the%20id');
    expect(options.method).toBe('PATCH');
    expect(options.body).toBe('{"isActive":false}');
  });
});
