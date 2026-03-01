function buildUrl(path = "", params) {
  const rawPath = String(path || "");
  const base = rawPath.startsWith("/api/") ? rawPath : rawPath.startsWith("/") ? `/api${rawPath}` : `/api/${rawPath}`;
  if (!params || typeof params !== "object") return base;

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });

  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

async function request(method, path, config = {}) {
  const url = buildUrl(path, config?.params);
  const headers = {
    "Content-Type": "application/json",
    ...(config?.headers || {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: config?.data !== undefined ? JSON.stringify(config.data) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const error = new Error(`Request failed with status ${res.status}`);
    error.status = res.status;
    error.response = { status: res.status, data };
    throw error;
  }

  return { data, status: res.status };
}

const api = {
  get(path, config = {}) {
    return request("GET", path, config);
  },
  post(path, data, config = {}) {
    return request("POST", path, { ...config, data });
  },
  put(path, data, config = {}) {
    return request("PUT", path, { ...config, data });
  },
  delete(path, config = {}) {
    return request("DELETE", path, config);
  },
};

export default api;
