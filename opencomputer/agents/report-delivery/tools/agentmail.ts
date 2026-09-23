import {
  bearer,
  defineConnection,
  defineTool,
  type DataValue,
  useSecret,
} from "@opencomputer/agent";

// AgentMail send requests use the message job id as their idempotency key.
export const agentMail = defineConnection({
  id: "agentmail-send",
  origin: "https://api.agentmail.to",
  methods: ["POST"],
  pathPrefix: "/v0/inboxes/",
  headers: {
    Authorization: bearer(useSecret("AGENTMAIL_API_KEY")),
    "Content-Type": "application/json",
  },
});

interface AgentMailSendResponse {
  message_id?: unknown;
  thread_id?: unknown;
}

function requiredRuntimeVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function requiredInputString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function dataValue(value: unknown): DataValue {
  return JSON.parse(JSON.stringify(value)) as DataValue;
}

export const sendEmail = defineTool({
  name: "agentmail_send_configured_email",
  description:
    "Send one email through the configured AgentMail inbox to the configured recipient. The recipient and credential are never model inputs.",
  input: {
    type: "object",
    properties: {
      subject: { type: "string", minLength: 1, maxLength: 200 },
      text: { type: "string", minLength: 1, maxLength: 100000 },
      idempotencyKey: {
        type: "string",
        minLength: 1,
        maxLength: 256,
        pattern: "^[A-Za-z0-9._~-]+$",
      },
    },
    required: ["subject", "text", "idempotencyKey"],
    additionalProperties: false,
  },
  async run({ input, signal }) {
    const inboxId = requiredRuntimeVariable("AGENTMAIL_INBOX_ID");
    const recipient = requiredRuntimeVariable("DELIVERY_RECIPIENT_EMAIL");
    const subject = requiredInputString(input.subject, "subject");
    const text = requiredInputString(input.text, "text");
    const idempotencyKey = requiredInputString(
      input.idempotencyKey,
      "idempotencyKey",
    );
    const response = await agentMail.fetch(
      `/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          to: [recipient],
          subject,
          text,
        }),
        ...(signal ? { signal } : {}),
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).trim().slice(0, 500);
      throw new Error(
        `AgentMail returned HTTP ${String(response.status)}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    const body = (await response.json()) as AgentMailSendResponse;
    if (typeof body.message_id !== "string" || !body.message_id) {
      throw new Error("AgentMail response is missing message_id");
    }
    return dataValue({
      messageId: body.message_id,
      threadId: typeof body.thread_id === "string" ? body.thread_id : null,
    });
  },
});
