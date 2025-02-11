const express = require('express');
const multer = require('multer');
const { PdfReader, PdfWriter } = require('pdf-lib');
const XLSX = require('xlsx');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/process', upload.fields([{ name: 'pdf' }, { name: 'excel' }]), async (req, res) => {
  try {
    const pdfPath = req.files.pdf[0].path;
    const excelPath = req.files.excel[0].path;

    const excelData = readExcelData(excelPath);
    const outputPdfPath = await addTagloopToLabel(pdfPath, excelData);

    res.json({ log: `PDF processing completed successfully! Output saved as ${outputPdfPath}\n` });
  } catch (error) {
    res.status(500).json({ log: `Error: ${error.message}\n` });
  }
});

function readExcelData(filename) {
  const workbook = XLSX.readFile(filename);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  const data = {};
  rows.forEach((row) => {
    data[row['Invoice Number']] = {
      buyer_name: row['Buyer Name'],
      sku_code: row['SKU Code'],
      tagloop: row['TagLoop'],
      awb: row['AWB'],
    };
  });
  return data;
}

async function addTagloopToLabel(pdfPath, excelData) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PdfReader.load(pdfBytes);
  const pdfWriter = PdfWriter.create();

  for (let i = 0; i < pdfDoc.getPageCount(); i += 2) {
    const shippingPage = pdfDoc.getPage(i);
    const invoicePage = pdfDoc.getPage(i + 1);

    const invoiceText = await invoicePage.getTextContent();
    const shippingText = await shippingPage.getTextContent();

    for (const [invoiceNum, details] of Object.entries(excelData)) {
      if (invoiceText.includes(invoiceNum)) {
        const canvas = createCanvas(612, 792);
        const ctx = canvas.getContext('2d');
        ctx.font = '12px Helvetica-Bold';
        ctx.fillText(`TagLoop: ${details.tagloop}`, 158.5, 154);

        const img = canvas.toBuffer('image/png');
        const page = await PdfReader.createPage([612, 792]);
        page.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });

        shippingPage.drawPage(page);
        break;
      }
    }

    pdfWriter.addPage(shippingPage);
    pdfWriter.addPage(invoicePage);
  }

  const outputPdfPath = path.join(__dirname, 'output.pdf');
  const pdfBytesOut = await pdfWriter.save();
  fs.writeFileSync(outputPdfPath, pdfBytesOut);

  return outputPdfPath;
}

module.exports = app;