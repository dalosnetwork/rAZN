import { proxyApiRequest } from "../../_utils/proxy-api";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body || typeof body !== "object") {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: "/dashboard/mint-requests",
    method: "POST",
    body,
  });
}
