// Copies the PDF.js worker into /public so the browser can load it from your own domain.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
const src = "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs";
if (existsSync(src)) {
  mkdirSync("public", { recursive: true });
  copyFileSync(src, "public/pdf.worker.min.mjs");
  console.log("PDF worker copied to public/");
}
