import { proxyApiRequest } from "../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

function encodePath(documentId: string) {
  return `/dashboard/kyb/documents/${encodeURIComponent(documentId)}/upload`;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { documentId } = await context.params;
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: encodePath(documentId),
    method: "POST",
    body: formData,
  });
}
