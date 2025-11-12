/**
 * Safe JSON fetch utility with unified error handling
 * Prevents "Unexpected token '<'" errors by validating response content-type
 * Only throws user-friendly error messages
 */
export async function safeJsonFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const text = await res.text();
  const ct = res.headers.get('content-type') || '';

  // Check if response is JSON
  if (!ct.includes('application/json')) {
    throw new Error(`HTTP ${res.status} non-JSON: ${text.slice(0, 200)}`);
  }

  // Parse JSON safely
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON parse error: ${String(e)} | body: ${text.slice(0, 200)}`);
  }

  // Check for HTTP errors or API error field
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}
