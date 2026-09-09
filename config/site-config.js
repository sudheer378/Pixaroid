/**
 * Pixaroid — Global Site Configuration
 * CANONICAL DOMAIN: https://pixaroid.vercel.app
 * All sitemaps, canonicals, and SEO must use this domain exclusively.
 */
const SITE_CONFIG = {
  name:        'Pixaroid',
  tagline:     'Next Generation AI Image Tools',
  description: 'Pixaroid offers 70+ free browser-based image tools: compress, convert, resize, edit, AI enhance, bulk process, and social-media optimise — no upload, no server.',
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

  categories: ['compress', 'convert', 'resize', 'editor', 'ai', 'bulk', 'social'],

  features: {
    webWorkers:     true,
    canvasAPI:      true,
    pwa:            true,
    darkMode:       true,
    bulkProcessing: true,
    aiTools:        true,
  },

  analytics: { ga4: 'G-XXXXXXXXXX', clarity: '' },

  monetization: {
    provider: 'Monetag',
    zoneId: '277292',
    script: 'https://quge5.com/88/tag.min.js',
    smartlinks: [
      'https://sordidcopper.com/ah4q89k44?key=b7b2b4355e9576b54f29b8445e7d6775',
      'https://sordidcopper.com/a7buqkb8ii?key=717a52ca31ccb8da56a9ae0bee29d372',
    ],
    enabled: true,
  },

  ads: { adsense: 'pub-XXXXXXXXXXXXXXXX', enabled: false },
  deployment: { provider: 'vercel', outputDir: 'dist' },
};

export default SITE_CONFIG;
