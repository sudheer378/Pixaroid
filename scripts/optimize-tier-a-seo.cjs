#!/usr/bin/env node
/**
 * Evidence-based SEO pass for high-impression Tier A tool pages.
 * Preserves URLs and tool functionality while adding intent-specific metadata,
 * explanatory copy and contextual links.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const BASE = 'https://pixaroid.vercel.app';

const pages = {
  'tools/resize/resize-image-for-chromebook/index.html': {
    title: 'Resize Image for Chromebook 1366×768 Free | Pixaroid',
    description: 'Resize images to 1366×768 for Chromebook wallpapers and screens. Free browser-based image resizer with no upload required.',
    h2: 'Resize an image for a Chromebook screen',
    copy: 'Use this Pixaroid tool when you need an image sized for a Chromebook display or wallpaper. The 1366×768 preset is a practical starting point for Chromebook screens; check your device model if it uses a different native resolution. Processing happens in your browser, so your image does not need to be uploaded to a server.',
    links: [['/tools/resize/resize-image/', 'Resize Image'], ['/tools/resize/resize-image-for-ipad-wallpaper/', 'iPad Wallpaper'], ['/tools/resize/resize-image-for-macbook-wallpaper/', 'MacBook Wallpaper']]
  },
  'tools/compression/compress-jpg-to-15kb/index.html': {
    title: 'Compress JPG to 15KB Online Free — No Upload | Pixaroid',
    description: 'Compress a JPG toward a 15KB file-size target in your browser. Free, no upload required, with a preview so you can check the result.',
    h2: 'Compress a JPG toward 15KB',
    copy: 'Use this page when a form, website or application has a small JPG file-size limit. The compressor works toward a 15KB target, but the achievable size and visual quality depend on the original image dimensions, detail and format. Check the resulting file before submitting it to a service with a strict limit.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/compression/compress-jpg-to-30kb/', 'Compress JPG to 30KB'], ['/tools/compression/compress-jpeg-to-35kb/', 'Compress JPEG to 35KB']]
  },
  'tools/resize/resize-image-for-ipad-wallpaper/index.html': {
    title: 'Resize Image for iPad Wallpaper Free Online | Pixaroid',
    description: 'Resize an image for iPad wallpaper use with a browser-based tool. Free, private and no upload required.',
    h2: 'Resize an image for iPad wallpaper',
    copy: 'Prepare an image for use as an iPad wallpaper without installing software. Choose the dimensions that match your iPad model or display, then preview the result before saving. Because the tool runs in your browser, your source image can stay on your device.',
    links: [['/tools/resize/resize-image/', 'Resize Image'], ['/tools/resize/resize-image-for-chromebook/', 'Chromebook Wallpaper'], ['/tools/resize/resize-image-for-macbook-wallpaper/', 'MacBook Wallpaper']]
  },
  'tools/compression/compress-jpeg-to-500kb/index.html': {
    title: 'Compress JPEG to 500KB Free Online — No Upload | Pixaroid',
    description: 'Compress a JPEG toward a 500KB target in your browser. Free, no upload required, with visual preview before download.',
    h2: 'Compress a JPEG toward 500KB',
    copy: 'A 500KB target can be useful for websites, forms and services that limit image file size. Pixaroid works toward the requested target while balancing dimensions and image quality. Very detailed or large source images may require more quality reduction or resizing, so always review the output before uploading it elsewhere.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/compression/compress-image-to-250kb/', 'Compress to 250KB'], ['/tools/compression/compress-webp-to-500kb/', 'Compress WebP to 500KB']]
  },
  'tools/resize/resize-image-for-id-card/index.html': {
    title: 'Resize Photo for ID Card Free Online — No Upload | Pixaroid',
    description: 'Resize a photo for ID-card and identification-document workflows. Browser-based, free and no upload required.',
    h2: 'Resize a photo for an ID card',
    copy: 'Use this tool to prepare a photo for an ID-card workflow. The preset dimensions are a technical image-size aid, not a guarantee that they match every government, institution or application requirement. Check the official instructions for the exact pixel dimensions, aspect ratio, file format and file-size limit before submitting your photo.',
    links: [['/tools/resize/resize-image/', 'Resize Image'], ['/tools/resize/passport-photo/', 'Passport Photo'], ['/tools/compression/compress-image/', 'Compress Image']]
  },
  'tools/compression/compress-image-to-250kb/index.html': {
    title: 'Compress Image to 250KB Free Online — No Upload | Pixaroid',
    description: 'Compress an image toward a 250KB target in your browser. Free, private and no upload required.',
    h2: 'Compress an image toward 250KB',
    copy: 'Use a 250KB target when a website, form or application needs a smaller image file. The final result depends on the source image and compression format, so Pixaroid treats 250KB as a target rather than a universal quality guarantee. Preview the output and verify the file size before submitting it.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/compression/compress-jpeg-to-250kb/', 'Compress JPEG to 250KB'], ['/tools/compression/compress-webp-to-250kb/', 'Compress WebP to 250KB']]
  },
  'tools/resize/resize-image-to-1200x800/index.html': {
    title: 'Resize Image to 1200×800 Free Online | Pixaroid',
    description: 'Resize an image to 1200×800 pixels in your browser. Free online tool with no upload required.',
    h2: 'Resize an image to 1200×800 pixels',
    copy: '1200×800 is a useful landscape canvas for many web graphics and content layouts. This tool helps you create that exact pixel canvas while giving you control over how the source image fits. If the original aspect ratio differs, choose a crop or fit mode that matches your intended use.',
    links: [['/tools/resize/resize-image/', 'Resize Image'], ['/tools/resize/resize-image-by-pixels/', 'Resize by Pixels'], ['/tools/compression/compress-image/', 'Compress Image']]
  },
  'tools/compression/compress-jpeg-to-35kb/index.html': {
    title: 'Compress JPEG to 35KB Free Online — No Upload | Pixaroid',
    description: 'Compress a JPEG toward a 35KB target in your browser. Free, no upload required and easy to preview before download.',
    h2: 'Compress a JPEG toward 35KB',
    copy: 'Use this target-size compressor for applications and uploads that need a small JPEG. A 35KB result may require reducing dimensions as well as JPEG quality for complex images. The target is an output goal, not a promise that every source image can reach it without visible changes.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/compression/compress-jpg-to-15kb/', 'Compress JPG to 15KB'], ['/tools/compression/compress-jpg-to-30kb/', 'Compress JPG to 30KB']]
  },
  'tools/compression/compress-webp-to-100kb/index.html': {
    title: 'Compress WebP to 100KB Free Online — No Upload | Pixaroid',
    description: 'Compress a WebP image toward 100KB in your browser. Free, private and no upload required.',
    h2: 'Compress WebP toward 100KB',
    copy: 'A 100KB WebP target can help reduce image weight for websites and other online uses. The achievable result depends on the source dimensions, detail and WebP settings. Review the output for both file size and visual quality instead of assuming that a target size will look identical for every image.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/compression/compress-webp-to-250kb/', 'Compress WebP to 250KB'], ['/tools/compression/compress-webp-to-500kb/', 'Compress WebP to 500KB']]
  },
  'tools/compression/compress-jpg-to-30kb/index.html': {
    title: 'Compress JPG to 30KB Free Online — No Upload | Pixaroid',
    description: 'Compress a JPG toward a 30KB file-size target in your browser. Free, private and no upload required.',
    h2: 'Compress a JPG toward 30KB',
    copy: 'Use the 30KB target when a form or online service has a small JPG limit. Highly detailed or large images may need both resizing and stronger compression to approach the target. Always check the downloaded file against the destination service requirements before submission.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/compression/compress-jpg-to-15kb/', 'Compress JPG to 15KB'], ['/tools/compression/compress-jpeg-to-35kb/', 'Compress JPEG to 35KB']]
  },
  'tools/conversion/convert-avif-to-jpeg/index.html': {
    title: 'Convert AVIF to JPEG Free Online — No Upload | Pixaroid',
    description: 'Convert AVIF images to JPEG in your browser. Free online conversion with no upload required.',
    h2: 'Convert AVIF images to JPEG',
    copy: 'AVIF can be efficient for modern web delivery, but some apps and workflows still require JPEG. This converter creates a JPEG copy in your browser so you can use the image with software or services that expect the more widely supported format. Check the output dimensions and visual quality before publishing or submitting it.',
    links: [['/tools/conversion/jpg-to-png/', 'JPG to PNG'], ['/tools/conversion/jpg-to-webp/', 'JPG to WebP'], ['/tools/conversion/webp-to-jpg/', 'WebP to JPG']]
  },
  'tools/compression/compress-image-for-shopify/index.html': {
    title: 'Compress Images for Shopify Free Online — No Upload | Pixaroid',
    description: 'Optimize product and store images for Shopify by reducing image file size in your browser. Free and no upload required.',
    h2: 'Compress images for Shopify stores',
    copy: 'Smaller product images can reduce the amount of data browsers need to download. Use Pixaroid to prepare images before adding them to a Shopify store, then verify the final dimensions, format and appearance in your storefront. Shopify-specific theme and image requirements can vary, so this tool is an optimization aid rather than a substitute for your store settings.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/conversion/jpg-to-webp/', 'JPG to WebP'], ['/tools/resize/resize-image/', 'Resize Image']]
  },
  'tools/conversion/svg-to-png/index.html': {
    title: 'Convert SVG to PNG Free Online — No Upload | Pixaroid',
    description: 'Convert SVG graphics to PNG in your browser. Free online SVG to PNG conversion with no upload required.',
    h2: 'Convert SVG graphics to PNG',
    copy: 'PNG is useful when a workflow needs a raster image instead of scalable SVG markup. Use this converter to create a PNG representation of an SVG graphic, then check the output dimensions because rasterization requires a chosen pixel size. Keep the original SVG when you need infinite scaling or editable vector content.',
    links: [['/tools/conversion/jpg-to-png/', 'JPG to PNG'], ['/tools/conversion/png-to-jpg/', 'PNG to JPG'], ['/tools/resize/resize-image/', 'Resize Image']]
  },
  'tools/conversion/tiff-to-gif/index.html': {
    title: 'Convert TIFF to GIF Free Online — No Upload | Pixaroid',
    description: 'Convert TIFF images to GIF in your browser. Free online conversion with no upload required.',
    h2: 'Convert TIFF images to GIF',
    copy: 'GIF is a widely supported raster format that can be useful for simple graphics and limited-color imagery. TIFF files can contain high-quality image data, so conversion to GIF may reduce color depth or other image characteristics. Review the resulting file before using it in a workflow where image fidelity matters.',
    links: [['/tools/conversion/jpg-to-png/', 'JPG to PNG'], ['/tools/conversion/png-to-jpg/', 'PNG to JPG'], ['/tools/compression/compress-image/', 'Compress Image']]
  },
  'tools/compression/compress-webp-to-250kb/index.html': {
    title: 'Compress WebP to 250KB Free Online — No Upload | Pixaroid',
    description: 'Compress WebP toward a 250KB target in your browser. Free and no upload required.',
    h2: 'Compress WebP toward 250KB',
    copy: 'Use a 250KB WebP target when you need a smaller web image while retaining the WebP format. The final appearance depends on source dimensions and image detail, so preview the result and adjust dimensions when necessary.',
    links: [['/tools/compression/compress-webp-to-100kb/', 'Compress WebP to 100KB'], ['/tools/compression/compress-webp-to-500kb/', 'Compress WebP to 500KB'], ['/tools/compression/compress-image/', 'Compress Image']]
  },
  'tools/compression/compress-webp-to-500kb/index.html': {
    title: 'Compress WebP to 500KB Free Online — No Upload | Pixaroid',
    description: 'Compress WebP toward a 500KB target in your browser. Free, private and no upload required.',
    h2: 'Compress WebP toward 500KB',
    copy: 'A 500KB WebP target can be useful for web publishing and uploads with file-size limits. The source image determines how much compression is needed, so inspect the output rather than assuming the same settings work for every image.',
    links: [['/tools/compression/compress-webp-to-100kb/', 'Compress WebP to 100KB'], ['/tools/compression/compress-webp-to-250kb/', 'Compress WebP to 250KB'], ['/tools/compression/compress-image/', 'Compress Image']]
  },
  'tools/compression/compress-image-without-losing-quality/index.html': {
    title: 'Compress Image While Preserving Quality — Free | Pixaroid',
    description: 'Reduce image file size while preserving as much visual quality as practical. Free browser-based compression with no upload required.',
    h2: 'Compress an image while preserving visual quality',
    copy: 'Image compression always involves trade-offs: the best settings depend on the source format, dimensions and intended use. Instead of promising zero quality loss, Pixaroid lets you reduce file size and evaluate the result before downloading. For maximum control, resize an image to its final display dimensions before compression.',
    links: [['/tools/compression/compress-image/', 'Compress Image'], ['/tools/compression/compress-image-to-250kb/', 'Compress to 250KB'], ['/tools/conversion/jpg-to-webp/', 'JPG to WebP']]
  },
  'tools/compression/compress-webp-to-25kb/index.html': {
    title: 'Compress WebP to 25KB Free Online — No Upload | Pixaroid',
    description: 'Compress WebP toward a 25KB target in your browser. Free, private and no upload required.',
    h2: 'Compress WebP toward 25KB',
    copy: 'Use this page for very small WebP upload limits. Reaching 25KB may require reducing image dimensions as well as compression strength, especially for detailed photos. Treat the target as a file-size goal and review the output before submitting it.',
    links: [['/tools/compression/compress-webp-to-100kb/', 'Compress WebP to 100KB'], ['/tools/compression/compress-jpg-to-30kb/', 'Compress JPG to 30KB'], ['/tools/compression/compress-image/', 'Compress Image']]
  },
  'tools/compression/compress-jpeg-to-250kb/index.html': {
    title: 'Compress JPEG to 250KB Free Online — No Upload | Pixaroid',
    description: 'Compress JPEG toward a 250KB target in your browser. Free online compression with no upload required.',
    h2: 'Compress JPEG toward 250KB',
    copy: 'A 250KB JPEG target can help meet image-size limits for forms and websites. Results depend on the source image, so the compressor may need to balance dimensions and JPEG quality. Preview the output and verify the final file size before uploading it.',
    links: [['/tools/compression/compress-jpeg-to-500kb/', 'Compress JPEG to 500KB'], ['/tools/compression/compress-image-to-250kb/', 'Compress Image to 250KB'], ['/tools/compression/compress-image/', 'Compress Image']]
  }
};

function esc(s) { return s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function meta(html, name, value) {
  const re = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
  return re.test(html) ? html.replace(re, `<meta name="${name}" content="${esc(value)}"/>`) : html.replace(/<head>/i, `<head>\n<meta name="${name}" content="${esc(value)}"/>`);
}
function prop(html, name, value) {
  const re = new RegExp(`<meta\\s+property=["']${name}["'][^>]*>`, 'i');
  return re.test(html) ? html.replace(re, `<meta property="${name}" content="${esc(value)}"/>`) : html;
}
function canonical(html, url) {
  const re = new RegExp('<link\\s+rel=["\']canonical["\'][^>]*>', 'i');
  return re.test(html) ? html.replace(re, `<link rel="canonical" href="${url}"/>`) : html.replace(/<head>/i, `<head>\n<link rel="canonical" href="${url}"/>`);
}
function title(html, value) { return /<title>[^<]*<\/title>/i.test(html) ? html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(value)}</title>`) : html.replace(/<head>/i, `<head><title>${esc(value)}</title>`); }
function stripGenerated(html) { return html.replace(/\s*<section data-seo-tier-a="true">[\s\S]*?<\/section>\s*/gi, '\n'); }
function process(rel, data) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.warn(`[tier-a] Missing: ${rel}`); return false; }
  const url = `${BASE}/${rel.replace(/\\index\.html$/, '/')}`;
  const original = fs.readFileSync(file, 'utf8');
  let html = original;
  html = title(html, data.title);
  html = meta(html, 'description', data.description);
  html = meta(html, 'robots', 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1');
  html = canonical(html, url);
  html = prop(html, 'og:title', data.title);
  html = prop(html, 'og:description', data.description);
  html = prop(html, 'og:url', url);
  html = prop(html, 'twitter:title', data.title);
  html = prop(html, 'twitter:description', data.description);
  html = html.replace(/\n?<meta name=["']keywords["'][^>]*>/gi, '');
  html = html.replace(/\s*"aggregateRating"\s*:\s*\{[^{}]*\}\s*,?/g, '');
  html = stripGenerated(html);
  const links = data.links.map(([href,label]) => `<a href="${href}">${esc(label)}</a>`).join('');
  const section = `\n<section data-seo-tier-a="true"><h2>${esc(data.h2)}</h2><p>${esc(data.copy)}</p><p><strong>Related Pixaroid tools:</strong> ${links}</p></section>\n`;
  const pos = html.toLowerCase().lastIndexOf('</main>');
  const body = html.toLowerCase().lastIndexOf('</body>');
  const at = pos >= 0 ? pos : body;
  if (at >= 0) html = html.slice(0, at) + section + html.slice(at);
  if (html !== original) { fs.writeFileSync(file, html); return true; }
  return false;
}
let changed = 0;
for (const [rel,data] of Object.entries(pages)) if (process(rel,data)) changed++;
console.log(`[tier-a] Updated ${changed}/${Object.keys(pages).length} Tier A pages.`);
