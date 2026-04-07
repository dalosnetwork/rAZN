const DEFAULT_API_BASE_URL = "http://localhost:3002";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function resolveApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

  try {
    return new URL(baseUrl);
  } catch {
    throw new Error(`Invalid API base URL: ${baseUrl}`);
  }
}

function cloneUpstreamResponse(upstreamResponse: Response) {
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}

async function proxyOAuthCallback(request: Request, id: string): Promise<Response> {
  try {
    const baseUrl = resolveApiBaseUrl();
    const requestUrl = new URL(request.url);
    const targetUrl = new URL(`/auth/callback/${encodeURIComponent(id)}`, baseUrl);
    targetUrl.search = requestUrl.search;

    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("host");

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const body = hasBody ? await request.text() : undefined;

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    return cloneUpstreamResponse(upstreamResponse);
  } catch (error) {
    return Response.json(
      {
        message: "API service is unavailable. Please check API_BASE_URL or NEXT_PUBLIC_API_BASE_URL environment variables.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return proxyOAuthCallback(request, id);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return proxyOAuthCallback(request, id);
}
