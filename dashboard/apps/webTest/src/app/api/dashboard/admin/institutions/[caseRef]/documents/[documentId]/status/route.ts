import { proxyApiRequest } from "../../../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    caseRef: string;
    documentId: string;
  }>;
};

function encodePath(caseRef: string, documentId: string) {
  return `/dashboard/admin/institutions/${encodeURIComponent(caseRef)}/documents/${encodeURIComponent(documentId)}/status`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { caseRef, documentId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ message: "invalid request body" }, { status: 400 });
  }

  return proxyApiRequest(request, {
    path: encodePath(caseRef, documentId),
    method: "PATCH",
    body,
  });
}
