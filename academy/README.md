# Breedwise Academy — site revamp (staging)

Three-page, portable static site. Built in `/academy/` so it can be reviewed here and
later moved to the root of the `breedwise.io` repo. All links are **relative**, so the
folder drops in anywhere.

```
academy/
  index.html            Home
  curriculum/index.html Curriculum (+ #samples email form → CRM)
  faculty/index.html    Faculty (vets + team)
  team/index.html       → redirects to faculty/
  about/index.html      → redirects to home
  assets/
    content.js          ← EDIT THIS for copy that changes often
    site.css            design tokens + components
    site.js             nav, FAQ, slot-fill, sample-pack form
    og-image.png        (TODO) 1200×630 social preview — not yet added
```

## Edit copy in ONE place: `assets/content.js`
Apply/booking link, cohort date, seats, faculty, team, sample lessons, testimonials,
FAQ, video URLs. Nothing else needs touching for routine updates.

## Placeholders still needed (shown in gold dashed boxes on the pages)
Everything in `[square brackets]` is a placeholder — **never invented**. Fill in `content.js`:

- **`applyUrl`** — the real apply/booking link. Until set, every "Apply" button points to `#apply`.
- **`cohortDate`**, **`seatsRemaining`**, **`weeklyHours`**, **`acceptsNewer`**, **`guaranteeTerms`**.
- **Faculty**: Dr. Angela Hughes degrees; Dr. David Mahoney degrees; **Dr. Taylor Parker** credentials, bio, topics (currently a placeholder — confirm this person is real before publishing). Headshots optional (initials show otherwise). Intro videos optional (placeholder slot shows otherwise).
- **Sample lessons** (`samples`): the three lesson titles + video URLs + worksheets.
- **Video testimonials** (`videoTestimonials`): 3 member video URLs + name/breed/years/headline.
- **Quote testimonials** (`quotes`): 4 existing testimonials, used **word for word** — not written yet.
- **Results**: Gonzalo Martinez's **breed** is the only missing field.
- **`fontaineQuote`** — a short pull quote from Dr. Fontaine.

## Video slots
Each slot takes a single URL (`intro_video` / sample `video` / `videoTestimonials.video`).
Use **Wistia / Vimeo / Bunny** — no YouTube with public view counts. Empty = placeholder slot.
Launch is fine with no videos; the hero right column is a faculty card, not a video.

## Sample-pack form
`curriculum/#samples` posts name + email to the existing **masterclass-optin** edge function
(`source: "academy-sample-pack"`, `tag: "academy-sample-pack"`) → `tool_submissions` + CC360.
Honeypot field is `hp_field` (payload key stays `company` so the server trap still catches bots).
If you'd rather it tag differently or hit a dedicated function, say so.

## Routing to wire on breedwise.io (server/host level, not in these files)
- `/academy` → `/curriculum` (also fixes the current `/academy` 404)
- `/team` → `/faculty`  (stub included here as `team/`)
- `/about` → folds into Home + Faculty  (stub included here as `about/`)

## Removed per brief (vanity claims)
No "500K+ followers", "100M+ views", "join thousands", "$1M+ revenue",
"industry recognized", "zero avoidable puppy losses", or six-figure-revenue headline anywhere.

## Checks
- One `<h1>` per page, semantic landmarks, labeled inputs, skip link, focus-visible.
- Meta title + description + OG on every page.
- Responsive to 390px; black-and-gold tokens meet WCAG AA.
- **TODO before production:** add `assets/og-image.png` (1200×630), run Lighthouse mobile.
