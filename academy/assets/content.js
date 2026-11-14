/* ──────────────────────────────────────────────────────────────
   Breedwise Academy, single source for copy that changes often.
   Edit THIS file for: apply/booking link,
   faculty, testimonials, FAQ, sample lessons, video URLs.
   Anything in [square brackets] is a placeholder Austin supplies;
   it renders visibly in staging and must never be invented.
   Video URL = "" shows a placeholder slot. Use a player with no
   view counts (Wistia / Vimeo / Bunny), never YouTube with counts.
   ────────────────────────────────────────────────────────────── */
window.BW = {
  /* operational */
  applyUrl: "#apply",   // every "Apply" / "Book" button scrolls to the embedded calendar
  weeklyHours: "About 5 hours a week",
  acceptsNewer: "Established breeders, and serious breeders with a plan to start within the next 6 months",
  guaranteeTerms: "Complete the 120-Day Core, show up for coaching, and implement what we build together. If you've done the work and your program isn't measurably better, we refund your tuition. The milestones are set up front, so you always know exactly where you stand.",

  /* program facts (from the brief) */
  stats: { modules: 48, lessons: 192, quarters: 4, calls: 52 },

  /* hero faculty card + faculty page */
  faculty: [
    {
      id: "fontaine",
      name: "Dr. Emmanuel Fontaine",
      area: "Reproduction, whelping & neonatal care",
      credentials: "DVM, MSc, PhD, Dip. ECAR",
      strip: "DVM, PhD, Dip. ECAR · Board-certified in reproduction",
      bio: "A graduate of France's Toulouse and Alfort veterinary schools, Dr. Fontaine earned his PhD in canine reproduction and is a Diplomate of the European College of Animal Reproduction (ECAR). He has spent nearly two decades focused on canine fertility, whelping and neonatal care, and has taught breeders and veterinarians across the Americas. In the Academy he teaches the clinical modules that keep more puppies alive and more litters on schedule.",
      teaches: ["Breeding timing & fertility", "Safe whelping", "Neonatal survival & care", "When to escalate to your vet"],
      intro_video: "",
      headshot: "/academy/assets/dr-fontaine.jpg",
      track: "science"
    },
    {
      id: "hughes",
      name: "Dr. Angela Hughes",
      area: "Genetics & hereditary health",
      credentials: "DVM, PhD (Canine Genetics)",
      strip: "DVM, PhD · Veterinary geneticist",
      bio: "Dr. Hughes earned both her DVM and her PhD in canine genetics from UC Davis, and has spent her career making genetic testing usable for everyday breeding decisions, including years leading veterinary genetics research at Wisdom Health. She teaches breeders how to read testing and pedigrees, manage COI, and pair for health instead of guessing.",
      teaches: ["Genetic testing & pedigree analysis", "COI & structured pairings", "Health screening that matters", "Breeding away from hereditary disease"],
      intro_video: "",
      headshot: "/academy/assets/dr-hughes.jpg",
      track: "science"
    },
    {
      id: "mahoney",
      name: "Dr. David Mahoney",
      area: "Reproduction & veterinary partnerships",
      credentials: "DVM · Board-certified theriogenologist",
      strip: "DVM · Theriogenologist",
      bio: "Dr. Mahoney is a theriogenologist focused on reproductive health, artificial insemination and breeding management. He teaches breeders how to work with their own veterinarian as a true partner, from timing and collection to building the kind of vet relationship that sends clients back to you.",
      teaches: ["Reproductive health", "Artificial insemination", "Breeding management", "Building your vet referral network"],
      intro_video: "",
      headshot: "/academy/assets/dr-mahoney.jpg",
      track: "science"
    },
    {
      id: "shanks",
      name: "Austin Shanks",
      area: "Business systems, sales & premium pricing",
      credentials: "Founder · Breedwise",
      strip: "Founder · Business & premium sales",
      bio: "Austin founded Breedwise to give serious breeders the business half most never get. He teaches positioning, buyer qualification and premium pricing, how to be chosen by the right families at the price your standard earns, and the systems that make it repeatable instead of lucky.",
      teaches: ["Positioning & brand", "Buyer screening", "Premium pricing", "Business systems"],
      intro_video: "",
      headshot: "/academy/assets/austin-shanks.jpg",
      track: "business"
    },
    {
      id: "omar",
      name: "Yasmin Omar",
      area: "Social media & content marketing",
      credentials: "Head of Social Media Mastery",
      strip: "Social media & content marketing",
      bio: "Yasmin leads social and content at Breedwise. She teaches breeders how to grow an audience of the right buyers, the content, the cadence and the short-form that turn followers into a waitlist instead of a feed of tire-kickers.",
      teaches: ["Content that converts", "Growing the right audience", "Reels & short-form", "Followers into buyers"],
      intro_video: "",
      headshot: "/academy/assets/yasmin-omar.jpg",
      track: "business"
    },
    {
      id: "smith-beaudoin",
      name: "Jennifer Smith-Beaudoin",
      area: "Implementation & member success",
      credentials: "Director of Member Success",
      strip: "Implementation & member success",
      bio: "Jennifer makes sure the training actually gets done. She keeps every member's program moving between calls, the onboarding, accountability and implementation support that turns what you learn into results in your own kennel.",
      teaches: ["Onboarding & fast starts", "Implementation support", "Accountability", "Keeping your program moving"],
      intro_video: "",
      headshot: "",
      track: "business"
    }
  ],

  /* team array retained for reference; the faculty page now renders everyone from faculty[] above */
  team: [
    { name: "Austin Shanks", role: "Founder", headshot: "" },
    { name: "Jennifer Smith-Beaudoin", role: "Director of Member Success", headshot: "" },
    { name: "Yasmin Omar", role: "Head of Social Media Mastery", headshot: "/academy/assets/yasmin-omar.jpg" }
  ],

  /* home, course samples teaser + curriculum samples */
  samples: [
    { id: "whelping",  title: "The Two Clocks of a Difficult Birth", pillar: "Whelping & neonatal care", presenter: "Dr. Emmanuel Fontaine", length: "Preview", video: "/academy/assets/video/sample-whelping.mp4", worksheet: "" },
    { id: "genetics",  title: "The Power of Diversity",              pillar: "Genetics & program design", presenter: "Dr. Angela Hughes",     length: "Preview", video: "/academy/assets/video/sample-genetics.mp4", worksheet: "" },
    { id: "business",  title: "Puppy Mills vs Purpose-Driven Programs", pillar: "Breeding to the standard", presenter: "Dr. David Mahoney",      length: "Preview", video: "/academy/assets/video/sample-business.mp4", worksheet: "" },
    { id: "puppy-content", title: "Content Distribution", pillar: "Puppy content & marketing", presenter: "Austin Shanks", length: "Preview", video: "/academy/assets/video/sample-content-distribution.mp4", worksheet: "" }
  ],

  /* results callouts (word-for-word; breeds in [] are placeholders) */
  results: [
    { metric: "$5,000 in 34 min", detail: "her highest price ever", name: "Lyanne Scott", breed: "Pomeranians", years: "" },
    { metric: "6 months out", detail: "OFA-tested and bred to the standard", name: "Regina", breed: "Shorty Frenchies", years: "" },
    { metric: "200k+ followers", detail: "from nothing to a waitlist, with health testing", name: "Shaylee & Sean", breed: "", years: "" }
  ],

  /* member video testimonials (home #results), 3 slots */
  videoTestimonials: [
    { video: "https://review.breedwise.io/videos/judith-nothing.mp4", poster: "https://review.breedwise.io/videos/judith-nothing.jpg", name: "Judith · Yorkies", headline: "There's nothing else out there like it" },
    { video: "/academy/assets/video/testimonial-jonathan.mp4?v=2", poster: "https://review.breedwise.io/videos/jonathan-7x.jpg", name: "Jonathan · Boerboels", headline: "Sold puppies at $6,500 and $7,500" },
    { video: "https://review.breedwise.io/videos/cathy-soldout.mp4", poster: "https://review.breedwise.io/videos/cathy-soldout.jpg", name: "Cathy · Dachshunds", headline: "Sold the whole litter at $4,000" },
    { video: "https://review.breedwise.io/videos/t3.mp4", poster: "https://review.breedwise.io/videos/t3.jpg", name: "Jake Ayers", headline: "" },
    { video: "https://review.breedwise.io/videos/t5.mp4", poster: "https://review.breedwise.io/videos/t5.jpg", name: "Lamont", headline: "" },
    { video: "https://review.breedwise.io/videos/t6.mp4", poster: "https://review.breedwise.io/videos/t6.jpg", name: "Paul & Heather", headline: "" },
    { video: "https://review.breedwise.io/videos/t7.mp4", poster: "https://review.breedwise.io/videos/t7.jpg", name: "Shaylee Griffin", headline: "" },
    { video: "https://review.breedwise.io/videos/t8.mp4", poster: "https://review.breedwise.io/videos/t8.jpg", name: "Trina Francois", headline: "" },
    { video: "https://review.breedwise.io/videos/t1.mp4", poster: "https://review.breedwise.io/videos/t1.jpg", name: "Michelle Cordova", headline: "" }
  ],

  /* 4 quote cards, use the EXISTING testimonials word for word.
     Not yet supplied; left as visible placeholders (never invent). */
  quotes: [
    { quote: "We've bred for over 7 years and knew we were undervaluing our program. Less than a month after joining, we sold a puppy for the highest price in our program's history.", name: "Trina & Dion", breed: "", years: "Breeding 7+ years" },
    { quote: "I've bred for 7 years and never learned anything like what BreedWise offers. I started OFA testing, I'm improving my breed, and my clients are paying me three times more than I've ever charged.", name: "Jasmin Garcia", breed: "", years: "Breeding 7 years" },
    { quote: "I started breeding 13 years ago, and the information I learned through BreedWise in 3 months would have saved me years had I known it sooner.", name: "Michael Page", breed: "", years: "Breeding 13 years" },
    { quote: "Before BreedWise I was a complete mess with sales. After a few months I understand my market, how to position myself, and how to communicate my program's value in a way that converts. The best part is the community.", name: "Madison Gorruso", breed: "", years: "Academy member" },
    { quote: "My biggest win was discovering the mentorship and resources to help me grow, not only my business, but my mindset. Excited to keep building, one step at a time.", name: "Todd Miller", breed: "", years: "Blessed Beyond Dobermans" },
    { quote: "One of our reels hit 13,500 likes and 1,500 new Facebook followers, and our Instagram grew from 30 to 500 followers with 59k views. Thank you for the help!", name: "Ron Weller", breed: "", years: "Misty Hills German Shepherds" }
  ],

  /* Dr. Fontaine pull quote (vet-proof section) */
  fontaineQuote: "We bring science-based, evidence-backed answers to the table, so that instead of 55 different opinions, you have one verified answer you can build your program on.",

  /* FAQ */
  faq: [
    { q: "Who is it for?", a: "Established breeders with a running program who want a reputation their breed knows by name, and serious breeders with a plan to start within the next 6 months. Not hobbyists chasing quick money." },
    { q: "Is this just about making money?", a: "No. Breedwise is built on breeding to the standard first, health testing, genetics, ethics, and the dogs. The business and sales training exists so that doing it right is finally sustainable, so the breeders improving the breed are the ones who can afford to keep going. Money is the result of a program worth paying for, not a replacement for one." },
    { q: "I'm a preservation breeder. Is this for me?", a: "Especially you. The clinical and genetics faculty teach to a preservation standard, and the business side makes sure your program is rewarded for it instead of undercut by volume sellers. You keep your ethics and your standard, we add the systems that let them win in the real market." },
    { q: "What's included?", a: "A living curriculum with new modules added every week, daily live coaching calls, a 1:1 success coach, done-for-you systems (contracts, protocols, buyer guides, Kennel OS), and a faculty-graded certification." },
    { q: "How much time per week?", a: "One module a week plus the weekly group calls, figure about 5 hours a week. Fall behind and the coaching is built to get you caught up." },
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
      "You have no program and no plan to start within the next 6 months",
      "You want to keep competing on price against backyard breeders",
      "You won't do the work between calls"
    ]
  },

  /* meta / OG */
  meta: {
    home:   { title: "Breedwise Academy, The veterinary-backed standard for serious breeders", desc: "A 12-month, veterinary-backed certification for established breeders: a waitlist of the right families, vets who refer to you, and profit that follows from doing it right." },
    curr:   { title: "Curriculum, Breedwise Academy", desc: "48 modules, 192 lessons, 4 quarters, 52 weekly coaching calls. Everything a serious breeding program runs on, in one structured year, with free course samples." },
    faculty:{ title: "Faculty, Breedwise Academy", desc: "Board-certified veterinary specialists teach the clinical side of the Breedwise Academy certification, reproduction, genetics, whelping and neonatal care." }
  }
};
