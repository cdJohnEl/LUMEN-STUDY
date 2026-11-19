import { fail, requireUser } from "@/lib/server/admin";
import { groqJSON } from "@/lib/server/groq";
import { FINALIZE_SYSTEM } from "@/lib/server/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireUser(req);
    const { topics, objectives, fileName } = await req.json();
    const digest = (topics as any[])
      .map((t) => `- ${t.title} (${t.module}): ${(t.keyPoints || []).slice(0, 3).join("; ")}`)
      .join("\n")
      .slice(0, 8000);
    const user = `File name: ${fileName}\nStated objectives: ${JSON.stringify(objectives || [])}\nTopics:\n${digest}`;
    const out = await groqJSON<{ title?: string; gaps?: any[] }>({
      system: FINALIZE_SYSTEM,
      user,
      maxTokens: 900,
      temperature: 0.1,
    });
    return Response.json({ title: out.title || fileName, gaps: out.gaps || [] });
  } catch (e) {
    return fail(e);
  }
}
