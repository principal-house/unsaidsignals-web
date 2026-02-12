#!/usr/bin/env node
/**
 * Prerender UnsaidSignals Lovable site using Playwright.
 * Visits each page, waits for JS to render, saves static HTML.
 * Then deploys to Cloudflare Pages.
 * 
 * Usage: node scripts/prerender.mjs [--deploy]
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'dist');

// Source site (Lovable deployment)
const SOURCE_URL = 'https://unsaidsignals.com';

// Pages to prerender — add new routes here as you build them
const PAGES = [
  '/',
  '/auth',
  '/about',
  // Add more routes as needed
];

const shouldDeploy = process.argv.includes('--deploy');

async function prerender() {
  console.log('🔄 Starting prerender of', SOURCE_URL);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; PrerenderBot/1.0)',
    viewport: { width: 1280, height: 720 },
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const pagePath of PAGES) {
    const url = `${SOURCE_URL}${pagePath}`;
    console.log(`  📄 Rendering ${url}...`);
    
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait a bit extra for any late-loading content
      await page.waitForTimeout(2000);
      
      // Get the fully rendered HTML
      let html = await page.content();
      
      // Inject SEO improvements into the rendered HTML
      // Add canonical URL
      const canonical = `<link rel="canonical" href="${url}" />`;
      if (!html.includes('rel="canonical"')) {
        html = html.replace('</head>', `${canonical}\n</head>`);
      }
      
      // Determine output path
      const outputPath = pagePath === '/' 
        ? join(OUTPUT_DIR, 'index.html')
        : join(OUTPUT_DIR, pagePath.replace(/^\//, ''), 'index.html');
      
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, html, 'utf8');
      console.log(`  ✅ Saved ${outputPath} (${(html.length / 1024).toFixed(1)}KB)`);
      
    } catch (err) {
      console.error(`  ❌ Failed to render ${url}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  
  // Write robots.txt
  writeFileSync(join(OUTPUT_DIR, 'robots.txt'), [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SOURCE_URL}/sitemap.xml`,
  ].join('\n'));
  
  // Generate a basic sitemap
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PAGES.map(p => [
      '  <url>',
      `    <loc>${SOURCE_URL}${p}</loc>`,
      `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`,
      `    <priority>${p === '/' ? '1.0' : '0.8'}</priority>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
  ].join('\n');
  
  writeFileSync(join(OUTPUT_DIR, 'sitemap.xml'), sitemap);
  console.log('\n📝 Generated robots.txt and sitemap.xml');
  
  console.log(`\n✨ Prerender complete! ${PAGES.length} pages saved to ${OUTPUT_DIR}`);
  
  if (shouldDeploy) {
    console.log('\n🚀 Deploying to Cloudflare Pages...');
    try {
      const result = execSync(
        `npx wrangler pages deploy ${OUTPUT_DIR} --project-name unsaidsignals-web --branch main`,
        { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe' }
      );
      console.log(result);
      console.log('✅ Deployed!');
    } catch (err) {
      console.error('❌ Deploy failed:', err.stderr || err.message);
    }
  } else {
    console.log('\nRun with --deploy to push to Cloudflare Pages');
  }
}

prerender().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
