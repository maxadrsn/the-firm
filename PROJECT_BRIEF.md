# The Firm — project brief

A narrative detective game set in East End London, 1966.
Working title. Feed this file to Claude Code as starting context.

---

## 1. Premise

You are a Detective Inspector at Scotland Yard, C Division, working out of a
cramped office off Commercial Street. Each case arrives as a buff folder on your
desk. You read statements, request lab work, re-interview witnesses, and file a
conclusion.

Every case carries two questions, not one:

1. **Who did it?**
2. **Is it connected to the Firm?**

The second question is the spine of the game. The Firm is the organisation that
runs protection in Bethnal Green and Whitechapel. Some killings are theirs. Some
merely look like theirs. Some are theirs but dressed up as domestic. And a few
are ordinary murders that half the station *wants* attributed to the Firm,
because a Firm case gets resources and a domestic gets a shrug.

The player files a verdict on both axes. Getting the first right and the second
wrong still costs you.

---

## 2. Setting rules

**Use fictional analogues, not real people.** Do not name the Kray twins or any
real historical figure. Invent the Firm and its leadership (e.g. the Vasey
brothers, out of a snooker hall on Vallance Road). This avoids legal and taste
problems entirely and — more importantly — frees the writing from historical
accuracy. The era is real; the people are not.

**Period tech constraints (these are gameplay, not decoration):**

- No DNA. No CCTV. No mobile phones. No computers, anywhere, ever.
- Fingerprints: yes, but only useful against someone already on file at the
  Criminal Record Office. An unknown print is a dead end until you have a
  suspect to match it to.
- Blood: ABO grouping only. It can **exclude** a suspect, never identify one.
  This is a superb puzzle mechanic — use it constantly.
- Ballistics: comparison microscopy works. Firearms are rare in London; a gun
  in a case is itself a strong signal.
- Time of death: estimated from body temperature and rigor, accurate to roughly
  ±2 hours. Never precise. Alibis must be reasoned about in windows.
- Communication: landlines, phone boxes, police radio, telex. Records are paper.
  Reports are typed with carbon copies.

**Recurring texture:** protection rackets, unlicensed drinking clubs, snooker
halls, the docks winding down, West End nightclubs where the East End money goes
to be seen, boxing gyms, bomb sites still not rebuilt twenty years on, the
approaching 1966 World Cup on every radio.

**Corruption as a system, not a twist.** Some officers are on the Firm's
payroll. This should be a persistent mechanic: information the player logs in
certain places leaks, and witnesses change their statements or disappear. The
player gradually learns which channels are safe.

---

## 3. Core loop

1. A case folder lands on the desk.
2. Read the initial documents: incident report, scene notes, first statements.
3. Act: request forensics, re-interview a witness, pull a criminal record,
   check an alibi, put a name to the card index.
4. Actions take **time**. Requests come back in one or more in-game days.
5. New documents arrive, contradicting old ones.
6. File the verdict: perpetrator, method, motive, and Firm-connected yes/no.

**Anti-guessing rule:** the verdict is only checked when all four slots are
filled, and the game reports only *how many* are correct, not which. Borrowed
from *Return of the Obra Dinn*. Without this, players brute-force the answer and
the game is worthless. Do not skip it.

**Contradiction is the primary verb.** The player's main action is noticing that
document A and document B cannot both be true. Build the UI around comparing two
documents side by side.

---

## 4. Interface — the desk

No fake operating system. The screen is a **top-down view of a desk**, 1966.

**The desk surface holds:**

| Object | Function |
|---|---|
| Buff case folder | opens the current case's documents |
| Card index drawer | search the Criminal Record Office by name, alias, or method |
| Black Bakelite telephone | rings when something happens; make requests |
| In-tray | new documents arrive here, physically stacking up |
| Notebook | player's own notes, freeform text |
| Corkboard above the desk | pin documents, draw string between them |
| Desk calendar | shows the current in-game date; advances when you act |
| Ashtray, cold tea, brass lamp | pure decoration, and worth including |

**Interaction grammar:** click an object → it opens over the desk. Clicking a
document from the folder lays it on the blotter. **Any document can be pinned to
the left half of the screen** so a second can be read beside it. That split view
is the single most important feature in the game — it is how deduction happens.

**Visual direction:**

- Palette: manila buff, ink blue, oxblood, tobacco brown, green leather, off-white paper.
- Typed reports: monospace, slightly uneven baseline, the odd struck-through
  correction. Carbon copies are fainter and slightly blue.
- Handwritten items (margin notes, a constable's pocketbook): a script face.
- Newspapers: condensed serif headlines, dense columns.
- Photographs: black and white, high contrast, white border, scalloped edge.
- Documents sit at very slight rotations (±1.5°), never perfectly square.

**Readability rule:** period chrome, modern legibility. No CRT filters, no heavy
scan noise, no low-contrast beige-on-beige. The player reads for hours. If a
texture makes the text harder to read, delete the texture.

---

## 5. Document types

Each is a distinct template with its own letterhead and layout:

- Incident report (uniformed officer, first on scene)
- Scene examination (measurements, photographs, items recovered)
- Post-mortem report (formal, clinical, from the pathologist)
- Witness statement (first person, signed, often self-serving)
- Record of interview (Q&A transcript, the main source of lies)
- Criminal Record Office extract (priors, aliases, known associates)
- Forensic report (fingerprints, blood grouping, fibres, ballistics)
- Internal memo (from your superintendent — pressure, deadlines, warnings)
- Newspaper clipping (public narrative, usually wrong)
- Anonymous note (rare, always significant)

---

## 6. Data model

A case is a JSON file. Logic in the data, prose in the data, nothing generated
at runtime.

```json
{
  "id": "case-04",
  "title": "The Vallance Road fire",
  "opens": "1966-04-12",
  "solution": {
    "perpetrator": "lavigne",
    "method": "blunt-force",
    "motive": "debt",
    "firm_connected": false
  },
  "characters": [
    {
      "id": "lavigne",
      "name": "Ernest Lavigne",
      "role": "groundsman",
      "truths": ["was at the yard until 21:40"],
      "lies": [
        {
          "claim": "had not entered the glasshouse since Tuesday",
          "refuted_by": ["doc-07", "doc-11"]
        }
      ]
    }
  ],
  "documents": [
    {
      "id": "doc-03",
      "type": "post-mortem",
      "title": "Post-mortem — E. Marsh",
      "available_from": "day-1",
      "requires": null,
      "keywords": ["glasshouse", "soil", "blunt"],
      "body": "..."
    },
    {
      "id": "doc-11",
      "type": "forensic",
      "title": "Soil comparison",
      "available_from": "day-3",
      "requires": "action:request-soil-analysis",
      "keywords": ["soil", "glasshouse"],
      "body": "..."
    }
  ],
  "contradictions": [
    {
      "a": "doc-05:para-2",
      "b": "doc-11:para-1",
      "unlocks": "doc-14",
      "note": "Lavigne's account of his movements against the soil analysis"
    }
  ],
  "actions": [
    {
      "id": "request-soil-analysis",
      "label": "Request soil comparison",
      "available_after": "doc-03",
      "delay_days": 2,
      "delivers": "doc-11"
    }
  ],
  "red_herrings": [
    {
      "doc": "doc-08",
      "suggests": "firm_connected",
      "resolved_by": "doc-14"
    }
  ]
}
```

Every case must contain at least one **red herring pointing at the Firm**, and
the campaign overall should have cases in all four quadrants: Firm and obvious,
Firm and disguised, not-Firm but looks it, not-Firm and plain.

---

## 7. Technical

- Plain HTML, CSS and vanilla JS, or a light React setup. No game engine.
- Everything is documents, layout, and state — the DOM is the right tool.
- Cases live as JSON in `/cases`, loaded at runtime. Adding a case must never
  require touching engine code.
- Save state in a JSON blob: current case, current in-game date, documents
  received, actions taken, notes written, pins on the board.
- **No LLM calls at runtime.** The model is an authoring tool, used offline to
  write document prose from a case skeleton. The shipped game is fully static
  and deterministic.

Suggested structure:

```
/engine      desk shell, document viewer, split view, card index, clock
/cases       one JSON file per case
/assets      fonts, letterheads, photographs, textures
/authoring   scripts for generating and validating case files
```

---

## 8. Build order

1. **Document viewer.** One hardcoded case, four documents, plain list, no desk.
   Prove that reading is pleasant before anything else.
2. **Split view.** Pin one document, read another alongside.
3. **The desk shell.** Replace the list with the desk. Folder, in-tray, calendar.
4. **Time and actions.** Requests, delays, documents arriving on later days.
5. **Verdict system.** Four slots, batch verification, correct-count only.
6. **Card index.** Cross-case search by name and alias.
7. **Corkboard.** Pin and connect.
8. **Case two.** This is the real test — if adding a case requires engine
   changes, the data model is wrong. Fix it now, not at case ten.

**Write case one entirely by hand before writing any engine code.** All the
documents, all the lies, all the contradictions, as plain text files. You will
discover the data model you actually need instead of the one you imagined.

---

## 9. Where the model helps

Good uses:
- Writing forty witness statements in distinct period voices from a skeleton.
- Generating plausible 1966 East End names, addresses, pub names, occupations.
- Formatting a post-mortem report in the correct clinical register.
- Building the engine, the split view, the desk layout.

Bad uses:
- Inventing the case logic. Author the solution and the lie structure yourself,
  or you get cases that don't hold together.
- Anything at runtime.

---

## 10. Scope warning

Case one will take far longer than you expect. Cases two through five will be
five times faster, because the templates and engine exist. Do not design a
twelve-case campaign before case one is playable end to end.
