# GATE 2027 CSE Lecture Tracker

## Project Overview
A personal web app to track MADE EASY CS GATE 2027 Live-Online Course lectures.
The user manually manages subjects and lectures — marking them as Pending or Done, with a date watched field.
Built for a single user (expandable to multi-user via Firebase Auth).

---

## Tech Stack

| Layer       | Tool                          |
|-------------|-------------------------------|
| Framework   | Next.js 14+ (App Router)      |
| Auth        | Firebase Auth (Google Sign-In only) |
| Database    | Firebase Firestore            |
| Styling     | Tailwind CSS only             |
| UI          | shadcn/ui (compulsory)        |
| Language    | TypeScript                    |

> ⚠️ Do NOT use any CSS-in-JS, styled-components, or custom CSS files.
> ⚠️ Every UI element must use shadcn/ui components + Tailwind utility classes only.

---

## Firestore Data Structure

```
users/
  {userId}/                        ← created on first Google login
    subjects/
      {subjectId}/
        - name: string             ← e.g. "Theory of Computation"
        - order: number            ← display order
        - createdAt: timestamp

      lectures/
        {lectureId}/
          - subjectId: string      ← reference to parent subject
          - lectureNumber: string  ← e.g. "L12"
          - topic: string          ← e.g. "Grammar"
          - status: "pending" | "done"
          - dateWatched: timestamp | null
          - order: number
          - createdAt: timestamp
```

---

## Pages & Routes

### `/` — Landing Page
- Simple centered page
- App name + tagline
- "Sign in with Google" button (shadcn Button)
- If already logged in → redirect to `/dashboard`

### `/dashboard` — Dashboard
- Navbar with user avatar + sign out button
- Grid of subject cards (shadcn Card)
- Each card shows:
  - Subject name
  - Progress bar (shadcn Progress) — e.g. 8/13 Done
  - Percentage text
  - "View Lectures" button → goes to `/subject/[id]`
- Floating "+" button → opens Add Subject dialog (shadcn Dialog)

### `/subject/[id]` — Subject Detail Page
- Back button → `/dashboard`
- Subject name as heading
- Table (shadcn Table) with columns:
  - # (lecture number)
  - Topic
  - Status (shadcn Badge — green "Done" / gray "Pending")
  - Date Watched (date string or "—")
  - Actions (Edit / Toggle status buttons)
- "Add Lecture" button → opens Add Lecture dialog
- Clicking status badge toggles Pending ↔ Done
- When marked Done → dateWatched auto-fills with today's date

---

## Key Behaviors

1. **Google Sign-In only** — no email/password
2. **Auto date** — when lecture toggled to Done, dateWatched = today automatically
3. **Manual date override** — user can edit dateWatched manually via date picker (shadcn Popover + Calendar)
4. **Add Subject** — Dialog with input for name, auto-assigns order
5. **Add Lecture** — Dialog with fields: Lecture Number, Topic
6. **Edit Lecture** — Inline edit dialog for topic name and lecture number
7. **Delete Subject / Lecture** — with shadcn AlertDialog confirmation
8. **Order** — subjects and lectures maintain insertion order (by `order` field)
9. **Real-time** — use Firestore `onSnapshot` for live updates

---

## Folder Structure

```
/app
  /dashboard
    page.tsx
  /subject
    /[id]
      page.tsx
  layout.tsx
  page.tsx                  ← Landing / Sign-in

/components
  /ui                       ← shadcn auto-generated components
  SubjectCard.tsx
  LectureTable.tsx
  AddSubjectDialog.tsx
  AddLectureDialog.tsx
  EditLectureDialog.tsx
  Navbar.tsx

/lib
  firebase.ts               ← Firebase init
  auth.ts                   ← Auth helpers
  firestore.ts              ← Firestore CRUD helpers

/hooks
  useAuth.ts                ← Current user hook
  useSubjects.ts            ← Realtime subjects hook
  useLectures.ts            ← Realtime lectures hook

/types
  index.ts                  ← Subject, Lecture TypeScript types
```

---

## TypeScript Types

```ts
// types/index.ts

export type Status = "pending" | "done";

export interface Subject {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
}

export interface Lecture {
  id: string;
  subjectId: string;
  lectureNumber: string;   // "L1", "L2" etc.
  topic: string;
  status: Status;
  dateWatched: Date | null;
  order: number;
  createdAt: Date;
}
```

---

## Firebase Setup Notes

- Project: Firebase Console → create project
- Enable: **Google Sign-In** under Authentication
- Enable: **Firestore** in production mode
- Add Firebase config to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## shadcn Components Required

Install these before starting:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add popover
npx shadcn@latest add calendar
npx shadcn@latest add avatar
npx shadcn@latest add dropdown-menu
npx shadcn@latest add separator
npx shadcn@latest add tooltip
```

---

## AI Prompt (use this with any AI coding assistant)

```
You are building a Next.js 14 App Router project called "GATE 2027 CSE Lecture Tracker".

STRICT RULES — follow these always:
- Use Tailwind CSS only for all styling. No custom CSS files, no CSS modules, no styled-components.
- Use shadcn/ui components for every UI element (Button, Card, Dialog, Table, Badge, Progress, etc.)
- Use TypeScript strictly.
- Use Firebase Auth (Google Sign-In only) for authentication.
- Use Firestore as the database with realtime onSnapshot listeners.
- App Router only — no pages/ directory.
- All Firestore data lives under users/{userId}/ — never at root level.

PROJECT CONTEXT:
This is a personal lecture tracking app for a GATE 2027 CS student.
The user manually adds subjects (e.g. "Theory of Computation") and lectures (L1, L2... with topic names).
Each lecture has a status: "pending" or "done", and a dateWatched field.
When a lecture is marked Done, dateWatched auto-fills with today's date.
The user can also manually edit the dateWatched via a date picker.

DATA MODEL:
users/{userId}/subjects/{subjectId} → { name, order, createdAt }
users/{userId}/lectures/{lectureId} → { subjectId, lectureNumber, topic, status, dateWatched, order, createdAt }

PAGES:
1. / → Landing page with Google Sign-In. Redirect to /dashboard if logged in.
2. /dashboard → Subject cards with progress bars. Add Subject button.
3. /subject/[id] → Lecture table for a subject. Add/Edit/Delete lectures. Toggle status.

Refer to MAIN.md for full details before writing any code.
Always ask before assuming anything not covered in MAIN.md.
```

---

## Current Subjects (from MADE EASY course)

Seed these manually in the app after first login:

1. Aptitude & Reasoning
2. Engineering Mathematics
3. Theory of Computation
4. Algorithms
5. General English

> More subjects will be added as the course progresses.

---

## Status
- [ ] Firebase project setup
- [ ] Next.js + Tailwind + shadcn initialized
- [ ] Auth (Google Sign-In)
- [ ] Dashboard page
- [ ] Subject detail page
- [ ] Add/Edit/Delete subjects
- [ ] Add/Edit/Delete lectures
- [ ] Toggle status + auto date
- [ ] Manual date picker
