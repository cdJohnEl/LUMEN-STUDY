import { fail, requireUser } from "@/lib/server/admin";
import { groqJSON } from "@/lib/server/groq";
import { OUTLINE_SYSTEM } from "@/lib/server/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireUser(req);
    const { pages, previous } = (await req.json()) as {
      pages: { n: number; text: string }[];
      previous: string[];
    };
    const body = pages.map((p) => `[Page ${p.n}]\n${p.text}`).join("\n\n").slice(0, 9000);
    const user = `Topics already identified so far (last few): ${JSON.stringify((previous || []).slice(-8))}\n\nPages:\n${body}`;
    const out = await groqJSON<{ objectives?: string[]; topics?: any[] }>({
      system: OUTLINE_SYSTEM,
      user,
      maxTokens: 1800,
      temperature: 0.2,
    });
    return Response.json({ objectives: out.objectives || [], topics: out.topics || [] });
  } catch (e) {
    return fail(e);
  }
}
