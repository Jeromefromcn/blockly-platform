const BASE = '';

async function request(method, path, body, headers = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: { ...headers },
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined && body !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, options);

  if (res.status === 401) {
    // Redirect to login unless already there
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  return res;
}

export function apiGet(path) {
  return request('GET', path);
}

export function apiPost(path, body) {
  return request('POST', path, body);
}

export function apiPut(path, body) {
  return request('PUT', path, body);
}

export function apiPatch(path, body) {
  return request('PATCH', path, body);
}

export function apiDelete(path) {
  return request('DELETE', path);
}
