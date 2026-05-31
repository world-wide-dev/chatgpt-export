## ChatGPT Export

> “this shouldn’t need to exist… but reality currently requires it”

A local-first Chrome extension for extracting and exporting ChatGPT conversations into stable canonical snapshots.

Built from the simple desire to “just save my chats quickly,” then progressively forced into becoming a hydration-aware semantic extraction system after repeated encounters with a shape-shifting frontend runtime.

Rather than cloning the ChatGPT UI directly, the extension extracts and normalizes semantic conversation content into durable canonical representations that can later be exported deterministically as Markdown, HTML, JSON, and future formats.

---

## Version

Current version: 1.0.3

---

## Motivation

Most existing ChatGPT export approaches fall into one of two categories:

- raw DOM dumping
- screenshot/PDF capture

Both approaches tend to break over time, produce unstable output, or tightly couple exports to transient frontend implementation details.

This project instead focuses on:

- semantic preservation
- deterministic exports
- incremental persistence
- local-first storage
- resilience against frontend mutation
- reproducible archival output

The goal is not to reproduce the ChatGPT interface pixel-for-pixel.

The goal is to preserve conversations as durable structured documents.

---

## Features

- Incremental extraction and synchronization
- Hydration-aware extraction pipeline
- Stable canonical local snapshots
- Deterministic HTML export
- Deterministic Markdown export
- JSON export
- Full database dump export
- Canonical image and gallery reconstruction
- Incremental IndexedDB persistence
- Safe re-extraction and update handling
- Local-first architecture

---

## Installation

###### Option 1 — Clone repository

```bash
git clone https://github.com/world-wide-dev/chatgpt-export.git
```

###### Option 2 — Download ZIP

Download and extract the project ZIP locally.

---

## Load extension in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `chatgpt-export` directory

---

## Usage

1. Open a ChatGPT conversation or project conversation
2. Click Extract Conversation
3. Wait for extraction to complete
4. Export using one of the available formats:
   - Markdown
   - HTML
   - JSON
   - Full database dump

Re-running extraction incrementally updates the locally stored canonical snapshot and only processes newly discovered content.

The extension supports repeated extraction runs on the same conversation and automatically resumes from the latest known message boundary.

If the extension is reloaded while ChatGPT is already open, the popup may offer a page refresh option to restore communication with the content script.

When opened on unsupported pages, the extension displays guidance instead of attempting extraction.

---

## How It Works

Extraction progressively traverses a hydrated DOM snapshot and converts the conversation into stable canonical objects stored locally in the extension database.

Exporters operate exclusively on the latest successfully extracted snapshot, making exports resilient against frontend runtime and hydration changes.

The architecture intentionally separates:

```
Extraction → Persistence → Export
```

This separation allows exports to remain deterministic and reproducible without depending directly on the live ChatGPT runtime during export generation.

---

## High-Level Architecture

```
ChatGPT Runtime
        ↓
Hydration-Aware Extraction
        ↓
Semantic Normalization
        ↓
IndexedDB Persistence
        ↓
Deterministic Export Layer
        ↓
Markdown / HTML / JSON Output
```

---

## Core Architecture

| Layer | Responsibility |
| --- | --- |
| Extraction | Read and normalize semantic content from the runtime DOM |
| Persistence	| Store canonical conversation/message representations |
| Transformation	| Generate deterministic export formats |
| UI	| Browse and manage archived conversations |
| Export	| Produce Markdown, HTML, JSON, and DB snapshots |

---

## Design Philosophy

### Local-First

No backend. No server dependency. No external storage.

All extraction, persistence, and export generation happen locally inside the browser.

---

### Semantic Preservation over DOM Mirroring

The ChatGPT UI is treated as a transient rendering layer.

The extension extracts semantic content:

- paragraphs
- lists
- code blocks
- tables
- images
- blockquotes
- headings

while intentionally removing:

- layout wrappers
- action bars
- runtime-specific UI containers
- styling artifacts
- interaction controls

The resulting output is stable, portable, and independent from the original frontend structure.

---

### Canonical Snapshots as Source of Truth

The system stores normalized canonical conversation snapshots locally in IndexedDB.

Exporters never scrape the live DOM directly.

Instead:

```
extract → normalize → persist → export
```

This architecture makes exports:

- reproducible
- deterministic
- resilient against runtime mutation
- independent from hydration timing
- safe to regenerate later

Markdown, HTML, and future export formats are therefore treated as derived representations generated from canonical stored data.

---

### Idempotent Extraction

Extraction is intentionally safe to re-run.

Messages are persisted individually using stable platform-native identifiers extracted directly from the ChatGPT runtime.

This enables:

- incremental updates
- partial recovery
- safe refresh handling
- deterministic ordering
- duplicate prevention

The system favors correctness and resilience over aggressive optimization.

---

### Hydration-Aware Extraction

Modern frontend runtimes increasingly virtualize large conversations.

This means visible UI content is not always guaranteed to exist persistently in the DOM.

To remain reliable under virtualization, the exporter performs localized hydration-aware extraction by:

1. progressively traversing conversation regions
2. waiting for runtime hydration
3. extracting semantic content immediately
4. persisting normalized output incrementally

The resulting system behaves more like a streaming archival pipeline than a static DOM scraper.

---

## Extraction Strategy

### Preserved Elements

- `p`
- `ul`, `ol`, `li`
- `pre`, `code`
- `table`
- `blockquote`
- `strong`, `em`
- `a`
- `img`
- `h1–h4`
- `hr`

---

### Removed Elements

- runtime wrappers
- action bars
- copy/share controls
- layout containers
- transient UI elements
- styling-specific classes

---

### Code Block Canonicalization

All code blocks are normalized into deterministic semantic structures.

Language extraction is preserved whenever available.

The export layer then derives:

````markdown
```language
code
```
````

from canonical semantic representations.

---

### Image Preservation

Images are extracted independently from runtime wrappers and reinjected into canonical semantic structures during normalization.

This avoids runtime-specific layout instability while preserving:

- image ordering
- gallery grouping
- deterministic rendering
- portable export structure

The extraction layer intentionally avoids relying on transient frontend layout wrappers whenever possible.

Generated image messages are normalized into deterministic canonical identifiers to preserve stable extraction and incremental synchronization behavior.

---

## Persistence Model

The extension uses IndexedDB with dedicated stores for:

- conversations
- messages
- images

Messages are stored individually rather than as conversation-sized blobs.

This enables:

- incremental persistence
- partial recovery
- deterministic updates
- scalable handling of long conversations

---

## Conversation Model

```
{
  "id": "69f79886-ac48-8328-9d3a-98fa285bce9f",
  "title": "conversation-title",
  "model": "gpt-5-3",
  "first_seen_at": 1778791573306,
  "updated_at": 1778791575269,
  "last_message_id": "eac90e6a-6def-4251-9697-aef09507cd3a",
  "extracting": false
}
```

---

## Message Model

```
{
  "id": "eac90e6a-6def-4251-9697-aef09507cd3a",
  "conversation_id": "69f79886-ac48-8328-9d3a-98fa285bce9f",
  "index": 10,
  "role": "assistant",
  "model": "gpt-5-3",
  "content_html": "<p>...</p>",
  "image_ids": []
}
```

---

## Export Model

Exports are generated on demand from canonical stored representations.

The export process:

```
User triggers extraction
        ↓
Conversation hydrates progressively
        ↓
Semantic content is normalized
        ↓
IndexedDB updates incrementally
        ↓
Deterministic export generated
        ↓
Markdown / HTML / JSON snapshot downloaded
```

The resulting exports include:

- metadata manifests
- semantic code blocks
- preserved image galleries
- canonical ordering
- stable formatting

---

## HTML Export Philosophy

The HTML export intentionally behaves like a portable archival document rather than a UI replay.

Features include:

- deterministic structure
- bounded image rendering
- semantic typography
- portable CSS
- export metadata
- stable printability

The export prioritizes readability and durability over visual fidelity to the live ChatGPT interface.

---

## Design Tradeoffs

### Chosen

- semantic HTML over DOM snapshots
- local-first persistence over backend infrastructure
- deterministic exports over runtime replay
- explicit extraction flow over hidden background automation
- incremental persistence over full-conversation rewrites
- canonical representation over duplicated transformation layers

---

### Avoided

- PDF-first architecture
- screenshot-based capture
- visual DOM cloning
- backend synchronization complexity
- state-heavy frontend orchestration
- fragile UI-coupled rendering assumptions

---

## Current Features

- semantic conversation extraction
- hydration-aware traversal
- incremental IndexedDB persistence
- deterministic Markdown export
- deterministic HTML export
- JSON export
- full database dump export
- code block normalization
- language-aware fenced code blocks
- image preservation and gallery reconstruction
- conversation metadata manifests
- idempotent extraction pipeline

---

## Roadmap

### v1.1.0

- syntax highlighting
- code block copy buttons
- code export UX improvements

### v2.0.0

- conversation switching
- runtime synchronization improvements
- cross-conversation state handling
- archive lifecycle management

---

## Notes

Built while actively co-engineering extraction logic with ChatGPT itself - which, in retrospect, feels appropriately recursive.

Special thanks to the OpenAI frontend team for repeatedly evolving the ChatGPT runtime during development, transforming a straightforward exporter into a hydration-aware semantic archival system.

---

## Disclaimer

This project is not affiliated with OpenAI.

Frontend runtime structures may change over time, requiring extractor updates.

---

## Summary

This project focuses on long-term conversation durability rather than short-term UI mirroring.

The resulting system behaves less like a browser scraper and more like a semantic archival pipeline:

```
hydrate
→ normalize
→ persist
→ regenerate deterministically
```

The architecture intentionally prioritizes:

- resilience
- reproducibility
- semantic clarity
- portability
- maintainability

over visual cloning or frontend-specific assumptions.

Ultimately, the project exists because reliable conversation preservation should not depend on transient frontend state.

---

### License

MIT License – see LICENSE file for details.

Copyright © 2026 Peter Karpati (world-wide-dev)


