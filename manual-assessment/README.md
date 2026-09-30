# Manual Leadership Pipeline Audit

A paper version of the audit for use without the web app — one form the leader fills
in about themselves, and a matching form they hand to a manager and/or a peer.

| File | Use |
| --- | --- |
| `Leadership Contribution Self-Assessment.docx` | The leader rates themselves |
| `Leadership Contribution Assessment - Manager or Peer.docx` | A manager or peer rates that leader |
| `build_assessments.py` | Regenerates both `.docx` files |

Both forms are two pages and are the same instrument — only the point of view changes
(first person vs. third person), so the two sets of answers line up item for item.

## What the form does not say

The form never mentions stages, stage numbers, or the four contribution categories.
Naming them invites the rater to equate stage with title, tenure, or age, which is
exactly the correlation the audit exists to disprove. The respondent's form ends at a
tally of A/B/C/D with no interpretation — the meaning comes from you in the debrief.

For the same reason, keep the key below out of the room until the forms are collected.

## Scoring key (facilitator only)

Part One is ten forced-choice items. Each item's four anchors run along the same
spectrum, so the letters map straight onto the contribution categories used in the app
and the audit deck:

| Letter | Contribution category | Deck equivalent |
| --- | --- | --- |
| A | Contributes Dependently | Stage 1 |
| B | Contributes Independently | Stage 2 |
| C | Contributes Through Others | Stage 3 |
| D | Contributes Through Enterprise | Stage 4 |

Read the tally as a profile, not a score:

- **The modal letter** is the person's primary way of contributing.
- **The spread matters more than the mode.** A clean 8-C/2-D block reads very
  differently from 3-A/3-B/2-C/2-D, which usually means the person is being asked to
  operate at several levels at once, or is mid-transition.
- **Individual items are the coaching material.** Someone who is mostly C but answers B
  on item 5 (developing others) and item 9 (obstacles) is managing a team while still
  doing the work themselves — the most common and most expensive gap the audit finds.
- **The audit's core question:** anyone in a people-leadership role is expected to be
  predominantly C or D. A leader whose profile is mostly A or B is the gap.

Item-to-descriptor mapping, if you need to trace an answer back to source:

| # | Dimension | # | Dimension |
| --- | --- | --- | --- |
| 1 | Source of direction | 6 | Relationships and networks |
| 2 | Scope of accountability | 7 | Influence and power |
| 3 | Basis of reputation | 8 | Perspective and horizon |
| 4 | How results are produced | 9 | Problem solving |
| 5 | Developing others | 10 | Initiative and new ideas |

## Part Two: relative performance

Replaces the app's forced-ranking exercise, which needs a full roster to work. Here the
rater places the person on a 1–10 scale against their peers (1 = lowest among peers,
5 = about average, 10 = highest). Aggregate these against the Part One profile to
reproduce the deck's stage-vs-performance correlation.

Self-ratings on this scale run high; treat the manager/peer rating as the anchor and the
gap between the two as its own finding.

## Comparing the two forms

Collect the self form and at least one manager or peer form for the same person, then
put the two Part One tallies side by side. Three patterns are worth naming in a debrief:

1. **Aligned** — same modal letter. Confirmed profile; the coaching conversation is
   about the individual items that disagree.
2. **Self higher than others** — the person believes they contribute through others or
   the enterprise while observers still see individual work. The most common gap.
3. **Others higher than self** — usually a credibility or confidence issue rather than a
   capability one, and often the fastest to move.

## Regenerating the documents

```bash
pip install python-docx
python build_assessments.py
```

Both files are written next to the script. Edit `ITEMS` at the top to change wording —
each anchor is a `(self, manager/peer)` pair, so the two documents stay in sync.

Fonts are Open Sans for body text and Georgia for the title and section headings. If
Open Sans is not installed, Word substitutes a default sans and the layout may reflow
past two pages; install Open Sans, or print to PDF from a machine that has it.
