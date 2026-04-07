const DEFAULT_API_BASE_URL = "http://localhost:3002";

function resolveApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

  try {
    return new URL(baseUrl);
  } catch {
    throw new Error(`Invalid API base URL: ${baseUrl}`);
  }
}

type ProxyApiOptions = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: Record<string, unknown> | FormData;
};

function isJsonBody(
  value: Record<string, unknown> | FormData | undefined,
): value is Record<string, unknown> {
  if (!value) {
    return false;
  }
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return false;
  }
  return true;
}

function cloneUpstreamResponse(upstreamResponse: Response) {
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}

async function forwardToTarget(request: Request, targetUrl: URL, options: ProxyApiOptions) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.delete("host");

  if (isJsonBody(options.body)) {
    headers.set("content-type", "application/json");
  } else if (options.body) {
    // Let fetch generate the multipart boundary for forwarded FormData.
    headers.delete("content-type");
  }

  const upstreamResponse = await fetch(targetUrl, {
    method: options.method ?? request.method,
    headers,
    body: isJsonBody(options.body) ? JSON.stringify(options.body) : options.body,
    cache: "no-store",
  });

  return cloneUpstreamResponse(upstreamResponse);
}

export async function proxyApiRequest(request: Request, options: ProxyApiOptions): Promise<Response> {
  try {
    const baseUrl = resolveApiBaseUrl();
    const targetUrl = new URL(options.path, baseUrl);
    return await forwardToTarget(request, targetUrl, options);
  } catch (error) {
    return Response.json(
      { 
        message: "API service is unavailable. Please check API_BASE_URL or NEXT_PUBLIC_API_BASE_URL environment variables.",
        error: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 503 }
    );
  }
}
