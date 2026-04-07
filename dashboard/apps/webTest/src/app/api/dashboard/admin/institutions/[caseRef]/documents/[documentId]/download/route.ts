import { proxyApiRequest } from "../../../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    caseRef: string;
    documentId: string;
  }>;
};

function encodePath(caseRef: string, documentId: string) {
  return `/dashboard/admin/institutions/${encodeURIComponent(caseRef)}/documents/${encodeURIComponent(documentId)}/download`;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { caseRef, documentId } = await context.params;

  return proxyApiRequest(request, {
    path: encodePath(caseRef, documentId),
    method: "GET",
  });
}
