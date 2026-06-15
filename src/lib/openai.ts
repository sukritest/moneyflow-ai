import OpenAI from "openai";

export const isAIEnabled = Boolean(process.env.OPENAI_API_KEY);

let client: OpenAI | null = null;

/** Returns a shared OpenAI client, or null if no API key is configured. */
export function getOpenAI(): OpenAI | null {
  if (!isAIEnabled) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Calls the OpenAI Chat Completions API and returns the text response.
 * If no API key is configured, returns `fallback` so every AI feature in
 * the app keeps working end-to-end with deterministic mock data.
 */
export async function completeOrMock(params: {
  system: string;
  prompt: string;
  fallback: string;
  json?: boolean;
}): Promise<string> {
  const openai = getOpenAI();
  if (!openai) return params.fallback;

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.prompt },
      ],
      ...(params.json ? { response_format: { type: "json_object" as const } } : {}),
      temperature: 0.4,
    });
    return completion.choices[0]?.message?.content ?? params.fallback;
  } catch (err) {
    console.error("OpenAI request failed, falling back to mock data:", err);
    return params.fallback;
  }
}
