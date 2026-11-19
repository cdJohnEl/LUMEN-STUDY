// Reads a PDF in the browser and returns the text of each page.
export async function extractPdf(
  file: File,
  onProgress: (done: number, total: number) => void
): Promise<string[]> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
      .join("")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    pages.push(text);
    onProgress(i, doc.numPages);
  }
  return pages;
}

// Groups pages so each AI call stays small (free-tier friendly).
export function batchPages(pages: string[], maxChars = 6000) {
  const batches: { n: number; text: string }[][] = [];
  let cur: { n: number; text: string }[] = [];
  let size = 0;
  pages.forEach((text, i) => {
    const t = text.slice(0, maxChars);
    if (cur.length && size + t.length > maxChars) {
      batches.push(cur);
      cur = [];
      size = 0;
    }
    cur.push({ n: i + 1, text: t });
    size += t.length;
  });
  if (cur.length) batches.push(cur);
  return batches;
}
