/**
 * Pixaroid — Master Tools Configuration
 *
 * Canonical configuration for the static website. Kept as a single source
 * for tooling that still imports this module; deployment itself does not run
 * a page/data generator or mutate committed site files.
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
    slug: 'resize-image',
    category: 'resize',
    title: 'Resize Image',
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
    slug: 'compress-pdf',
    category: 'pdf-tools',
    title: 'Compress PDF',
    interfaceType: 'pdf',
    workerFile: '/workers/pdf.worker.js',
  },
  {
    slug: 'jpg-to-pdf',
    category: 'pdf-tools',
    title: 'JPG to PDF',
    interfaceType: 'pdf',
    workerFile: '/workers/pdf.worker.js',
  },
  {
    slug: 'pdf-to-jpg',
    category: 'pdf-tools',
    title: 'PDF to JPG',
    interfaceType: 'pdf',
    workerFile: '/workers/pdf.worker.js',
  },
  {
    slug: 'crop-image',
    category: 'editor',
    title: 'Crop Image',
    interfaceType: 'edit',
    workerFile: '/workers/filter.worker.js',
  },
  {
    slug: 'rotate-image',
    category: 'editor',
    title: 'Rotate Image',
    interfaceType: 'edit',
    workerFile: '/workers/filter.worker.js',
  },
  {
    slug: 'youtube-thumbnail-maker',
    category: 'social-tools',
    title: 'YouTube Thumbnail Maker',
    interfaceType: 'social',
    workerFile: '/workers/filter.worker.js',
  },
];

export default TOOLS_CONFIG;
