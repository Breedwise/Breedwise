# BOSS module — the standard

Every BOSS module is its own operating system, built from a few standard pieces.
The hub (`boss/index.html`) is the one place they all live, driven by one manifest
(`boss/modules.js`).

## The pieces (a module uses what it needs)

| Piece       | Core? | What it is                                              | Start from |
|-------------|-------|---------------------------------------------------------|------------|
| `teach`     | core  | The guided lesson / walkthrough deck                    | duplicate `boss/boss-vision-os-module.html` |
| `os`        | core  | The interactive tool the member actually runs           | duplicate `boss/boss-vision-os.html` |
| `workbook`  | opt   | Fill-in worksheet / templates                           | `piece.html` |
| `checklist` | opt   | Step-by-step implementation / SOP                       | `piece.html` |
| `assess`    | opt   | Scorecard, quiz, or completion check                    | `piece.html` |
| `resources` | opt   | Downloads and links                                     | `piece.html` |

Teach + The OS are the spine of every module. Everything else is optional and only
shows on the hub when it exists, so modules never feel overwhelming.

## To add a module

1. **Make the folder:** copy this `_template/` to `boss/<module-id>/` (e.g. `boss/standards-os/`).
2. **Build the pieces** you need. Doc-style pieces (workbook, checklist, assess, resources)
   start from `piece.html`. For `teach` and `os`, duplicate the Vision OS files named above.
   Every piece links `../boss.css` and `../boss-gate.js` (already wired in the template).
3. **Register it** in `boss/modules.js`: add a block, point each piece at its file, set `status`
   (`live` / `building` / `planned`). The hub renders it automatically.

## Conventions

- **Brand:** Cormorant + Manrope, black / metallic gold. Never mix with TPB's palette.
- **Gate:** one code, `BOSS2026`, shared via `boss-gate.js`. Unlock once per session covers
  the whole library.
- **URLs:** existing modules can stay at their current paths. The manifest just points to a
  URL, wherever the file lives, so nothing has to move or break.
