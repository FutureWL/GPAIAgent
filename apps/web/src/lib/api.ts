// 空值时走相对路径，由 Next.js rewrites 转发到后端（前后端同域部署）
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof data === 'string' ? data : (data?.message ?? 'Request failed');
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}
