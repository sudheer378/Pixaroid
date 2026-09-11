// Pixaroid PDF Engine v2.1 - browser-safe vendor loading
let pdfLibPromise;

async function getPDFLib() {
  if (globalThis.PDFLib?.PDFDocument) return globalThis.PDFLib;
  if (!pdfLibPromise) {
    pdfLibPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-pixaroid-pdf-lib]');
      if (existing) {
        existing.addEventListener('load', () => resolve(globalThis.PDFLib), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load local PDF library')), { once: true });
        if (globalThis.PDFLib?.PDFDocument) resolve(globalThis.PDFLib);
        return;
      }
      const script = document.createElement('script');
      script.src = '/js/vendor/pdf-lib.min.js';
      script.async = true;
      script.dataset.pixaroidPdfLib = 'true';
      script.onload = () => globalThis.PDFLib?.PDFDocument
        ? resolve(globalThis.PDFLib)
        : reject(new Error('Local PDF library loaded without PDFLib'));
      script.onerror = () => reject(new Error('Unable to load local PDF library'));
      document.head.appendChild(script);
    });
  }
  return pdfLibPromise;
}

export class PDFEngine {
  constructor() {
    this.docs = [];
    this.outputDoc = null;
  }

  async loadFiles(files) {
    const { PDFDocument } = await getPDFLib();
    this.docs = [];
    for (const file of files) {
      if (!file?.arrayBuffer) throw new TypeError('Invalid PDF file');
      this.docs.push(await PDFDocument.load(await file.arrayBuffer()));
    }
    return this.docs.length;
  }

  async merge() {
    const { PDFDocument } = await getPDFLib();
    if (!this.docs.length) throw new Error('No files loaded');
    this.outputDoc = await PDFDocument.create();
    for (const doc of this.docs) {
      const pages = await this.outputDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => this.outputDoc.addPage(page));
    }
    return this.save('merged.pdf');
  }

  async split() {
    const { PDFDocument } = await getPDFLib();
    if (!this.docs.length) throw new Error('No files loaded');
    const results = [];
    for (const doc of this.docs) {
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => newDoc.addPage(page));
      results.push(await newDoc.save());
    }
    return results;
  }

  async rotate(degreesAngle) {
    const { PDFDocument, degrees } = await getPDFLib();
    if (!this.docs.length) throw new Error('No files loaded');
    this.outputDoc = await PDFDocument.create();
    for (const doc of this.docs) {
      const pages = await this.outputDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => page.setRotation(degrees(page.getRotation().angle + degreesAngle)));
      pages.forEach(page => this.outputDoc.addPage(page));
    }
    return this.save('rotated.pdf');
  }

  async compress() {
    const { PDFDocument } = await getPDFLib();
    if (!this.docs.length) throw new Error('No files loaded');
    this.outputDoc = await PDFDocument.create();
    for (const doc of this.docs) {
      const pages = await this.outputDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => this.outputDoc.addPage(page));
    }
    return this.save('compressed.pdf', { useObjectStreams: false });
  }

  async save(filename, options = {}) {
    if (!this.outputDoc) throw new Error('No document to save');
    const bytes = await this.outputDoc.save(options);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return blob;
  }
}
