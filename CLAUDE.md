# The Firm — project rules

A narrative detective game. East End London, 1966. The player is a Detective
Inspector reading case documents at their desk and filing a verdict.

Full design doc: `docs/PROJECT_BRIEF.md` — read it before working on the desk
interface, the case schema, or any document template.

## Non-negotiable

**No LLM calls at runtime.** The shipped game is fully static and
deterministic. The model is an authoring tool used offline to write document
prose. Never add an API call to the game.

**No real historical people.** The Kray twins and every other real figure are
off limits by name. The organisation is the Firm, run by the fictional Vasey
brothers. The era is real; the people are not.

**Cases are data, never code.** Cases live as JSON in `/cases`. Adding a case
must never require touching anything in `/engine`. If it does, the schema is
wrong — fix the schema rather than special-casing the case.

**Period tech constraints are gameplay, not flavour.** Never write a puzzle that
violates them:
- No DNA, no CCTV, no mobile phones, no computers anywhere on screen
- Fingerprints only match against someone already on file
- Blood is ABO grouping only — it excludes a suspect, it never identifies one
- Time of death is a window of roughly ±2 hours, never a precise time
- Records are paper, reports are typed with carbon copies

**Readability beats texture.** Period chrome, modern legibility. No CRT
filters, no scan noise, no low-contrast beige on beige. If a texture makes body
text harder to read, remove it.

**Verdict verification reports the count only.** Perpetrator, method, motive,
and Firm-connected are checked together, and the game says how many are right,
never which. This is what stops brute-forcing. Do not "improve" it into
per-field feedback.

## Conventions

- Plain HTML, CSS and vanilla JS. No game engine, no build step unless asked.
- The split view — pin one document, read another beside it — is the core
  mechanic. Never break it when adding features.
- Documents sit at slight rotations (±1.5°), never perfectly square.
- Palette: manila buff, ink blue, oxblood, tobacco brown, green leather.
- Typed reports use a monospace face; carbon copies are fainter and bluish.
- All in-game text is British English, 1966 register. "Glasshouse", not
  "greenhouse". "Post-mortem", not "autopsy". "Motor car", "public house".

## Working style

Build one step at a time from the build order in the brief. Do not scaffold
ahead — no stub files for features that haven't been asked for yet. When a step
is done, stop and wait for review before starting the next.
