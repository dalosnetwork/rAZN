import { NextResponse } from "next/server";

import { proxyApiRequest } from "../_utils/proxy-api";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
      callbackURL?: string;
    };

    if (!body.email || !body.password) {
      return NextResponse.json({ message: "email and password are required" }, { status: 400 });
    }

    return proxyApiRequest(request, {
      path: "/auth/login",
      method: "POST",
      body: {
        email: body.email,
        password: body.password,
        rememberMe: body.rememberMe,
        callbackURL: body.callbackURL,
      },
    });
  } catch {
    return NextResponse.json({ message: "invalid request body" }, { status: 400 });
  }
}
