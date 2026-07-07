/**
 * Fetch wrapper for the ethogram API.
 *
 * Every request rides with credentials (the httpOnly session cookie) and the
 * x-ethogram-admin header the API requires on all /api/admin mutations (its
 * CSRF guard: cross-site requests can't set custom headers without passing a
 * CORS preflight that only admits this origin).
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

export async function apiFetch(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'x-ethogram-admin': '1',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, payload: null };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response body; callers handle payload === null
  }
  return { ok: response.ok, status: response.status, payload };
}

export function requestLink(email) {
  return apiFetch('/api/admin/auth/request-link', {
    method: 'POST',
    body: { email },
  });
}

export function verifyToken(token) {
  return apiFetch('/api/admin/auth/verify', {
    method: 'POST',
    body: { token },
  });
}

export function fetchMe() {
  return apiFetch('/api/admin/me');
}

export function logout() {
  return apiFetch('/api/admin/auth/logout', { method: 'POST' });
}
