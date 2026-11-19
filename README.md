# Lumen: your AI study companion (PWA)

Upload a course PDF. Lumen reads it, finds the topics, teaches each one, quizzes you with hidden answers, grades you, re-teaches your weak spots, plans your sessions, reminds you, and runs a Focus Mode.

**Stack:** Next.js 14 (App Router, TypeScript, Tailwind) · Firebase Auth + Firestore · Groq (AI, server-side only) · Firebase Cloud Messaging (push) · Google Calendar API · Vercel free tier.

**What was tested here:** TypeScript check, production build, and PDF text extraction + batching on your GST111 "Noun" deck (23 pages, 2 AI batches). It was **not** run against your live Firebase or Groq accounts, so follow the checklist in step 8 on first run.

---

## 1. Run it locally

```bash
npm install
cp .env.example .env.local     # then fill it in (steps 2 to 5)
npm run dev                    # http://localhost:3000
```

## 2. Firebase project (free Spark plan is enough)

1. Go to https://console.firebase.google.com and create a project.
2. **Authentication > Sign-in method:** enable **Google**.
3. **Authentication > Settings > Authorized domains:** add your Vercel domain once you have it.
4. **Firestore Database:** create a database (production mode). Then open the **Rules** tab and paste the contents of `firestore.rules`, and Publish. *This file is what keeps quiz answers hidden and your data private. Do not skip it.*
5. **Project settings > General > Your apps:** add a **Web app**. Copy the config values into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
6. **Project settings > Cloud Messaging > Web Push certificates:** generate a key pair. Copy it into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
7. **Project settings > Service accounts > Generate new private key.** From the downloaded JSON copy `project_id`, `client_email`, `private_key` into `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (keep the quotes and the `\n` characters). Never commit this file.

## 3. Groq

Create a key at https://console.groq.com and put it in `GROQ_API_KEY`. `GROQ_MODEL` defaults to `llama-3.3-70b-versatile`. Groq changes its model list often, so if you see a "model not found" error, check https://console.groq.com/docs/models and update that one variable.

Free-tier limits are tight. Lumen sends small batches and retries automatically when rate limited, so a long PDF just takes longer instead of failing.

## 4. Keep the AI routes for you only

Set `ALLOWED_EMAILS=your@gmail.com` (comma-separate more later). Anyone else who signs in can browse the UI but cannot spend your Groq quota. Leave it empty when you open the app to other students.

## 5. Google Calendar sync

1. Google Cloud Console (same project as Firebase) > **APIs & Services > Library:** enable **Google Calendar API**.
2. **OAuth consent screen:** add the scope `https://www.googleapis.com/auth/calendar.events` and add your Google account under **Test users**.
3. In the app: Settings > Connect Google Calendar, then Study plan > Sync.

Google hands out the calendar token only at sign-in, so it lasts about an hour. Connect right before you sync. If you later invite other students, Google requires app verification for this sensitive scope.

## 6. Deploy to Vercel (free)

1. Push this folder to GitHub, then import it at https://vercel.com/new.
2. Add every variable from `.env.example` in **Settings > Environment Variables**. Set `CRON_SECRET` to a long random string.
3. Deploy. Add the resulting domain to Firebase **Authorized domains** (step 2.3).

## 7. Reminders (the part that needs a timer)

Vercel's free plan only runs a cron once a day, so use a free pinger that calls this URL every minute or five:

```
GET https://YOUR-APP.vercel.app/api/cron/reminders
Header  Authorization: Bearer YOUR_CRON_SECRET
```

Pick one: **cron-job.org** (every 1 minute, most punctual), or the included **GitHub Action** `.github/workflows/reminders.yml` (add repo secrets `APP_URL` and `CRON_SECRET`; runs about every 5 minutes).

On Android: open the deployed site in Chrome, install it ("Add to Home screen"), then Settings > Turn on notifications > Send a test.

## 8. First-run checklist

1. Sign in with Google.
2. Library > upload your GST111 PDF. You should see ~8 topics and a "Missing from your material" note about *material nouns* (the deck promises six categories but never teaches that one).
3. Open a topic > Teach me > Test myself > submit. Confirm a score, per-question explanations and re-teaching appear.
4. Plan a session 3 minutes ahead, turn on notifications, and trigger the cron URL once by hand.
5. Focus > start a 5-minute session, switch apps, come back, and check the "left the app" counter.

## How it maps to your master prompt

| Master prompt rule | Where it lives |
|---|---|
| Course material is the primary source; label outside knowledge | `src/lib/server/prompts.ts` (PERSONA) |
| Analyse the course, topics and objectives first | `/api/outline` and `/api/outline/finalize` (adds a "gaps" check) |
| Teach foundation to advanced, exam points, traps | `/api/lesson` |
| 10 questions per subtopic, answers hidden | `/api/quiz/generate` (answer key stored where the browser cannot read it) |
| Grade, explain every answer, find gaps, re-teach | `/api/quiz/grade` |
| Revision guide and mock exam | `/api/revision`, `/courses/[id]/mock` |

## Focus Mode: what it can and cannot do

A website cannot block other apps. Focus Mode gives you a full-screen timer, keeps the screen awake, warns before you close the tab, and logs every time you leave. For a real lock on Android, use the phone's own **App pinning** (the Focus screen explains how). A native Android wrapper (Capacitor) is the next step if you want in-app blocking.

## Limits worth knowing

- Scanned PDFs (photos of pages) have no text to read. Use a text-based PDF or run OCR first.
- Offline: Firestore caches what you have already opened, but new lessons and quizzes need a connection.
- A lesson is built from the pages the topic covers (about 7,000 characters per call) to stay inside free-tier limits.
- AI output can contain mistakes. Lessons label anything outside your notes, and you should check those against your lecturer's material.

## Project map

```
src/app/            screens: / (home), library, courses/[id], topics, mock, plan, focus, progress, settings, login
src/app/api/        outline, lesson, quiz/generate, quiz/grade, revision, cron/reminders, push/test
src/lib/server/     Groq client with retry, Firebase Admin, prompts
src/lib/            Firebase client, PDF reader, push, calendar, data hooks
public/             manifest, icons, firebase-messaging-sw.js
firestore.rules     security rules (publish these)
```
