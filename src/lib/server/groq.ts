import { HttpError } from "./admin";

const URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.3-70b-versatile was shut down by Groq on 16 Aug 2026. gpt-oss-120b is Groq's replacement.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Opts = { system: string; user: string; maxTokens?: number; temperature?: number; json?: boolean };

async function call({ system, user, maxTokens = 2500, temperature = 0.3, json }: Opts): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new HttpError(500, "GROQ_API_KEY is missing on the server.");
  let model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  let triedFallback = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    // gpt-oss models "think" before answering and that thinking counts toward max_tokens,
    // so keep the thinking short and leave headroom for the real answer.
    const reasoning = model.startsWith("openai/gpt-oss");
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: reasoning ? maxTokens + 1500 : maxTokens,
        ...(reasoning ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new HttpError(502, "The AI returned an empty answer. Try again.");
      return content;
    }
    // Free tier: wait and retry when rate limited.
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Math.min((retryAfter || 6 * (attempt + 1)) * 1000, 18000));
      continue;
    }
    const text = await res.text();
    // The configured model was retired: switch to the current default once and carry on.
    if (res.status === 404 && /model_not_found/.test(text) && !triedFallback && model !== DEFAULT_MODEL) {
      triedFallback = true;
      model = DEFAULT_MODEL;
      continue;
    }
    if (res.status === 429) throw new HttpError(429, "Groq rate limit reached. Wait a minute and try again.");
    throw new HttpError(502, `Groq error ${res.status}: ${text.slice(0, 200)}`);
  }
  throw new HttpError(502, "Groq did not respond.");
}

export const groqText = (o: Omit<Opts, "json">) => call(o);

export async function groqJSON<T>(o: Omit<Opts, "json">): Promise<T> {
  const raw = await call({ ...o, json: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new HttpError(502, "The AI returned an unreadable answer. Try again.");
  }
}
