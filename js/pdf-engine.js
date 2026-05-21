// Pixaroid PDF Engine (Sejda-style)
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

  async split(pdfFile, pages) {
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const newPdf = await PDFDocument.create();
    const pageIndices = pages.split(',').map(p => parseInt(p.trim()) - 1);
    const copiedPages = await newPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    return await newPdf.save();
  }

  async rotate(pdfFile, rotation) {
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = pdf.getPages();
    pages.forEach(page => page.setRotation(page.getRotation() + rotation));
    return await pdf.save();
  }

  async compress(pdfFile) {
    // Basic compression by removing metadata
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    return await pdf.save({ useObjectStreams: false });
  }
}
