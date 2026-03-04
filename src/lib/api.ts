const BASE_URL = "";

function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Server nije dostupan");
  }

  if (res.status === 401) {
    clearToken();
    throw new Error("Sesija je istekla");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Greška na serveru");
  }

  return data;
}
