import { NextResponse } from "next/server";

import { proxyApiRequest } from "../_utils/proxy-api";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      callbackURL?: string;
    };

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ message: "name, email and password are required" }, { status: 400 });
    }

    return proxyApiRequest(request, {
      path: "/auth/register",
      method: "POST",
      body: {
        name: body.name,
        email: body.email,
        password: body.password,
        callbackURL: body.callbackURL,
      },
    });
  } catch {
    return NextResponse.json({ message: "invalid request body" }, { status: 400 });
  }
}
