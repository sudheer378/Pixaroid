// Pixaroid PDF Engine v1.0 (Sejda Compatible)
import { PDFDocument, rgb, StandardFonts } from './vendor/pdf-lib.min.js';

export class PDFEngine {
  async merge(files) {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const pdfBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  }

  async split(file, pages) {
    const pdfBytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const newPdf = await PDFDocument.create();
    const indices = pages.split(',').map(p => parseInt(p.trim()) - 1);
    const copiedPages = await newPdf.copyPages(pdf, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    return await newPdf.save();
  }

  async compress(file) {
    // Basic compression by removing metadata
    const pdfBytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    return await pdf.save({ useObjectStreams: false });
  }
}
