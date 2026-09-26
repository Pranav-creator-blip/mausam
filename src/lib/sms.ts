export type SmsAlertInput = {
  to?: string;
  message: string;
  type?: "rain" | "heavy-rain" | "temperature" | "weather-warning";
};

export type SmsSendResult = {
  ok: boolean;
  provider: string;
  messageId?: string;
  status: "queued" | "mocked" | "error";
};

export async function sendSmsAlert(input: SmsAlertInput): Promise<SmsSendResult> {
  const to = input.to ?? process.env.SMS_PHONE_NUMBER ?? "";
  const message = input.message.trim();

  if (!message) {
    return { ok: false, provider: "mock", status: "error" };
  }

  if (!to) {
    return { ok: true, provider: "mock", status: "mocked", messageId: "mock-local-only" };
  }

  const apiKey = process.env.SMS_API_KEY;
  const accountId = process.env.SMS_ACCOUNT_ID;

  if (!apiKey || !accountId) {
    return { ok: true, provider: "mock", status: "mocked", messageId: "mock-local-only" };
  }

  const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + accountId + "/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountId}:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: process.env.SMS_FROM_NUMBER ?? process.env.SMS_PHONE_NUMBER ?? "",
      Body: message,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error("SMS provider rejected the request.");
  }

  const payload = (await response.json().catch(() => ({}))) as { sid?: string };
  return { ok: true, provider: "twilio", status: "queued", messageId: payload.sid ?? "twilio-sent" };
}
