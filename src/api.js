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

let unauthorizedHandler = null;

/**
 * Register a callback for mid-session expiry: a 401 from any dashboard
 * endpoint means the server-side session is gone (expired, revoked, or the
 * admin was deactivated), so the app should return to the login screen.
 * Auth endpoints are excluded — /me's 401 is the normal signed-out answer at
 * mount, and a failed token redeem is a page-level error, not session loss.
 * Returns an unsubscribe function.
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

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

  if (
    response.status === 401 &&
    path !== '/api/admin/me' &&
    !path.startsWith('/api/admin/auth/')
  ) {
    unauthorizedHandler?.();
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

// --- Stage 3B: read-only dashboard data ---

export function fetchOverview() {
  return apiFetch('/api/admin/overview');
}

export function fetchAviary(slug) {
  return apiFetch(`/api/admin/aviaries/${encodeURIComponent(slug)}`);
}

export function fetchVocabulary() {
  return apiFetch('/api/admin/vocabulary');
}

export function fetchVersions() {
  return apiFetch('/api/admin/config-versions');
}

export function fetchSubmissions(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const suffix = params.toString() ? `?${params}` : '';
  return apiFetch(`/api/admin/submissions${suffix}`);
}

/**
 * Download link for a submission's Excel file. The existing public endpoint
 * is reused (design P3-D6); the observation UUID is the capability.
 */
export function excelDownloadUrl(observationId) {
  return `${API_BASE_URL}/api/observations/${encodeURIComponent(observationId)}/excel`;
}

// --- Stage 3C: editing + publish ---

export function createAviary(body) {
  return apiFetch('/api/admin/aviaries', { method: 'POST', body });
}

export function updateAviary(slug, body) {
  return apiFetch(`/api/admin/aviaries/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body,
  });
}

export function createPerch(slug, body) {
  return apiFetch(`/api/admin/aviaries/${encodeURIComponent(slug)}/perches`, {
    method: 'POST',
    body,
  });
}

export function updatePerch(slug, value, body) {
  return apiFetch(
    `/api/admin/aviaries/${encodeURIComponent(slug)}/perches/${encodeURIComponent(value)}`,
    { method: 'PATCH', body }
  );
}

export function deletePerch(slug, value) {
  return apiFetch(
    `/api/admin/aviaries/${encodeURIComponent(slug)}/perches/${encodeURIComponent(value)}`,
    { method: 'DELETE' }
  );
}

export function createSubject(slug, body) {
  return apiFetch(`/api/admin/aviaries/${encodeURIComponent(slug)}/subjects`, {
    method: 'POST',
    body,
  });
}

export function updateSubject(id, body) {
  return apiFetch(`/api/admin/subjects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
}

export function changeSubjectType(id, body) {
  return apiFetch(`/api/admin/subjects/${encodeURIComponent(id)}/change-type`, {
    method: 'POST',
    body,
  });
}

export function deleteSubject(id) {
  return apiFetch(`/api/admin/subjects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function createBehaviorGroup(body) {
  return apiFetch('/api/admin/behavior-groups', { method: 'POST', body });
}

export function createBehavior(body) {
  return apiFetch('/api/admin/behaviors', { method: 'POST', body });
}

export function updateBehavior(value, body) {
  return apiFetch(`/api/admin/behaviors/${encodeURIComponent(value)}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteBehavior(value) {
  return apiFetch(`/api/admin/behaviors/${encodeURIComponent(value)}`, {
    method: 'DELETE',
  });
}

export function createOption(body) {
  return apiFetch('/api/admin/options', { method: 'POST', body });
}

export function updateOption(kind, value, body) {
  return apiFetch(
    `/api/admin/options/${encodeURIComponent(kind)}/${encodeURIComponent(value)}`,
    { method: 'PATCH', body }
  );
}

export function deleteOption(kind, value) {
  return apiFetch(
    `/api/admin/options/${encodeURIComponent(kind)}/${encodeURIComponent(value)}`,
    { method: 'DELETE' }
  );
}

export function setEnablement(slug, body) {
  return apiFetch(
    `/api/admin/aviaries/${encodeURIComponent(slug)}/enablement`,
    {
      method: 'PUT',
      body,
    }
  );
}

export function fetchConfigDiff() {
  return apiFetch('/api/admin/config/diff');
}

export function publishConfig(body) {
  return apiFetch('/api/admin/config/publish', { method: 'POST', body });
}
