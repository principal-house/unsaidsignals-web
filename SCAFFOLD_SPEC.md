# UnsaidSignals Marketing Site — Scaffold Spec

## Stack
- Astro (already initialized, deps installed)
- Tailwind CSS (@astrojs/tailwind installed)
- Sitemap (@astrojs/sitemap installed)
- Static output (SSG) — no server-side runtime needed

## Site Structure

### Pages
1. **/** — Landing page (hero, value prop, features, social proof, CTA)
2. **/blog** — Blog index (list of posts, sorted by date)
3. **/blog/[slug]** — Individual blog post (MDX content)
4. **/about** — About page (story, team, mission)
5. **/pricing** — Pricing page (placeholder for now)

### Layout
- `src/layouts/Base.astro` — HTML shell, head, meta tags, analytics slots
- `src/layouts/Page.astro` — standard page layout (nav, content, footer)
- `src/layouts/BlogPost.astro` — blog post layout (title, date, author, content, related posts)

### Components
- `src/components/Nav.astro` — sticky top nav (logo, links: Home, Features, Blog, Pricing, "Get Started" CTA button)
- `src/components/Footer.astro` — footer (links, copyright, social)
- `src/components/Hero.astro` — landing page hero section
- `src/components/Features.astro` — feature grid (3-4 features with icons)
- `src/components/CTA.astro` — call-to-action section
- `src/components/BlogCard.astro` — blog post preview card
- `src/components/SEOHead.astro` — meta tags, OG tags, structured data

### Blog (Content Collections)
Use Astro content collections:
- `src/content/config.ts` — define blog collection schema
- `src/content/blog/` — markdown/MDX blog posts
- Schema: title, description, pubDate, author, tags, image (optional)

Seed with 2 placeholder posts:
1. "Why Team Energy is the Leading Indicator You're Ignoring" 
2. "The Hidden Cost of Unsaid Things in Engineering Teams"

### Styling
- Dark theme (zinc-900 background) with violet-500 accents — same as Mission Control
- Clean, modern SaaS look
- Font: Inter (via Google Fonts or local)
- Mobile-first responsive

### SEO
- Sitemap auto-generated (@astrojs/sitemap)
- Each page has: title, description, OG image, canonical URL
- Structured data (JSON-LD) for organization + blog posts
- robots.txt allowing all crawlers

### astro.config.mjs
```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://unsaidsignals.com',
  integrations: [tailwind(), sitemap()],
  output: 'static',
});
```

### tailwind.config.mjs
```javascript
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### Landing Page Content (src/pages/index.astro)

**Hero:**
- Headline: "See what your team isn't telling you"
- Subhead: "UnsaidSignals surfaces early signals of misalignment, friction, and energy loss — before they become problems."
- CTA: "Get Early Access" (links to app.unsaidsignals.com)
- Visual: abstract team/signal visualization or gradient mesh

**Features (3 core):**
1. **Clarity Pulse** — "Know if your team understands the why, not just the what"
2. **Energy Signals** — "Spot burnout and disengagement before it's too late"  
3. **Trust Index** — "Measure psychological safety without awkward surveys"

**How it works (3 steps):**
1. Weekly 2-minute pulse check (anonymous)
2. AI analyzes patterns and surfaces insights
3. You get actionable narratives, not just numbers

**Social proof:** Placeholder for testimonials/logos

**CTA section:** "Stop guessing how your team really feels" + signup button

### Cloudflare Pages Config
Add `wrangler.toml` for Cloudflare Pages deployment:
```toml
name = "unsaidsignals-web"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./dist"
```

## Commit message
"Initial scaffold: Astro marketing site with landing, blog, Tailwind, SEO"

## IMPORTANT
- This is a MARKETING site, not the app. The app lives at app.unsaidsignals.com (Lovable).
- All content should be crawlable static HTML.
- Keep it clean, professional, dark-themed, modern SaaS aesthetic.
- The hero CTA links to app.unsaidsignals.com for signup.
