/** Signature-based technology detection — same approach commercial tools (Wappalyzer,
 * BuiltWith) use: match known patterns in fetched HTML/headers against a fixed ruleset.
 * This has a real ceiling — it can only see what the server sends before JS runs, so
 * stacks that only reveal themselves client-side, or sites behind bot-protection that
 * block the fetch, won't be detected. Every match records the literal `evidence` string
 * that triggered it, so a result is always traceable back to actual response bytes rather
 * than a black-box guess. */

export type TechMatch = {
  name: string;
  category: string;
  evidence: string;
};

type Signature = {
  name: string;
  category: string;
  html?: RegExp;
  header?: { name: string; pattern: RegExp };
};

const SIGNATURES: Signature[] = [
  // Frameworks / site builders
  { name: "Next.js", category: "Framework", html: /__NEXT_DATA__|\/_next\/static\// },
  { name: "React", category: "Framework", html: /data-reactroot|react-dom(\.production)?\.min\.js/ },
  { name: "Vue.js", category: "Framework", html: /data-v-app|vue(\.runtime)?\.min\.js/ },
  { name: "Angular", category: "Framework", html: /ng-version=|angular\.min\.js/ },
  { name: "WordPress", category: "CMS", html: /wp-content\/|wp-includes\/|name=["']generator["'] content=["']WordPress/ },
  { name: "Shopify", category: "Ecommerce", html: /cdn\.shopify\.com|Shopify\.theme/ },
  { name: "Webflow", category: "Site Builder", html: /webflow\.com|data-wf-site/ },
  { name: "Squarespace", category: "Site Builder", html: /static\.squarespace\.com|squarespace-cdn\.com/ },
  { name: "Wix", category: "Site Builder", html: /static\.wixstatic\.com|wix\.com/ },
  { name: "Webflow CMS", category: "CMS", html: /wf-page/ },

  // Analytics / marketing
  { name: "Google Analytics", category: "Analytics", html: /google-analytics\.com\/analytics\.js|gtag\(['"]config['"]|googletagmanager\.com\/gtag/ },
  { name: "Google Tag Manager", category: "Analytics", html: /googletagmanager\.com\/gtm\.js/ },
  { name: "Segment", category: "Analytics", html: /cdn\.segment\.com\/analytics\.js/ },
  { name: "Hotjar", category: "Analytics", html: /static\.hotjar\.com/ },
  { name: "Mixpanel", category: "Analytics", html: /cdn\.mxpnl\.com/ },
  { name: "HubSpot", category: "Marketing", html: /js\.hs-scripts\.com|hs-analytics\.net/ },
  { name: "Marketo", category: "Marketing", html: /munchkin\.marketo\.net/ },
  { name: "Intercom", category: "Support Chat", html: /widget\.intercom\.io/ },
  { name: "Drift", category: "Support Chat", html: /js\.driftt\.com/ },
  { name: "Zendesk", category: "Support Chat", html: /static\.zdassets\.com/ },
  { name: "Crisp", category: "Support Chat", html: /client\.crisp\.chat/ },

  // Payments
  { name: "Stripe", category: "Payments", html: /js\.stripe\.com/ },
  { name: "PayPal", category: "Payments", html: /paypal\.com\/sdk\/js/ },

  // Fonts / CDN / infra (also detected via headers)
  { name: "Google Fonts", category: "Fonts", html: /fonts\.googleapis\.com/ },
  { name: "Cloudflare", category: "CDN/Hosting", header: { name: "server", pattern: /cloudflare/i } },
  { name: "Cloudflare", category: "CDN/Hosting", header: { name: "cf-ray", pattern: /.+/ } },
  { name: "Vercel", category: "CDN/Hosting", header: { name: "x-vercel-id", pattern: /.+/ } },
  { name: "Vercel", category: "CDN/Hosting", header: { name: "server", pattern: /vercel/i } },
  { name: "Netlify", category: "CDN/Hosting", header: { name: "server", pattern: /netlify/i } },
  { name: "AWS CloudFront", category: "CDN/Hosting", header: { name: "x-amz-cf-id", pattern: /.+/ } },
  { name: "Nginx", category: "Web Server", header: { name: "server", pattern: /nginx/i } },
  { name: "Apache", category: "Web Server", header: { name: "server", pattern: /apache/i } },
];

export function detectTechStack(html: string, headers: Headers): TechMatch[] {
  const matches: TechMatch[] = [];
  const seen = new Set<string>();

  for (const sig of SIGNATURES) {
    if (seen.has(sig.name)) continue;
    if (sig.html) {
      const m = html.match(sig.html);
      if (m) {
        matches.push({ name: sig.name, category: sig.category, evidence: m[0].slice(0, 80) });
        seen.add(sig.name);
        continue;
      }
    }
    if (sig.header) {
      const val = headers.get(sig.header.name);
      if (val && sig.header.pattern.test(val)) {
        matches.push({ name: sig.name, category: sig.category, evidence: `${sig.header.name}: ${val.slice(0, 80)}` });
        seen.add(sig.name);
      }
    }
  }

  return matches;
}
