// import express from 'express';
// import cors from 'cors';
// import { generatePDF } from './src/utils/fun.js';
// import path from 'path';

// const app = express();

// // Middleware
// app.use(cors({ origin: '*' }));
// app.use(express.json());
// app.use(express.static(path.join(process.cwd(), './')));

// // Logger Middleware
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

// // Add X-Response-Time header
// // app.use((req, res, next) => {
// //   const start = Date.now();
// //   res.on('finish', () => {
// //     const ms = Date.now() - start;
// //     res.setHeader('X-Response-Time', `${ms}ms`);
// //   });
// //   next();
// // });

// // Home Route
// app.get('/', (req, res) => {
//   res.send('Hello Express!');
// });

//  // PDF Generation Route
// app.post('/pdf', async (req, res) => {
//   try {
//     const { client, date, tableData, total } = req.body;

//     const pdfBytes = await generatePDF(client, date, tableData, total);

//     // Set the response headers to send the PDF as a download
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=generated_invoice.pdf');
//     res.send(pdfBytes);
//   } catch (error) {
//     console.error('Error in PDF generation:', error);
//     res.status(500).send('Error generating PDF');
//   }
// });

// // Custom 404 Handler
// app.use((req, res) => {
//   res.status(404).send('404 Not Found');
// });

// // Start Server
// const PORT = process.env.PORT || 3994;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





import express from "express";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { rgb } from "pdf-lib";

// Setup __dirname for ES module


const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

// const generateInvoiceId = () => {
//   const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
//   const randomPart = Math.floor(1000 + Math.random() * 9000);
//   return `INV-${datePart}-${randomPart}`;
// };

const generateInvoiceId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `INV-${datePart}`;
};

async function generatePDF(
  client,
  date,
  tableData,
  duedate,
  paidAmount,
  saleAgent,
  total,
  gst
) {
  try {
    const templatePath = path.join(__dirname, "pdf", "bill-02.pdf");
    console.log("Template Path:", templatePath);

    const templatePdfBytes = fs.readFileSync(templatePath);
    console.log("PDF Loaded:", templatePdfBytes.length);

    const pdfDoc = await PDFDocument.load(templatePdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    // const pdfDoc = await PDFDocument.create();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    console.log("Page Dimensions:", width, height);

    // Generate and draw Invoice ID
    const invoiceId = generateInvoiceId();
    page.drawText(` ${invoiceId}`, {
      x: 505,
      y: height - 196,
      font,
      size: 10,
    });
    page.drawText(`  ${client}`, {
      x: 456,
      y: height - 168,
      font: boldFont,
      size: 14,
    });

    // Static Text for Debugging
    page.drawText(`  ${saleAgent}`, {
      x: 504,
      y: height - 220,
      font,
      size: 10,
    });
    page.drawText(` ${date}`, { x: 505, y: height - 184, font, size: 10 });
    page.drawText(` ${duedate}`, { x: 505, y: height - 209, font, size: 10 });

    page.drawText(` ${gst}`, { x: 440, y: height - 300, font, size: 12 });

    // Draw Items
    // let yPosition = height - 300;
    // tableData.forEach((item, index) => {
    //   page.drawText(`${index + 1}  ${item.item}   ${item.quantity}`, {
    //     x: 50,
    //     y: yPosition,
    //     font,
    //     size: 12,
    //   });
    //   yPosition -= 20;
    // });

    const amountDue = parseFloat(total) - parseFloat(paidAmount);

    let yPosition = height - 300;

    tableData.forEach((item, index) => {
      page.drawText(`${index + 1}`, {
        x: 50, // Sl. No position
        y: yPosition,
        font,
        size: 14,
      });

      page.drawText(`${item.item}`, {
        x: 100, // Item position
        y: yPosition,
        font,
        size: 14,
      });

      page.drawText(`${item.quantity}`, {
        x: 310, // Quantity position

        y: yPosition,
        font,

        size: 14,
      });

      page.drawText(`${item.price}`, {
        x: 350, // Rate position
        y: yPosition,
        font,
        size: 14,
      });

      page.drawText(`${item.price}`, {
        x: 500, // Rate position
        y: yPosition,
        font,
        size: 14,
      });

      yPosition -= 20; // Move to the next line
    });

    // let yPositiontotal = height;

    page.drawText(` ${total}`, { x: 460, y: height - 575, font, size: 14 });

    page.drawText(` ${total}`, {
      x: 460,
      y: height - 602,
      font,
      size: 14,
      color: rgb(1, 1, 1),
    });
    page.drawText(`${amountDue}`, {
      x: 462,
      y: height - 622,
      font,
      size: 14,
      color: rgb(1, 1, 1), // Blue color for emphasis
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

app.post("/pdf", async (req, res) => {
  try {
    const {
      client,
      date,
      tableData,
      total,
      duedate,
      paidAmount,
      saleAgent,
      gst,
    } = req.body;

    if (
      !client ||
      !date ||
      !Array.isArray(tableData) ||
      typeof total !== "string"
    ) {
      return res.status(400).send("Invalid input data");
    }

    const pdfBytes = await generatePDF(
      client,
      date,
      tableData,
      duedate,
      paidAmount,
      saleAgent,
      total,
      gst
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");
    res.end(pdfBytes);
  } catch (error) {
    res.status(500).send("Error generating PDF");
  }
});

const PORT =  5663;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));