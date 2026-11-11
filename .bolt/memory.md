# Project memory

## Product intent & audience

- Production-grade Next.js website with an About page featuring hero video content showing people/portraits
- Visual quality and complete, professional presentation are priorities

## Brand personality & voice

- Professional, detail-oriented; values polished media presentation
- Communicates fixes and rationale clearly to non-technical stakeholders

## Visual design & UX direction

- Hero video sections use portrait-oriented video content
- For portrait videos with people, use `object-position: center top` to anchor from the top edge and prevent head cropping; natural crop falls at the bottom
- Enhance perceived video clarity with subtle CSS filters (slight contrast, saturation, brightness increases) — avoid over-processed looks
- Stack: Tailwind CSS, shadcn/ui, Lucide React icons; no extra UI/icon packages unless explicitly requested

## Decisions, constraints & rationale

- Next.js App Router; components using hooks must include `"use client"` directive
- Video cropping fixed via CSS `object-position` rather than re-encoding source video — non-destructive and instant
- CSS filters chosen over heavy video processing for a clean, professional look without artifacts
- Avoid hydration attribute warnings (e.g., `class`, `style` server/client mismatch)

## Open questions & assumptions

- Whether bottom cropping of the About hero video cuts off important content — user asked to confirm on live page
- Whether other pages contain similar portrait video sections needing the same focal-point adjustment
- Exact source video dimensions and aspect ratio unknown; fix assumes portrait orientation