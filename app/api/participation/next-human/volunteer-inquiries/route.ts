import { NextRequest, NextResponse } from "next/server";

const participationOrigin = process.env.PARTICIPATION_API_ORIGIN || "http://127.0.0.1:3002";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${participationOrigin}/api/participation/next-human/volunteer-inquiries`, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") || "application/json" },
      body: await request.text(),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("NEXT HUMAN participation proxy failed", error);
    return NextResponse.json({ error: "The participation service is temporarily unavailable." }, { status: 503 });
  }
}
