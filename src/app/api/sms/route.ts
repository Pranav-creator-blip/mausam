import { NextResponse } from "next/server";
import { sendSmsAlert } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      message?: string;
      to?: string;
      type?: "rain" | "heavy-rain" | "temperature" | "weather-warning";
    };

    if (!body.message || !body.message.trim()) {
      return NextResponse.json({ error: "A message body is required for SMS alerts." }, { status: 400 });
    }

    const result = await sendSmsAlert({
      to: body.to,
      message: body.message,
      type: body.type,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMS alert delivery failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
