# Case 01 expansion — The Cheshire Street Killing

Implement this into `cases/case-01.json`. Change nothing in `/engine`.
If something here can't be expressed in the current schema, extend the
schema — don't special-case it in the engine.

---

## The answer

Desmond Harrow killed Bernard Coote in the third lock-up, Cheshire Street,
between midnight and 1 a.m. on the 12th April 1966, with an adjustable spanner
picked up from the floor. Motive: Coote had instructed solicitors to dissolve
the partnership, and the valuation would have exposed eighteen months of
unaccounted drawings taken by Harrow from the business account.

**Not connected to the Firm.**

---

## The four candidates

Each has a reason to suspect and one specific thing that eliminates them. Four
different instruments of elimination — this is deliberate, don't collapse them
into one.

| Candidate | Pulls toward | Cut by |
|---|---|---|
| **Desmond Harrow**, 41, partner | donkey jacket, yard access, alibi rests on his wife, group A | **nothing** |
| **Leonard Stipe**, 36, collector for the Firm | the yard paid protection; press runs the gangland line | **fingerprints** — he's on the CRO with prints on file; the partial from the spanner doesn't match |
| **Alfred Sowerby**, 48, rival dealer, Hackney | public row with Coote over a load of copper; in the Camel that night; right build | **blood group** — the attacker's stain on the bolt is group A; Sowerby is group O |
| **Cyril Bunce**, 52, debtor | owed Coote money, no alibi, seen on Cheshire Street that night | **height** — Pell saw a man "of good height"; Bunce is five foot four |

Harrow is 5'11", group A, and has no criminal record — which is why the CRO
search on the partial print came back empty. That's consistent with him, not
exculpatory. The player should be able to notice this.

---

## Documents

Existing: doc-01 post-mortem, doc-02 Pell, doc-03 Harrow, doc-04 forensic.

### Amend doc-04 (forensic report)

Add a second blood finding. Scrapings from the door bolt (Exhibit 2) yield, in
addition to the fibres, a smear of blood group **A** — not the deceased's group.
The report should note this is consistent with the assailant having cut his hand,
and repeat that grouping excludes rather than identifies, group A being shared by
something like four in ten of the population.

This is the finding that makes the whole period-forensics idea earn its place.

### New documents

**doc-05 — Statement of Nora Elizabeth Harrow.** Written in full below.

**doc-06 — Letter from Messrs. Gadsby & Pryce, solicitors.** Written in full below.

**doc-07 — Statement of Alfred Sowerby.** Belligerent, unhelpful, freely admits
the row over the copper and says he'd have said the same to Coote's face. Admits
being in the Camel and Artichoke. Volunteers a blood sample "to be shut of it".
He should be the most obviously suspicious man in the file and the most
thoroughly cleared.

**doc-08 — Criminal Record Office extract, L. Stipe.** Priors for demanding money
with menaces and wounding. Known associate of the Vasey brothers. Note that his
fingerprints are held on file. Description: 6'1".

**doc-09 — Observation report, C Division.** Records that the Cheshire Street yard
was one of several premises paying weekly to Stipe's collection round, and that a
grey Zodiac was seen in the area on the evening of the 11th. Written flatly, as
routine observation, not accusation.

**doc-10 — Newspaper clipping, *East London Advertiser*, 15th April.** Runs the
gangland line hard. "SCRAP DEALER SLAIN IN LOCK-UP — police probe underworld
link." Confident, wrong, and quoting nobody who knows anything. This is the red
herring pointing at the Firm.

**doc-11 — Report of D.C. Reeves on C. Bunce.** Bunce owed Coote eleven pounds
and admits being on Cheshire Street about eleven o'clock, going home from his
sister's. Frightened, cooperative, no alibi after that. Physical description
gives his height as five foot four.

---

## doc-06 — the solicitor's letter (write exactly this)

```
GADSBY & PRYCE
Solicitors
41 Bethnal Green Road, London E.2
Telephone: BIShopsgate 4417

8th April 1966

B. A. Coote, Esq.
Cheshire Street Yard
Bethnal Green, E.1

Dear Mr. Coote,

Re: Coote & Harrow, scrap metal merchants

We acknowledge your instructions of the 5th instant and have now
prepared draft notice of dissolution of the partnership for service
upon Mr. Harrow.

Before notice is served we would draw your attention to clause 7 of
the deed, under which the retiring partner's share falls to be valued
as at the date of notice. On the figures you were good enough to
supply, Mr. Harrow's entitlement would be very considerably reduced
by the sums drawn upon the business account over the past eighteen
months, which upon your own account remain unexplained.

We would advise most strongly that this matter be raised with your
partner before notice is served, and that you take a note of anything
he may say upon it.

Kindly telephone this office at your convenience to settle the date.

Yours faithfully,

R. Gadsby
GADSBY & PRYCE
```

This is the hinge of the case. It supplies motive, and it contradicts two
separate paragraphs of Harrow's statement.

---

## doc-05 — Mrs Harrow's statement (write exactly this)

```
I, Nora Elizabeth Harrow, of 22 Wilmot Street, E.2, state as
follows: —

1. I am the wife of Desmond Frank Harrow and have been married to
   him twenty-two years.

2. On the evening of Monday the 11th April I was unwell with my head.
   I took a powder for it and went up to bed at about half past nine.

3. The powder always makes me heavy. I did not hear my husband come
   in and I could not say what time it was.

4. When I woke at six o'clock he was in the bed beside me.

5. He is a good husband and there is no harm in him. He and Bernie
   were like brothers to one another.

6. I have told Desmond he ought not to have said I could speak for
   the time he came home, because I cannot, and I will not say a
   thing that is not true.

I have read this statement, or it has been read to me, and it is
true to the best of my knowledge and belief.

(Signed) N. E. Harrow
Witnessed: D.C. Reeves, 14th April 1966
```

She intends to defend him and destroys his alibi in the act of doing it.
Paragraph 6 must stay — the player should feel her loyalty and her honesty
pulling against each other.

---

## Contradictions array

```json
"contradictions": [
  {
    "a": "doc-03:para-4",
    "b": "doc-05:para-3",
    "note": "Harrow says his wife will confirm he was in before eleven; she cannot say when he came in"
  },
  {
    "a": "doc-03:para-5",
    "b": "doc-06",
    "note": "Harrow says Coote owed no money and they were on the best of terms; the solicitor's letter shows dissolution proceedings and unexplained drawings"
  },
  {
    "a": "doc-03:para-3",
    "b": "doc-06",
    "note": "Harrow says there was no quarrel; Coote had instructed solicitors three days earlier"
  }
]
```

---

## The Firm question

Pointing toward: the newspaper (doc-10), the protection round (doc-09), the
Zodiac seen on the street.

Cutting against, all three already available to the player:
- Pell heard no motor car start (doc-02, para 5) — a collector has a driver
- the spanner came off the floor of the lock-up — a planned killing brings a tool
- the partial print returns no CRO match, and Stipe's prints are on file (doc-08)

The correct answer is **no**. It must be arguable from the documents, not from
knowing that newspapers are unreliable.

---

## Solution block

```json
"solution": {
  "perpetrator": {
    "accepted": ["harrow", "desmond harrow", "desmond frank harrow", "d. f. harrow", "d f harrow"]
  },
  "method": {
    "accepted": ["spanner", "adjustable spanner", "blunt instrument", "blunt force", "blow to the head"]
  },
  "motive": {
    "accepted": ["dissolution", "the partnership", "partnership", "money", "debt", "drawings", "embezzlement", "theft from the business", "he was stealing", "to stop the valuation", "cover up"]
  },
  "firm_connected": false
}
```

Be generous with motive. A player who types "he'd been stealing from the
business and was about to be found out" is right and must be marked right.

---

## Fairness check before you finish

Re-read the eleven documents as though you'd never seen the answer, and confirm:

1. Every one of the four candidates is eliminated by something **stated in a
   document**, not by absence of evidence.
2. Motive is reachable by someone who has read doc-06 and doc-03 together.
3. The Firm question is answerable from physical evidence, not vibes.
4. No document simply announces the answer. Harrow is never accused; nobody
   says "he must have done it". The player assembles it.

If any of the four fails, fix the documents rather than loosening the solution.
