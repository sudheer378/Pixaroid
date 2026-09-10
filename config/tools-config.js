/**
 * Pixaroid — Runtime Tool Compatibility Configuration
 *
 * This registry exists for legacy/runtime JS modules that still import
 * `/config/tools-config.js`. The committed static HTML pages remain
 * canonical, and deployment must not generate or mutate page data.
 *
 * Keep entries aligned with the active worker/interface contract used by
 * `js/pages/tool-runner.js` and `js/modules/internal-links.js`.
 */

const TOOLS_CONFIG = [
  {
    slug: 'compress-image',
    category: 'compression',
    title: 'Compress Image',
    interfaceType: 'compress',
    workerFile: '/workers/compress.worker.js',
  },
  {
    slug: 'compress-image-to-20kb',
    category: 'compression',
    title: 'Compress Image to 20KB',
    interfaceType: 'compress-target',
    workerFile: '/workers/compress.worker.js',
  },
  {
    slug: 'jpg-to-png',
    category: 'conversion',
    title: 'JPG to PNG',
    interfaceType: 'convert',
    workerFile: '/workers/convert.worker.js',
  },
  {
    slug: 'png-to-jpg',
    category: 'conversion',
    title: 'PNG to JPG',
    interfaceType: 'convert',
    workerFile: '/workers/convert.worker.js',
  },
  {
    slug: 'webp-to-jpg',
    category: 'conversion',
    title: 'WebP to JPG',
    interfaceType: 'convert',
    workerFile: '/workers/convert.worker.js',
  },
  {
    slug: 'heic-to-jpg',
    category: 'conversion',
    title: 'HEIC to JPG',
    interfaceType: 'convert',
    workerFile: '/workers/convert.worker.js',
  },
  {
    slug: 'resize-image',
    category: 'resize',
    title: 'Resize Image',
    interfaceType: 'resize',
    workerFile: '/workers/resize.worker.js',
  },
  {
    slug: 'resize-passport-photo',
    category: 'resize',
    title: 'Passport Photo Resizer',
    interfaceType: 'resize',
    workerFile: '/workers/resize.worker.js',
  },
  {
    slug: 'background-remover',
    category: 'ai-tools',
    title: 'Background Remover',
    interfaceType: 'ai-bg-remove',
    workerFile: '/workers/ai.worker.js',
  },
  {
    slug: 'image-upscaler',
    category: 'ai-tools',
    title: 'Image Upscaler',
    interfaceType: 'ai-upscale',
    workerFile: '/workers/ai.worker.js',
  },
  {
    slug: 'image-to-text-ocr',
    category: 'ai-tools',
    title: 'Image to Text OCR',
    interfaceType: 'ai-ocr',
    workerFile: '/workers/ai.worker.js',
  },
  {
    slug: 'crop-image',
    category: 'editor',
    title: 'Crop Image',
    interfaceType: 'crop',
    workerFile: '/workers/filter.worker.js',
  },
  {
    slug: 'rotate-image',
    category: 'editor',
    title: 'Rotate Image',
    interfaceType: 'rotate',
    workerFile: '/workers/filter.worker.js',
  },
  {
    slug: 'youtube-thumbnail-maker',
    category: 'social-tools',
    title: 'YouTube Thumbnail Maker',
    interfaceType: 'social-canvas',
    workerFile: '/workers/resize.worker.js',
  },
];

export default TOOLS_CONFIG;
