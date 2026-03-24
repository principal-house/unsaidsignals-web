#!/usr/bin/env node
/**
 * Prerender UnsaidSignals landing page from public Lovable URL using Playwright.
 * 
 * 1. Prerenders from the live Lovable deployment (no local build needed)
 * 2. Rewrites asset URLs to point to Lovable CDN
 * 3. Adds robots.txt + sitemap.xml
 * 4. Deploys to Cloudflare Pages (with --deploy flag)
 * 
 * Usage: node scripts/prerender.mjs [--deploy]
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'dist');
const SOURCE_URL = 'https://unsaidsignals-landing.lovable.app';
const PUBLIC_URL = 'https://unsaidsignals.com';

const shouldDeploy = process.argv.includes('--deploy');

async function prerender() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`📄 Prerendering from ${SOURCE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (compatible; PrerenderBot/1.0)',
    viewport: { width: 1280, height: 720 },
  });

  try {
    await page.goto(SOURCE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    let html = await page.content();

    // Download assets locally instead of pointing to Lovable CDN
    const assetUrls = new Set();
    const assetRegex = /(href|src)="(?:https?:\/\/[^"]*?)?\/(assets\/[^"]+)"/g;
    let match;
    while ((match = assetRegex.exec(html)) !== null) {
      assetUrls.add(match[2]);
    }
    // Also catch absolute Lovable URLs
    const absRegex = new RegExp(`(href|src)="${SOURCE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(assets/[^"]+)"`, 'g');
    while ((match = absRegex.exec(html)) !== null) {
      assetUrls.add(match[2]);
    }

    mkdirSync(join(OUTPUT_DIR, 'assets'), { recursive: true });
    for (const asset of assetUrls) {
      const url = `${SOURCE_URL}/${asset}`;
      console.log(`  📥 Downloading ${asset}...`);
      try {
        const data = execSync(`curl -sL "${url}"`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
        writeFileSync(join(OUTPUT_DIR, asset), data);
      } catch (e) {
        console.warn(`  ⚠️ Failed to download ${asset}: ${e.message}`);
      }
    }

    // Rewrite all asset URLs to local paths
    html = html.replace(new RegExp(`${SOURCE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/assets/`, 'g'), '/assets/');
    html = html.replace(/(href|src)="\/assets\//g, '$1="/assets/');

    // Remove Lovable analytics/tracking scripts
    html = html.replace(/<script[^>]*src="[^"]*~flock\.js"[^>]*><\/script>/g, '');
    html = html.replace(/https?:\/\/[^"]*lovable[^"]*~api\/analytics[^"]*/g, '');

    // Inject canonical URL
    if (!html.includes('rel="canonical"')) {
      html = html.replace('<head>', `<head>\n<link rel="canonical" href="${PUBLIC_URL}/" />`);
    }

    // Inject og:url if missing
    if (!html.includes('og:url')) {
      html = html.replace('</head>', `<meta property="og:url" content="${PUBLIC_URL}/" />\n</head>`);
    }

    // Inject demo form override — routes to Cloudflare Worker instead of Supabase
    const demoFormScript = `
<script>
(function() {
  const WORKER_URL = 'https://unsaidsignals-demo-form.rozenblats.workers.dev';
  const origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.includes('send-demo-notification')) {
      return origFetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: opts?.body,
      });
    }
    return origFetch.apply(this, arguments);
  };
})();
</script>`;

    html = html.replace('</body>', demoFormScript + '\n</body>');

    writeFileSync(join(OUTPUT_DIR, 'index.html'), html, 'utf8');
    console.log(`✅ Prerendered index.html (${(html.length / 1024).toFixed(1)}KB)`);
  } finally {
    await page.close();
    await browser.close();
  }

  // 3. robots.txt + sitemap.xml
  writeFileSync(join(OUTPUT_DIR, 'robots.txt'), [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${PUBLIC_URL}/sitemap.xml`,
    '',
  ].join('\n'));

  writeFileSync(join(OUTPUT_DIR, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${PUBLIC_URL}/</loc>`,
    `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`,
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n'));

  console.log('📝 Generated robots.txt and sitemap.xml');

  // 4. Deploy
  if (shouldDeploy) {
    console.log('\n🚀 Deploying to Cloudflare Pages...');
    try {
      execSync(
        `npx wrangler pages deploy ${OUTPUT_DIR} --project-name unsaidsignals-web --commit-dirty=true`,
        { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'inherit' }
      );
      console.log('✅ Deployed!');
    } catch (err) {
      console.error('❌ Deploy failed:', err.message);
    }
  } else {
    console.log('\nRun with --deploy to push to Cloudflare Pages');
  }
}

prerender().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
