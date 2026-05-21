// Pixaroid PDF Engine v2.0 - Sejda Compatible
import { PDFDocument, rgb, degrees } from './vendor/pdf-lib.min.js';

export class PDFEngine {
  constructor() {
    this.docs = [];
    this.outputDoc = null;
  }

  async loadFiles(files) {
    this.docs = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(arrayBuffer);
      this.docs.push(doc);
    }
    return this.docs.length;
  }

  async merge() {
    if (this.docs.length === 0) throw new Error('No files loaded');
    this.outputDoc = await PDFDocument.create();
    for (const doc of this.docs) {
      const copiedPages = await this.outputDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => this.outputDoc.addPage(page));
    }
    return this.save('merged.pdf');
  }

  async split() {
    if (this.docs.length === 0) throw new Error('No files loaded');
    const results = [];
    for (let i = 0; i < this.docs.length; i++) {
      const doc = this.docs[i];
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => newDoc.addPage(p));
      results.push(await newDoc.save());
    }
    return results;
  }

  async rotate(degreesAngle) {
    if (this.docs.length === 0) throw new Error('No files loaded');
    this.outputDoc = await PDFDocument.create();
    for (const doc of this.docs) {
      const pages = await this.outputDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => page.setRotation(degrees(page.getRotation().angle + degreesAngle)));
      pages.forEach(page => this.outputDoc.addPage(page));
    }
    return this.save('rotated.pdf');
  }

  async compress() {
    // Basic compression by removing metadata and re-saving
    if (this.docs.length === 0) throw new Error('No files loaded');
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
    a.click();
    URL.revokeObjectURL(url);
    return blob;
  }
}
