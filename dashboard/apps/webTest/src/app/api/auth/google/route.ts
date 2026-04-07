import { NextResponse } from "next/server";

import { proxyApiRequest } from "../../_utils/proxy-api";

type GoogleSignInBody = {
  callbackURL?: string;
  newUserCallbackURL?: string;
  errorCallbackURL?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as GoogleSignInBody;

    return proxyApiRequest(request, {
      path: "/auth/sign-in/social",
      method: "POST",
      body: {
        provider: "google",
        disableRedirect: true,
        callbackURL: body.callbackURL,
        newUserCallbackURL: body.newUserCallbackURL,
        errorCallbackURL: body.errorCallbackURL,
      },
    });
  } catch {
    return NextResponse.json({ message: "invalid request body" }, { status: 400 });
  }
}
