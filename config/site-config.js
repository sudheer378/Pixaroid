/**
 * Pixaroid — Global Site Configuration
 * CANONICAL DOMAIN: https://pixaroid.vercel.app
 * All sitemaps, canonicals, and SEO must use this domain exclusively.
 */
const SITE_CONFIG = {
  name:        'Pixaroid',
  tagline:     'Next Generation AI Image Tools',
  description: 'Pixaroid offers free browser-based image and PDF tools: compress, convert, resize, edit, AI enhance, and social-media optimise — no upload, no server.',
  url:         'https://pixaroid.vercel.app',
  canonicalDomain: 'https://pixaroid.vercel.app',

  brand: {
    primary:    '#4F46E5',
    secondary:  '#06B6D4',
    accent:     '#8B5CF6',
    background: '#F9FAFB',
  },

  fonts: {
    heading: 'Poppins',
    body:    'Inter',
  },

  logo:          '/assets/svg/logo.svg',
  favicon:       '/assets/svg/favicon.svg',
  uiIcons:       '/assets/svg/ui-icons.svg',
  toolIcons:     '/assets/svg/tool-icons.svg',
  ogImage:       '/assets/images/og-default.png',
  twitterHandle: '@pixaroidapp',

  categories: ['compress', 'convert', 'resize', 'editor', 'ai', 'social'],

  features: {
    webWorkers:     true,
    canvasAPI:      true,
    pwa:            true,
    darkMode:       true,
    aiTools:        true,
  },

  // No analytics or tracking is loaded anywhere on Pixaroid (privacy-first).
  analytics: { ga4: '', clarity: '' },

  // Monetization was removed pre-launch (see AUDIT_PRELAUNCH_QWEN.md P1-2).
  // Do not re-enable without truthful ads.txt + privacy/cookie policy disclosure.
  monetization: { enabled: false },

  ads: { enabled: false },
  deployment: { provider: 'vercel', outputDir: '.' },
};

export default SITE_CONFIG;
