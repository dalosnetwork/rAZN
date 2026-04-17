import { proxyApiRequest } from "../../../../../_utils/proxy-api";

type RouteContext = {
  params: Promise<{
    caseRef: string;
  }>;
};

function encodePath(caseRef: string) {
  return `/dashboard/admin/institutions/${encodeURIComponent(caseRef)}/onboard`;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { caseRef } = await context.params;

  return proxyApiRequest(request, {
    path: encodePath(caseRef),
    method: "POST",
  });
}
