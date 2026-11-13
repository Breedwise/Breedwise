/* ──────────────────────────────────────────────────────────────
   Breedwise Academy — single source for copy that changes often.
   Edit THIS file for: apply/booking link, cohort date, seats,
   faculty, testimonials, FAQ, sample lessons, video URLs.
   Anything in [square brackets] is a placeholder Austin supplies;
   it renders visibly in staging and must never be invented.
   Video URL = "" shows a placeholder slot. Use a player with no
   view counts (Wistia / Vimeo / Bunny) — never YouTube with counts.
   ────────────────────────────────────────────────────────────── */
window.BW = {
  /* operational */
  applyUrl: "",                      // every "Apply" / "Book" button. "" => visible placeholder
  cohortDate: "[Next cohort date]",
  seatsRemaining: "[Seats remaining]",
  weeklyHours: "[Typical weekly hours]",
  acceptsNewer: "[Confirm whether newer breeders are accepted]",
  guaranteeTerms: "[1–2 line summary of the “Pays For Itself In Litters” guarantee terms]",

  /* program facts (from the brief) */
  stats: { modules: 48, lessons: 192, quarters: 4, calls: 52 },

  /* hero faculty card + faculty page */
  faculty: [
    {
      id: "fontaine",
      name: "Dr. Emmanuel Fontaine",
      area: "Reproduction, whelping & neonatal care",
      credentials: "DVM, MSc, PhD, DECAR",
      strip: "DVM, MSc, PhD, DECAR · Reproduction specialist",
      bio: "Board-certified reproduction specialist with nearly 20 years in canine fertility, whelping and neonatal care.",
      teaches: ["Breeding timing & fertility", "Safe whelping", "Neonatal care", "When to escalate to your vet"],
      intro_video: "",
      headshot: ""                   // "" => initials placeholder
    },
    {
      id: "hughes",
      name: "Dr. Angela Hughes",
      area: "Genetics",
      credentials: "[Degrees]",
      strip: "Veterinary geneticist · Canine hereditary conditions",
      bio: "Veterinary geneticist specializing in canine hereditary conditions and breeding strategy.",
      teaches: ["Genetic testing & pedigree analysis", "COI & structured pairings", "Health screening"],
      intro_video: "",
      headshot: ""
    },
    {
      id: "mahoney",
      name: "Dr. David Mahoney",
      area: "Reproduction & veterinary partnerships",
      credentials: "[Degrees]",
      strip: "Board-certified · Theriogenologist",
      bio: "Board-certified theriogenologist covering reproductive health, AI and breeding management.",
      teaches: ["Reproductive health", "Artificial insemination", "Building your vet referral network"],
      intro_video: "",
      headshot: ""
    },
    {
      id: "parker",
      name: "Dr. Taylor Parker",
      area: "General practice & clinical care",
      credentials: "[Credentials]",
      strip: "~20 years · In canine fertility and whelping",
      bio: "[Bio and credentials]",
      teaches: ["[Topics taught in the Academy]"],
      intro_video: "",
      headshot: ""
    }
  ],

  /* business & member support (faculty page) */
  team: [
    { name: "Austin Shanks", role: "Founder", headshot: "" },
    { name: "Jennifer Smith-Beaudoin", role: "Director of Member Success", headshot: "" },
    { name: "Yasmin Omar", role: "Head of Social Media Mastery", headshot: "" }
  ],

  /* home — course samples teaser + curriculum samples */
  samples: [
    { id: "whelping",  title: "[Lesson title]", pillar: "Whelping & neonatal care", presenter: "Dr. Emmanuel Fontaine", length: "[2–4 min]", video: "", worksheet: "" },
    { id: "genetics",  title: "[Lesson title]", pillar: "Genetics & program design", presenter: "Dr. Angela Hughes",     length: "[2–4 min]", video: "", worksheet: "" },
    { id: "business",  title: "[Lesson title]", pillar: "Business & premium sales",  presenter: "Austin Shanks",         length: "[2–4 min]", video: "", worksheet: "" }
  ],

  /* results callouts (word-for-word; breeds in [] are placeholders) */
  results: [
    { metric: "2× prices", detail: "in under 90 days", name: "Gonzalo Martinez", breed: "[Breed]", years: "" },
    { metric: "3× prices", detail: "after 7 years breeding", name: "Jasmin Garcia", breed: "", years: "7 years breeding" },
    { metric: "“Would have saved me years”", detail: "", name: "Michael Page", breed: "", years: "13 years breeding" }
  ],

  /* member video testimonials (home #results) — 3 slots */
  videoTestimonials: [
    { video: "", name: "[Name]", breed: "[Breed]", years: "[Years]", headline: "[Headline result]" },
    { video: "", name: "[Name]", breed: "[Breed]", years: "[Years]", headline: "[Headline result]" },
    { video: "", name: "[Name]", breed: "[Breed]", years: "[Years]", headline: "[Headline result]" }
  ],

  /* 4 quote cards — use the EXISTING testimonials word for word.
     Not yet supplied; left as visible placeholders (never invent). */
  quotes: [
    { quote: "[Existing testimonial, word for word]", name: "[Name]", breed: "[Breed]", years: "[Years breeding]" },
    { quote: "[Existing testimonial, word for word]", name: "[Name]", breed: "[Breed]", years: "[Years breeding]" },
    { quote: "[Existing testimonial, word for word]", name: "[Name]", breed: "[Breed]", years: "[Years breeding]" },
    { quote: "[Existing testimonial, word for word]", name: "[Name]", breed: "[Breed]", years: "[Years breeding]" }
  ],

  /* Dr. Fontaine pull quote (vet-proof section) */
  fontaineQuote: "[Short quote from Dr. Fontaine on why breeders need clinical-grade education]",

  /* FAQ */
  faq: [
    { q: "Who is it for?", a: "Established breeders with a running program who want a reputation their breed knows by name — not beginners chasing quick money. [Confirm whether newer breeders are accepted.]" },
    { q: "What's included?", a: "48 modules across 192 lessons in 4 quarters, 52 weekly coaching calls, a 1:1 success coach, done-for-you systems (contracts, protocols, buyer guides, Kennel OS), and a faculty-graded certification." },
    { q: "How much time per week?", a: "One module a week plus the weekly group call. [Typical weekly hours.]" },
    { q: "Who teaches it?", a: "Board-certified veterinary specialists teach the clinical modules; Austin Shanks and the Breedwise team teach the business modules. Meet the full faculty on the Faculty page." },
    { q: "How does certification work?", a: "You earn it: 80% knowledge checks across the modules, a faculty-graded practical portfolio, and a capstone kennel audit. It's a certificate you earn, not one you buy." },
    { q: "What does it cost?", a: "We cover pricing and fit on your strategy session, so we can make sure the program is right for your program before anything else." }
  ],

  /* "this is for you / not for you" */
  fit: {
    forYou: [
      "You run an established program and want it known in your breed",
      "You want a waitlist of the right families, not just inquiries",
      "You see profit as the result of doing it right",
      "You're ready to implement, not just collect more information"
    ],
    notForYou: [
      "You're looking for a quick-money shortcut",
      "You're not breeding yet or have no program to apply this to",
      "You want to keep competing on price against backyard breeders",
      "You won't do the work between calls"
    ]
  },

  /* meta / OG */
  meta: {
    home:   { title: "Breedwise Academy — The veterinary-backed standard for serious breeders", desc: "A 12-month, veterinary-backed certification for established breeders: a waitlist of the right families, vets who refer to you, and profit that follows from doing it right." },
    curr:   { title: "Curriculum — Breedwise Academy", desc: "48 modules, 192 lessons, 4 quarters, 52 weekly coaching calls. Everything a serious breeding program runs on, in one structured year — with free course samples." },
    faculty:{ title: "Faculty — Breedwise Academy", desc: "Board-certified veterinary specialists teach the clinical side of the Breedwise Academy certification — reproduction, genetics, whelping and neonatal care." }
  }
};
