# Snapshot Builder

A Next.js web app for building a weekly LinkedIn newsletter ("Snapshot") in a repeatable, step-by-step workflow.

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install and run

```bash
cd snapshot-builder
npm install
npx prisma db push     # Creates the SQLite database
npm run dev             # Starts on http://localhost:3000
```

### Environment variables

Copy `.env` (already provided) or create your own:

```
DATABASE_URL="file:./dev.db"
AI_PROVIDER="mock"         # "mock" or "openai"
OPENAI_API_KEY=""           # Required only if AI_PROVIDER=openai
```

## Workflow

Each "Issue" represents one Sunday edition. The builder walks through 6 steps:

| Step | What happens |
|------|-------------|
| **A. Add Links** | Paste URLs collected during the week. Add optional tone notes and voice memos. URL metadata is fetched automatically. |
| **B. Select 3** | Pick exactly 3 links for the issue (auto-skipped if 3 or fewer). |
| **C. Generate Draft** | AI generates title options, "Why it matters", and "My thoughts" for each link. All text is editable. |
| **D. Events** | Add upcoming events for the "To keep an eye on" section with provocative question descriptions. |
| **E. Shorten Links** | All URLs are shortened via TinyURL API for the "Read more here" section. |
| **F. Export** | Generate final text (plain text or Markdown), edit inline, copy to clipboard, or download. |

## Project structure

```
snapshot-builder/
  prisma/
    schema.prisma          # Data models: Issue, LinkItem, EventItem, GeneratedSection, Export
  src/
    app/
      layout.tsx           # Root layout with header
      page.tsx             # Redirects to /issues
      globals.css          # Tailwind + CSS variables
      issues/
        page.tsx           # Issue list + create button
        [id]/
          page.tsx         # Issue builder (all 6 steps)
    components/
      ui/                  # shadcn-style base components (Button, Input, Card, etc.)
      step-progress.tsx    # Workflow step navigation bar
      step-links.tsx       # Step A: Add links
      step-select.tsx      # Step B: Select final 3
      step-generate.tsx    # Step C: Generate & edit draft
      step-events.tsx      # Step D: Add events
      step-shorten.tsx     # Step E: Shorten links
      step-export.tsx      # Step F: Export final text
    lib/
      db.ts                # Prisma client singleton
      utils.ts             # cn() utility
      url-metadata.ts      # URL scraping (title + description)
      tinyurl.ts           # TinyURL shortening
      ai/
        provider.ts        # AIProvider interface
        mock-provider.ts   # Deterministic mock content
        openai-provider.ts # OpenAI stub (TODO)
        index.ts           # Provider factory
      actions/
        issues.ts          # CRUD for issues
        links.ts           # Add/remove/select links, audio upload
        generate.ts        # AI draft generation, section editing
        events.ts          # CRUD for events
        shorten.ts         # Bulk URL shortening
        export.ts          # Build final newsletter text
    types/
      index.ts             # Shared TypeScript types
```

## AI providers

The app uses a provider abstraction (`AIProvider` interface). Two implementations exist:

- **MockAIProvider** (default): Returns deterministic placeholder content. No API keys needed.
- **OpenAIProvider**: Stub with TODO markers. Set `AI_PROVIDER=openai` and `OPENAI_API_KEY` to use once implemented.

## Next steps

- [ ] Implement OpenAI provider with proper prompts enforcing newsletter style rules
- [ ] Audio transcription (Whisper API or similar) for voice memos
- [ ] Web search integration for auto-suggesting events
- [ ] Auto-suggest link candidates when fewer than 3 are provided
- [ ] Authentication (the code is structured to add auth middleware easily)
- [ ] Rich text editor for section editing
- [ ] LinkedIn API integration for direct publishing
- [ ] Drag-and-drop link reordering
- [ ] Issue templates and recurring schedule management
- [ ] Email preview mode
