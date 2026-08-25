export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Wraps a handler: thrown Response objects (e.g. 401 from requireUser) pass through. */
export async function guard(fn: () => Promise<Response | unknown> | Response | unknown): Promise<Response> {
  try {
    const result = await fn();
    return result instanceof Response ? result : json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[sofra]", e);
    return json({ error: "server_error" }, 500);
  }
}
