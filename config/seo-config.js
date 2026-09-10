/**
 * Pixaroid — SEO Configuration
 * Canonical domain: https://pixaroid.vercel.app
 *
 * This file is retained as a compatibility configuration source. The live
 * static site is committed directly; no build-time page generator should
 * rewrite HTML, sitemaps, or site data during deployment.
 */

const SEO_CONFIG = {
  site: {
    name: 'Pixaroid',
    tagline: 'Free Browser-Based Image & PDF Tools',
    domain: 'https://pixaroid.vercel.app',
    twitter: '@pixaroidapp',
    locale: 'en_US',
    language: 'en',
  },

  ogImage: {
    url: 'https://pixaroid.vercel.app/assets/images/og-default.png',
    width: 1200,
    height: 630,
    alt: 'Pixaroid — Free Image and PDF Tools',
    type: 'image/png',
  },

  icons: {
    favicon: '/assets/svg/favicon.svg',
    appleTouchIcon: '/assets/images/apple-touch-icon.png',
    manifest: '/manifest.json',
  },

  themeColor: '#4F46E5',

  sitemaps: [
    'https://pixaroid.vercel.app/sitemap.xml',
    'https://pixaroid.vercel.app/sitemap-tools.xml',
  ],

  homepage: {
    title: 'Pixaroid — Free Image & PDF Tools | Compress, Convert, Resize, Edit',
    description: 'Free browser-based tools to compress, convert, resize, edit and process images and PDFs. No upload required for supported tools.',
    ogTitle: 'Pixaroid — Free Image & PDF Tools',
    ogDescription: 'Free browser-based tools for image and PDF tasks with privacy-focused local processing where supported.',
    robots: 'index, follow',
    changefreq: 'daily',
    priority: '1.00',
  },

  categories: {
    compression: {
      title: 'Image Compression Tools — Free Online | Pixaroid',
      description: 'Compress JPEG, PNG, WebP and other supported images to reduce file size while keeping useful image quality. Browser-based where supported.',
      priority: '0.88',
    },
    conversion: {
      title: 'Image Format Conversion Tools — Free Online | Pixaroid',
      description: 'Convert images between common formats such as JPG, PNG, WebP, HEIC and other supported formats without uploading files where supported.',
      priority: '0.88',
    },
    resize: {
      title: 'Image Resize Tools — Resize for Any Platform | Pixaroid',
      description: 'Resize images by pixels or for common use cases such as social media, wallpapers, documents and other supported dimensions.',
      priority: '0.85',
    },
    editor: {
      title: 'Online Image Editor Tools — Crop, Rotate, Adjust & More | Pixaroid',
      description: 'Edit images with crop, rotate, flip, adjustment, watermark, text and other supported browser-based editing tools.',
      priority: '0.83',
    },
    'ai-tools': {
      title: 'AI Image Tools — Background Remover, Upscaler & OCR | Pixaroid',
      description: 'Use Pixaroid AI-powered image utilities including background removal, upscaling, enhancement and OCR where supported.',
      priority: '0.86',
    },
    'social-tools': {
      title: 'Social Media Image Tools — YouTube, Instagram, LinkedIn & More | Pixaroid',
      description: 'Create and resize images for popular social platforms using dedicated Pixaroid tools.',
      priority: '0.80',
    },
    utilities: {
      title: 'Image Utilities — Metadata, Dimensions, File Size & More | Pixaroid',
      description: 'Inspect image properties and perform useful image calculations and utility tasks directly in the browser.',
      priority: '0.74',
    },
    'bulk-tools': {
      title: 'Bulk Image Tools — Compress, Resize, Convert & More | Pixaroid',
      description: 'Process multiple images with supported bulk compression, resizing, conversion and related tools.',
      priority: '0.77',
    },
  },

  toolTitleSuffix: '— Free Online Tool | Pixaroid',
  defaultRobots: 'index, follow',
  noindexRobots: 'noindex, nofollow',

  organization: {
    '@type': 'Organization',
    name: 'Pixaroid',
    url: 'https://pixaroid.vercel.app',
    logo: 'https://pixaroid.vercel.app/assets/svg/logo.svg',
    sameAs: ['https://twitter.com/pixaroidapp'],
  },

  verification: {
    google: '',
    bing: '',
    yandex: '',
  },
};

export default SEO_CONFIG;
