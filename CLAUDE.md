# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An interactive live-workshop site for an Arabic course ("التحول التجاري عبر الهاتف المحمول"). All UI text and content are Arabic, and the page is RTL (`<html lang="ar" dir="rtl">`). The deliverable is **one self-contained `index.html`** (vanilla JS, no framework, no bundler) that talks to a Firebase Realtime Database (`https://mobile-d6aea-default-rtdb.firebaseio.com/`) without Firebase auth.

## Commands

There's no package.json, no dependencies, no linter and no test suite. Node alone is enough.

- **Build:** `node src/build.js` regenerates `index.html` from `src/`. `index.html` is a committed build artifact. Never edit it by hand. Edit `src/` and rebuild.
- **Validate content:** `node src/parse.js` prints counts of axes, slides, exercises and chart kinds. It also flags malformed exercises: `NO ITEMS`, `MODE` (wrong individual/group mode for the format), `DUP BANK` and `NO BLANK` (fill-in-the-blank checks). Run it after editing `src/content/*.txt`.
- **Preview without touching real data:** open `index.html?demo=1`. This switches to a local in-browser mock DB stored in localStorage under the key `mcomm_demo_db`.
- **Admin panel:** the ⚙️ button, passcode `3719`.

## Architecture

**Build pipeline (`src/build.js`).** It inlines three things into an HTML template:
1. `src/styles.css`
2. `COURSE`: a frozen JSON object produced by `src/parse.js` from the content files
3. Every `src/js/*.js`, concatenated **in filename order**

All the scripts share one global scope. The numeric prefixes (`00-` through `09-`) set the load order, and later files use globals defined by earlier ones (`Store`, `Content`, `Charts`, `Scenes`, `Views`, `Router`, `App`, …). A new module file must get a prefix that places it after its dependencies. External runtime deps are Firebase compat SDK 10.13.0 and Google Fonts (Cairo, IBM Plex Sans Arabic, Noto Sans Arabic). Three libraries are lazy-loaded from cdnjs only when a PDF is generated: html2canvas, jsPDF and JSZip (`08-pdf.js`).

**Content DSL (`src/content/*.txt` → `parse.js`).** `parseAll` reads a fixed file list: `u1`…`u5.txt` and `extra.txt`. A new content file must also be added to that list. The line grammar:
- `=== AXIS <id>`, `=== ACTIVITY <id>`, `=== SURVEY <id>`, `=== LAB`
- `--- <slideType> | <title>` starts a slide.
- `+++ EX <id> | <title> | <icon> | <mode> | <format>` starts an exercise. `mode` is `individual` or `group`. `format` is `text`, `mcq`, `truefalse`, `fillblank`, `comparePairs`, …
- `key: value` sets a field. Indented lines that follow continue it.
- `- item` adds a list item. What the item means depends on the current block and on the last key seen (`highlights:`, `steps:`).
- `chart: <kind> | item | item…` defines a chart. Inside chart items, `::` separates label from description, a trailing `!` marks danger, a trailing `*` marks highlight, and `;` separates sub-items in `compare`.
- `q:` sets an MCQ question. Options are separated by `||`, and a `*` prefix marks the correct answer.

Rich fields go through `toHtml`: slide `text`/`rule`/`intro`, exercise `scenario`/`task`/`hint`/`model`, and axis `desc`. Slide IDs are generated automatically as `<axisId>s<n>`.

**Data model: defaults plus an overlay.** `COURSE` (compiled from the content files) is never mutated. Every admin edit made in the browser (content, added axes or exercises, visibility, order, site texts) is stored as a separate **overlay in Firebase**. `04-state.js` (`Store`, `Content`) merges the two at read time. Live session data also lives in `Store`: users, posts, groups and assignments, lab answers and timers, broadcast, and reset stamp.

**DB abstraction (`00-core.js`).** One interface (`watch`/`get`/`set`/`update`/`remove`/`push`/`transaction`) has two backends: real Firebase, or the localStorage demo DB. `DEMO_MODE` turns on with `?demo=1`, a missing or placeholder `databaseURL`, or a Firebase SDK that failed to load. Code should go through this interface and never call `firebase` directly.

**Rendering.** `App.render()` (`09-main.js`) produces a string of HTML: `Views[Router.cur.view].html()`. Interactions use event delegation on `data-act` / `data-go` attributes, not per-element listeners. `data-keep` preserves input values across re-renders. `Router` (`05-common.js`) uses the History API with a hash-params fallback. Admin-only views (`admin`, `axisEdit`, `exEdit`, `actEdit`) are gated by `Admin.ok()`, a sessionStorage flag. `Admin.preview()` lets the trainer see the trainee view.

**Graphics.** `Charts` (`02-charts.js`) draws SVG charts that put Arabic text inside `foreignObject` divs, so the text wraps and aligns right. `Scenes` (`03-scenes.js`) contains illustrations only, with no text. `ICONS` (`01-icons.js`) builds a self-contained `<svg>` per use, never `<use>`. These constraints exist so graphics survive html2canvas PDF capture. Keep them.

## Deployment notes (from README)

- Host `index.html` on any static host, such as Netlify Drop. In Google Sites, use **Embed → By URL**, not Embed Code.
- Do **not** publish it as a Claude.ai Artifact. Artifact pages block the Firebase connection.
- The DB rules must allow public read and write: `{ "rules": { ".read": true, ".write": true } }`.

## Repo automation

`.claude/settings.json` registers a Stop hook, `.claude/hooks/autopush.sh`. It rebuilds `index.html` when `src/` changed, commits everything with an automatic message, and pushes. **The target branch is hardcoded in the script (`BRANCH=...`)**. Check that it matches your working branch before relying on it.

`PROMPT.md` is a reusable Arabic spec/prompt for generating similar course sites. It documents the intended feature set in detail.
