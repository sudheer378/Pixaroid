/**
 * Pixaroid PDF Engine v3.0 - Production Grade
 * Centralized PDF processing engine for all PDF tools
 * Compatible with Sejda.com and iLovePDF.com quality standards
 */

class PDFEngine {
  constructor() {
    this.PDFLib = null;
    this.PDFJS = null;
    this.loadedDocs = new Map();
    this.worker = null;
    this.jobCounter = 0;
    this.pendingJobs = new Map();
  }

  async init() {
    // Load PDF-lib
    if (!this.PDFLib) {
      await this.loadPdfLib();
    }
    // Load PDF.js
    if (!this.PDFJS) {
      await this.loadPdfJs();
    }
    return this;
  }

  async loadPdfLib() {
    return new Promise((resolve, reject) => {
      if (window.PDFLib) {
        this.PDFLib = window.PDFLib;
        resolve(this.PDFLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      script.onload = () => {
        this.PDFLib = window.PDFLib;
        resolve(this.PDFLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async loadPdfJs() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        this.PDFJS = window.pdfjsLib;
        resolve(this.PDFJS);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        this.PDFJS = window.pdfjsLib;
        resolve(this.PDFJS);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async merge(files, options = {}) {
    await this.init();
    const { PDFDocument } = this.PDFLib;
    const mergedDoc = await PDFDocument.create();
    const totalFiles = files.length;
    
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach(page => mergedDoc.addPage(page));
      
      if (options.onProgress) {
        options.onProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
    }
    
    const pdfBytes = await mergedDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  async split(file, options = {}) {
    await this.init();
    const { PDFDocument } = this.PDFLib;
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();
    
    let pageIndices = [];
    if (options.range) {
      pageIndices = this.parsePageRange(options.range, totalPages);
    } else {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }
    
    if (pageIndices.length === 1) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIndices[0]]);
      singleDoc.addPage(copiedPage);
      const pdfBytes = await singleDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    }
    
    // Multiple pages - return array of blobs
    const results = [];
    for (let i = 0; i < pageIndices.length; i++) {
      const doc = await PDFDocument.create();
      const [copiedPage] = await doc.copyPages(srcDoc, [pageIndices[i]]);
      doc.addPage(copiedPage);
      const pdfBytes = await doc.save();
      results.push(new Blob([pdfBytes], { type: 'application/pdf' }));
      
      if (options.onProgress) {
        options.onProgress(Math.round(((i + 1) / pageIndices.length) * 100));
      }
    }
    
    return results;
  }

  async compress(file, options = {}) {
    await this.init();
    await this.loadPdfJs();
    const { PDFDocument } = this.PDFLib;
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await this.PDFJS.getDocument({ data: arrayBuffer }).promise;
    const numPages = Math.min(pdf.numPages, 50);
    
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
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      
      const jpegDataUrl = canvas.toDataURL('image/jpeg', imgQuality);
      const jpegBlob = await this.dataUrlToBlob(jpegDataUrl);
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
      
      if (options.onProgress) {
        options.onProgress(Math.round((i / numPages) * 100));
      }
    }
    
    const pdfBytes = await newDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  async rotate(file, options = {}) {
    await this.init();
    const { PDFDocument, degrees } = this.PDFLib;
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
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
    if (options.pages) {
      pageIndices = this.parsePageRange(options.pages, totalPages);
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
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  async watermark(file, options = {}) {
    await this.init();
    const { PDFDocument, rgb, degrees, StandardFonts } = this.PDFLib;
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
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
    if (options.pages) {
      pageIndices = this.parsePageRange(options.pages, totalPages);
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
      
      if (options.onProgress) {
        options.onProgress(Math.round(((i + 1) / totalPages) * 100));
      }
    });
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  async imagesToPdf(images, options = {}) {
    await this.init();
    const { PDFDocument } = this.PDFLib;
    
    const pdfDoc = await PDFDocument.create();
    const pageSize = options.pageSize || 'A4';
    const orientation = options.orientation || 'portrait';
    const margin = parseInt(options.margin) || 10;
    const quality = parseInt(options.quality) || 90;
    
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
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const bitmap = await createImageBitmap(image);
      
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, bitmap.width, bitmap.height);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      
      const jpegBlob = await new Promise(resolve => 
        canvas.convertToBlob({ type: 'image/jpeg', quality: quality / 100 }, resolve)
      );
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
      
      if (options.onProgress) {
        options.onProgress(Math.round(((i + 1) / images.length) * 100));
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  async pdfToImages(file, options = {}) {
    await this.init();
    await this.loadPdfJs();
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await this.PDFJS.getDocument({ data: arrayBuffer }).promise;
    const numPages = Math.min(pdf.numPages, 50);
    
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
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      
      let blob;
      if (outputFormat === 'png') {
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      } else {
        blob = await new Promise(resolve => 
          canvas.toBlob(resolve, 'image/jpeg', quality / 100)
        );
      }
      
      results.push(blob);
      
      if (options.onProgress) {
        options.onProgress(Math.round((i / numPages) * 100));
      }
    }
    
    return results;
  }

  async pdfToWord(file, options = {}) {
    await this.init();
    await this.loadPdfJs();
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await this.PDFJS.getDocument({ data: arrayBuffer }).promise;
    const numPages = Math.min(pdf.numPages, 50);
    
    let fullText = '';
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      
      if (pageText.trim()) {
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      
      if (options.onProgress) {
        options.onProgress(Math.round((i / numPages) * 100));
      }
    }
    
    // Create a simple DOCX-like structure (RTF format for Word compatibility)
    const rtfContent = `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Arial;}}\n\\f0\\fs24 ${this.escapeRtf(fullText)}}`;
    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    return blob;
  }

  parsePageRange(rangeStr, total) {
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

  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  dataUrlToBlob(dataUrl) {
    return new Promise(resolve => {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)[1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      resolve(new Blob([u8arr], { type: mime }));
    });
  }

  escapeRtf(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\n/g, '\\par\n');
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.PDFEngine = PDFEngine;
}
