/* ============================================================================
   BOSS MODULE MANIFEST — the single source of truth for the module library.
   To add a module: copy a block below, change the fields, and point each piece
   at its file. The hub (index.html) renders whatever is listed here.

   module fields:
     id       folder/slug (new modules live in  boss/<id>/ )
     order    sort position in the hub
     icon     one glyph shown on the card
     title    module name
     status   'live' | 'building' | 'planned'
     tagline  one short line under the title
     desc     a sentence or two for the card body
     pieces   any of: teach, os, workbook, checklist, assess, resources
              teach + os are the CORE pieces; the rest are optional and only
              show when present. Each piece = { url, status, meta }.
   Leave a piece out entirely if the module doesn't have it.
   ============================================================================ */
window.BOSS_MODULES = [

  {
    id:'vision-os', order:1, icon:'◎', title:'Vision OS', status:'live',
    tagline:'Run your life and business on purpose, by the week.',
    desc:'The daily 1-10 check-in, the identity you are becoming, and the This Week engine that turns a vision into one weekly signal. The flagship BOSS module.',
    pieces:{
      teach:{ url:'../boss-vision-os-module.html', status:'live', meta:'Guided walkthrough · ~40 min' },
      os:   { url:'../boss-vision-os.html',        status:'live', meta:'Daily check-in · This Week · radar' }
    }
  },

  {
    id:'content-os', order:2, icon:'◈', title:'Content OS', status:'building',
    tagline:'Make content a repeatable system, one concept at a time.',
    desc:'A library of short, visual trainings — one per concept — so content creation becomes a system instead of a scramble. Built from Austin’s outline; trainings in production.',
    pieces:{
      teach:{ url:'content-os/index.html', status:'building', meta:'Topic trainings · 5-10 min each' },
      os:   { status:'planned' }
    }
  },

  /* ---- placeholder slots: rename / fill / delete as you build ---- */
  {
    id:'standards-os', order:3, icon:'✧', title:'Standards OS', status:'planned',
    tagline:'Your breeding standard, written down and operated.',
    desc:'Placeholder slot. The module that holds the standard, the decisions, and the checks that keep every litter on standard.',
    pieces:{
      teach:{ status:'planned' },
      os:   { status:'planned' }
    }
  },
  {
    id:'growth-os', order:4, icon:'△', title:'Growth OS', status:'planned',
    tagline:'Demand, pricing, and buyer pipeline as a system.',
    desc:'Placeholder slot. The module for filling the waitlist and pricing with confidence.',
    pieces:{
      teach:{ status:'planned' },
      os:   { status:'planned' }
    }
  }

];
