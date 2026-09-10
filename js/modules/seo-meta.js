/**
 * Pixaroid SEO Meta — runtime metadata and structured data for tool pages.
 * Static HTML already contains the deploy-time metadata; this module is a
 * runtime enhancement only and performs no filesystem/build mutation.
 */
'use strict';

const SITE = Object.freeze({
  name: 'Pixaroid',
  domain: 'https://pixaroid.vercel.app',
  twitter: '@pixaroidapp',
  ogImage: 'https://pixaroid.vercel.app/assets/images/og-default.png',
  logoURL: 'https://pixaroid.vercel.app/assets/svg/logo.svg',
});

const CATEGORY_LABELS = Object.freeze({
  compression: 'Compression',
  conversion: 'Conversion',
  resize: 'Resize',
  editor: 'Editor',
  'ai-tools': 'AI Tools',
  'social-tools': 'Social Media',
  utilities: 'Utilities',
  'bulk-tools': 'Bulk Tools',
  'pdf-tools': 'PDF Tools',
});

export function injectToolMeta(tool) {
  if (!tool?.slug || typeof document === 'undefined') return;
  const head = document.head;
  const meta = _buildMeta(tool);

  let titleEl = head.querySelector('title');
  if (!titleEl) {
    titleEl = document.createElement('title');
    head.appendChild(titleEl);
  }
  titleEl.textContent = meta.title;

  _setMeta(head, 'name', 'description', meta.description);
  _setMeta(head, 'name', 'robots', 'index, follow');
  _setMeta(head, 'property', 'og:type', 'website');
  _setMeta(head, 'property', 'og:site_name', SITE.name);
  _setMeta(head, 'property', 'og:title', meta.ogTitle);
  _setMeta(head, 'property', 'og:description', meta.ogDescription);
  _setMeta(head, 'property', 'og:url', meta.canonical);
  _setMeta(head, 'property', 'og:image', SITE.ogImage);
  _setMeta(head, 'property', 'og:image:width', '1200');
  _setMeta(head, 'property', 'og:image:height', '630');
  _setMeta(head, 'property', 'og:image:alt', meta.ogTitle);
  _setMeta(head, 'name', 'twitter:card', 'summary_large_image');
  _setMeta(head, 'name', 'twitter:site', SITE.twitter);
  _setMeta(head, 'name', 'twitter:title', meta.ogTitle);
  _setMeta(head, 'name', 'twitter:description', meta.ogDescription);
  _setMeta(head, 'name', 'twitter:image', SITE.ogImage);

  let canonical = head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    head.appendChild(canonical);
  }
  canonical.href = meta.canonical;

  _injectSchema(head, 'schema-app', _buildAppSchema(tool, meta.canonical));
  if (Array.isArray(tool.faqs) && tool.faqs.length) {
    _injectSchema(head, 'schema-faq', _buildFAQSchema(tool.faqs));
  } else {
    head.querySelector('script[data-schema="schema-faq"]')?.remove();
  }
  _injectSchema(head, 'schema-breadcrumb', _buildBreadcrumbSchema(tool, meta.canonical));
}

export function buildToolHeadHTML(tool) {
  if (!tool?.slug) return '';
  const meta = _buildMeta(tool);
  const lines = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '',
    '<!-- Primary SEO -->',
    `<title>${_esc(meta.title)}</title>`,
    `<meta name="description" content="${_esc(meta.description)}" />`,
    '<meta name="robots" content="index, follow" />',
    `<link rel="canonical" href="${_esc(meta.canonical)}" />`,
    '',
    '<!-- Open Graph -->',
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${_esc(SITE.name)}" />`,
    `<meta property="og:title" content="${_esc(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${_esc(meta.ogDescription)}" />`,
    `<meta property="og:url" content="${_esc(meta.canonical)}" />`,
    `<meta property="og:image" content="${_esc(SITE.ogImage)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${_esc(meta.ogTitle)}" />`,
    '',
    '<!-- Twitter Card -->',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:site" content="${_esc(SITE.twitter)}" />`,
    `<meta name="twitter:title" content="${_esc(meta.ogTitle)}" />`,
    `<meta name="twitter:description" content="${_esc(meta.ogDescription)}" />`,
    `<meta name="twitter:image" content="${_esc(SITE.ogImage)}" />`,
  ];

  if (Array.isArray(tool.faqs) && tool.faqs.length) {
    lines.push('', '<!-- JSON-LD: FAQPage -->', '<script type="application/ld+json">', JSON.stringify(_buildFAQSchema(tool.faqs), null, 2), '</script>');
  }
  lines.push('', '<!-- JSON-LD: SoftwareApplication -->', '<script type="application/ld+json">', JSON.stringify(_buildAppSchema(tool, meta.canonical), null, 2), '</script>');
  lines.push('', '<!-- JSON-LD: BreadcrumbList -->', '<script type="application/ld+json">', JSON.stringify(_buildBreadcrumbSchema(tool, meta.canonical), null, 2), '</script>');
  return lines.join('\n');
}

function _buildMeta(tool) {
  const category = CATEGORY_LABELS[tool.category] ?? String(tool.category ?? 'Online');
  const canonical = `${SITE.domain}/tools/${tool.category}/${tool.slug}/`;
  return {
    canonical,
    title: `${tool.title} — Free Online ${category} Tool | ${SITE.name}`,
    ogTitle: tool.ogTitle ? `${tool.ogTitle} | ${SITE.name}` : `${tool.title} — Free & Instant | ${SITE.name}`,
    description: _truncate(tool.description, 160),
    ogDescription: _truncate(tool.ogDescription || tool.description, 200),
  };
}

function _buildAppSchema(tool, url) {
  const category = CATEGORY_LABELS[tool.category] ?? String(tool.category ?? 'Online');
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.title,
    description: tool.description || '',
    url,
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: category,
    operatingSystem: 'Web Browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    featureList: Array.isArray(tool.instructions) ? tool.instructions.join(' ') : undefined,
    screenshot: SITE.ogImage,
    provider: { '@type': 'Organization', name: SITE.name, url: SITE.domain, logo: SITE.logoURL },
    author: { '@type': 'Organization', name: SITE.name, url: SITE.domain },
    inLanguage: 'en',
  };
}

function _buildFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.filter(f => f?.q && f?.a).map(f => ({
      '@type': 'Question',
      name: String(f.q),
      acceptedAnswer: { '@type': 'Answer', text: String(f.a) },
    })),
  };
}

function _buildBreadcrumbSchema(tool, url) {
  const category = CATEGORY_LABELS[tool.category] ?? String(tool.category ?? 'Online');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.domain}/` },
      { '@type': 'ListItem', position: 2, name: category, item: `${SITE.domain}/tools/${tool.category}/` },
      { '@type': 'ListItem', position: 3, name: tool.title, item: url },
    ],
  };
}

function _setMeta(head, attrName, attrVal, content) {
  const selector = `meta[${attrName}="${CSS.escape(attrVal)}"]`;
  let el = head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    head.appendChild(el);
  }
  el.content = content ?? '';
}

function _injectSchema(head, id, schemaObj) {
  head.querySelector(`script[data-schema="${CSS.escape(id)}"]`)?.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.schema = id;
  script.textContent = JSON.stringify(schemaObj);
  head.appendChild(script);
}

function _truncate(value, max) {
  const str = String(value ?? '').trim();
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trimEnd()}…`;
}

function _esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
