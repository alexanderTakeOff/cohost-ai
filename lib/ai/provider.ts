import { getAiEnv, hasAiProviderConfigured } from "./env";

type JsonSchemaDefinition = {
  name: string;
  schema: Record<string, unknown>;
};

function extractJsonObject(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object.");
  }
  return raw.slice(start, end + 1);
}

async function openAiChatCompletion(input: {
  system: string;
  user: string;
  jsonSchema?: JsonSchemaDefinition;
}) {
  const env = getAiEnv();
  if (!env.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const body: Record<string, unknown> = {
    model: env.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
  };

  if (input.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: input.jsonSchema.name,
        strict: true,
        schema: input.jsonSchema.schema,
      },
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.openAiApiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const payload = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

export async function generateAiText(input: { system: string; user: string }) {
  if (!hasAiProviderConfigured()) {
    return null;
  }

  try {
    return await openAiChatCompletion(input);
  } catch (error) {
    console.error("AI text generation failed", error);
    return null;
  }
}

export async function generateAiJson<T>(input: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T | null> {
  if (!hasAiProviderConfigured()) {
    return null;
  }

  try {
    const raw = await openAiChatCompletion({
      system: input.system,
      user: input.user,
      jsonSchema: {
        name: input.schemaName,
        schema: input.schema,
      },
    });
    return JSON.parse(extractJsonObject(raw)) as T;
  } catch (error) {
    console.error("AI structured generation failed", error);
    return null;
  }
}
