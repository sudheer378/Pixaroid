/**
 * Pixaroid PDF Worker v4.0 - High Performance
 * Web Worker for PDF processing operations
 * Supports merge, split, compress, rotate, watermark, convert operations
 */

importScripts('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js');

let pdfjsLoaded = false;

// Load PDF.js dynamically
async function loadPdfJs() {
  if (pdfjsLoaded) return true;
  
  return new Promise((resolve, reject) => {
    if (self.pdfjsLib) {
      pdfjsLoaded = true;
      resolve(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      self.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjsLoaded = true;
      resolve(true);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Merge multiple PDFs
async function mergePDFs(buffers, onProgress) {
  const { PDFDocument } = self.PDFLib;
  const mergedDoc = await PDFDocument.create();
  const totalFiles = buffers.length;
  
  for (let i = 0; i < totalFiles; i++) {
    const srcDoc = await PDFDocument.load(buffers[i]);
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach(page => mergedDoc.addPage(page));
    
    if (onProgress) {
      self.postMessage({ type: 'progress', percent: Math.round(((i + 1) / totalFiles) * 100) });
    }
  }
  
  const pdfBytes = await mergedDoc.save({ useObjectStreams: false });
  return pdfBytes;
}

// Split PDF into pages
async function splitPDF(buffer, options, onProgress) {
  const { PDFDocument } = self.PDFLib;
  const srcDoc = await PDFDocument.load(buffer);
  const totalPages = srcDoc.getPageCount();
  
  let pageIndices = [];
  if (options.pages && options.pages !== 'all') {
    pageIndices = parsePageRange(options.pages, totalPages);
  } else {
    pageIndices = Array.from({ length: totalPages }, (_, i) => i);
  }
  
  if (pageIndices.length === 1) {
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIndices[0]]);
    singleDoc.addPage(copiedPage);
    return await singleDoc.save();
  }
  
  // Multiple pages - return array of buffers
  const results = [];
  for (let i = 0; i < pageIndices.length; i++) {
    const doc = await PDFDocument.create();
    const [copiedPage] = await doc.copyPages(srcDoc, [pageIndices[i]]);
    doc.addPage(copiedPage);
    const pdfBytes = await doc.save();
    results.push(pdfBytes);
    
    if (onProgress) {
      self.postMessage({ type: 'progress', percent: Math.round(((i + 1) / pageIndices.length) * 100) });
    }
  }
  
  return results;
}

// Compress PDF by rendering to images and re-embedding
async function compressPDF(buffer, options, onProgress) {
  await loadPdfJs();
  const { PDFDocument } = self.PDFLib;
  
  const pdf = await self.pdfjsLib.getDocument({ data: buffer }).promise;
  const numPages = Math.min(pdf.numPages, options.maxPages || 50);
  
  const dpiMap = {
    'low': 150,
    'medium': 120,
    'high': 96,
    'extreme': 72
  };
  const dpi = dpiMap[options.level] || 120;
  const scale = dpi / 72;
  const imgQuality = dpi <= 96 ? 0.6 : dpi <= 120 ? 0.75 : 0.88;
  
  const newDoc = await PDFDocument.create();
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    // Use OffscreenCanvas for better performance
    const canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: imgQuality });
    const jpegArrayBuffer = await jpegBlob.arrayBuffer();
    
    const embeddedImage = await newDoc.embedJpg(jpegArrayBuffer);
    const origViewport = page.getViewport({ scale: 1 });
    const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height
    });
    
    if (onProgress) {
      self.postMessage({ type: 'progress', percent: Math.round((i / numPages) * 100) });
    }
  }
  
  return await newDoc.save({ useObjectStreams: true });
}

// Rotate PDF pages
async function rotatePDF(buffer, options, onProgress) {
  const { PDFDocument, degrees } = self.PDFLib;
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  const angleMap = {
    '90': 90,
    '180': 180,
    '270': 270,
    '-90': 270,
    '-180': 180,
    '-270': 90
  };
  const angle = angleMap[String(options.angle)] || 90;
  
  let pageIndices = [];
  if (options.pages && options.pages !== 'all') {
    pageIndices = parsePageRange(options.pages, totalPages);
  } else {
    pageIndices = pages.map((_, i) => i);
  }
  
  const pageSet = new Set(pageIndices);
  pages.forEach((page, i) => {
    if (pageSet.has(i)) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angle) % 360));
    }
  });
  
  return await pdfDoc.save();
}

// Add watermark to PDF
async function watermarkPDF(buffer, options, onProgress) {
  const { PDFDocument, rgb, degrees, StandardFonts } = self.PDFLib;
  
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const text = options.text || 'CONFIDENTIAL';
  const opacity = (parseFloat(options.opacity) || 30) / 100;
  const rotation = parseFloat(options.rotation) || -45;
  
  let color = { r: 0.5, g: 0.5, b: 0.5 };
  if (options.color) {
    const hex = options.color.replace('#', '');
    color.r = parseInt(hex.slice(0, 2), 16) / 255;
    color.g = parseInt(hex.slice(2, 4), 16) / 255;
    color.b = parseInt(hex.slice(4, 6), 16) / 255;
  }
  
  let pageIndices = [];
  if (options.pages && options.pages !== 'all') {
    pageIndices = parsePageRange(options.pages, totalPages);
  } else {
    pageIndices = pages.map((_, i) => i);
  }
  
  const pageSet = new Set(pageIndices);
  pages.forEach((page, i) => {
    if (pageSet.has(i)) {
      const { width, height } = page.getSize();
      const fontSize = Math.max(24, Math.min(72, width * 0.07));
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(rotation)
      });
    }
    
    if (onProgress) {
      self.postMessage({ type: 'progress', percent: Math.round(((i + 1) / totalPages) * 100) });
    }
  });
  
  return await pdfDoc.save();
}

// Convert image to PDF
async function imageToPDF(buffers, options, onProgress) {
  const { PDFDocument } = self.PDFLib;
  const pdfDoc = await PDFDocument.create();
  
  const pageSize = options.pageSize || 'A4';
  const orientation = options.orientation || 'portrait';
  const margin = parseInt(options.margin) || 10;
  
  const PAGE_SIZES = {
    'A4': [595.28, 841.89],
    'Letter': [612, 792],
    'A3': [841.89, 1190.55],
    'Legal': [612, 1008]
  };
  
  let [pageWidth, pageHeight] = PAGE_SIZES[pageSize] || PAGE_SIZES['A4'];
  if (orientation === 'landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }
  
  for (let i = 0; i < buffers.length; i++) {
    const imageData = buffers[i];
    
    // Create ImageBitmap from buffer
    const blob = new Blob([imageData], { type: 'image/jpeg' });
    const bitmap = await createImageBitmap(blob);
    
    // Create OffscreenCanvas to get JPEG data
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    
    const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    const jpegArrayBuffer = await jpegBlob.arrayBuffer();
    
    const embeddedImage = await pdfDoc.embedJpg(jpegArrayBuffer);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;
    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;
    
    page.drawImage(embeddedImage, { x, y, width: drawWidth, height: drawHeight });
    
    if (onProgress) {
      self.postMessage({ type: 'progress', percent: Math.round(((i + 1) / buffers.length) * 100) });
    }
  }
  
  return await pdfDoc.save();
}

// Convert PDF to images
async function pdfToImages(buffer, options, onProgress) {
  await loadPdfJs();
  
  const pdf = await self.pdfjsLib.getDocument({ data: buffer }).promise;
  const numPages = Math.min(pdf.numPages, options.maxPages || 50);
  
  const dpiMap = {
    '72': 72,
    '150': 150,
    '300': 300
  };
  const dpi = dpiMap[options.dpi] || 150;
  const scale = dpi / 72;
  const outputFormat = options.format || 'jpeg';
  const quality = parseInt(options.quality) || 90;
  
  const results = [];
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const blob = await canvas.convertToBlob({ 
      type: outputFormat === 'png' ? 'image/png' : 'image/jpeg',
      quality: outputFormat === 'png' ? undefined : quality / 100
    });
    
    results.push(await blob.arrayBuffer());
    
    if (onProgress) {
      self.postMessage({ type: 'progress', percent: Math.round((i / numPages) * 100) });
    }
  }
  
  return results;
}

// Parse page range string
function parsePageRange(rangeStr, total) {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: total }, (_, i) => i);
  }
  
  const indices = [];
  rangeStr.split(',').forEach(part => {
    part = part.trim();
    const dash = part.indexOf('-');
    if (dash > 0) {
      const from = parseInt(part) - 1;
      const to = parseInt(part.slice(dash + 1)) - 1;
      for (let i = from; i <= Math.min(to, total - 1); i++) {
        if (i >= 0) indices.push(i);
      }
    } else {
      const n = parseInt(part) - 1;
      if (n >= 0 && n < total) indices.push(n);
    }
  });
  
  return indices.length ? [...new Set(indices)] : Array.from({ length: total }, (_, i) => i);
}

// Message handler
self.onmessage = async function(e) {
  const { jobId, op, buffers, buffer, options } = e.data;
  
  try {
    let result;
    
    switch (op) {
      case 'merge':
        result = await mergePDFs(buffers, true);
        break;
        
      case 'split':
        result = await splitPDF(buffer, options || {}, true);
        break;
        
      case 'compress':
        result = await compressPDF(buffer, options || {}, true);
        break;
        
      case 'rotate':
        result = await rotatePDF(buffer, options || {}, true);
        break;
        
      case 'watermark':
        result = await watermarkPDF(buffer, options || {}, true);
        break;
        
      case 'image-to-pdf':
        result = await imageToPDF(buffers, options || {}, true);
        break;
        
      case 'pdf-to-images':
        result = await pdfToImages(buffer, options || {}, true);
        break;
        
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
    
    self.postMessage({ 
      jobId, 
      success: true, 
      result,
      type: 'complete'
    });
    
  } catch (error) {
    self.postMessage({ 
      jobId, 
      success: false, 
      error: error.message,
      type: 'error'
    });
  }
};
