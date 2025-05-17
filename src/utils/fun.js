import { PageSizes, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';

// Function to generate a pseudo UUID
function generatePseudoUUID() {
    const chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return chars.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// Function to generate a customer ID
function generateCustomerID() {
    const timestamp = Date.now().toString(36).toUpperCase(); // Convert timestamp to a base-36 string
    const randomNum = Math.random().toString(36).substring(2, 10).toUpperCase(); // Generate a random base-36 string
    return `CUST-${timestamp}-${randomNum}`;
}

export const pdfPath = new Map();
pdfPath.set("DM", "mentoconcepts.pdf");
pdfPath.set("SD", "mentoconcepts.pdf");

const fileName = pdfPath.get("DM"); // This will return "mentoconcepts.pdf"

// Function to wrap text within a specified width
function wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = font.widthOfTextAtSize(currentLine + ' ' + word, fontSize);
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}


function drawTableHeaders(page, config, startY) {
    const { headerPositions, headers, rowHeight } = config.table;
    const headerY = startY;
  
    headers.forEach((header, i) => {
        page.drawText(header, {
            x: headerPositions[i] + 5,
            y: headerY - 5,
            size: 12,
            font: config.fonts.bold,
            color: config.colors.text,
        });
    });
  
    return headerY;
}
function drawTableBorders(page, config, startY, rowCount) {
    const { width, rowHeight, headerPositions } = config.table;
    const tableStartX = (page.getWidth() - width) / 2;
    const tableBottomY = startY - (rowHeight * (rowCount + 1)) - rowHeight / 2;

    // Draw horizontal lines (top and bottom)
    [startY + rowHeight / 2, tableBottomY].forEach((y) => {
        page.drawLine({
            start: { x: tableStartX, y },
            end: { x: tableStartX + width, y },
            thickness: 1,
            color: config.colors.text,
        });
    });

    // Draw vertical lines
    [...headerPositions, tableStartX + width].forEach((x) => {
        page.drawLine({
            start: { x, y: startY + rowHeight / 2 },
            end: { x, y: tableBottomY },
            thickness: 1,
            color: config.colors.text,
        });
    });
}


// Function to add date and customer company name to the PDF
export async function addFrontOfPDF(date, customerCompanyName, pname) {
    try {
        // Load the original PDF
        const filePath = `./pdf/${pdfPath.get(pname)}`; // Adjust the path as necessary
        console.log(`Loading PDF from: ${filePath}`);

        // Read the file buffer
        const existingPdfBytes = fs.readFileSync(filePath);

        // Load the PDF document
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // Embed the Helvetica font
        const helveticaFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Get the first page of the document
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Define the positions where the text will be added
        const datePosition = { x: 320, y: 263 }; // Adjust the coordinates as necessary
        const customerPosition = { x: 320, y: 230 }; // Adjust the coordinates as necessary
        const maxWidth = 150; // Maximum width for the text to wrap

        // Add the date
        firstPage.drawText(date, {
            x: datePosition.x,
            y: datePosition.y,
            size: 19,
            font: helveticaFontBold,
            color: rgb(0, 0, 0),
        });

        // Wrap and add the customer company name
        const fontSize = 19;
        const lines = wrapText(customerCompanyName, maxWidth, helveticaFontBold, fontSize);
        let yOffset = 0;
        lines.forEach((line, index) => {
            firstPage.drawText(line, {
                x: customerPosition.x,
                y: customerPosition.y - yOffset,
                size: fontSize,
                font: helveticaFontBold,
                color: rgb(0, 0, 0),
            });
            yOffset += fontSize + 4; // Adjust the line height as necessary
        });

        // Serialize the PDFDocument to bytes (a Uint8Array)
        const pdfBytes = await pdfDoc.save();

        console.log('PDF modified and saved successfully!');
        return pdfBytes;

    } catch (error) {
        console.log({ error });
        return { OK: false };
    }
}

export async function createMonthlyPackagePDF(tableData, total, title, showQuantity = true) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage(PageSizes.A4);

        // Initialize configuration
        const config = {
            fonts: {
                regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
                bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
            },
            colors: {
                title: rgb(0.6, 0.1, 0.6),
                text: rgb(0, 0, 0),
            },
            table: {
                width: 455,
                rowHeight: 25,
                headers: showQuantity
                    ? ['SI NO', 'ACTIVITIES INCLUDED', 'QTT', 'PLAN']
                    : ['SI NO', 'ACTIVITIES INCLUDED', 'PLAN'],
                headerPositions: [],
            },
        };

        // Calculate table positions dynamically
        const tableStartX = (page.getWidth() - config.table.width) / 2;
        config.table.headerPositions = showQuantity
            ? [tableStartX, tableStartX + 50, tableStartX + 350, tableStartX + 400]
            : [tableStartX, tableStartX + 50, tableStartX + 400];

        // Draw title
        const titleFontSize = 24;
        const titleWidth = config.fonts.bold.widthOfTextAtSize(title, titleFontSize);
        page.drawText(title, {
            x: (page.getWidth() - titleWidth) / 2,
            y: 680,
            size: titleFontSize,
            font: config.fonts.bold,
            color: config.colors.title,
        });

        // Draw table headers and borders
        const headerY = drawTableHeaders(page, config, 640);
        drawTableBorders(page, config, headerY, tableData.length);

        // Draw table data
        let yPosition = headerY - config.table.rowHeight;
        tableData.forEach((row) => {
            const columns = showQuantity
                ? [
                    { text: row.no, x: config.table.headerPositions[0] },
                    { text: row.activity, x: config.table.headerPositions[1] },
                    { text: row.quantity || '', x: config.table.headerPositions[2] },
                    { text: row.plan, x: config.table.headerPositions[3] },
                ]
                : [
                    { text: row.no, x: config.table.headerPositions[0] },
                    { text: row.activity, x: config.table.headerPositions[1] },
                    { text: row.plan, x: config.table.headerPositions[2] },
                ];

            columns.forEach(({ text, x }) => {
                page.drawText(String(text), {
                    x: x + 5,
                    y: yPosition - 5,
                    size: 12,
                    font: config.fonts.regular,
                    color: config.colors.text,
                });
            });

            yPosition -= config.table.rowHeight;
        });

        // Draw total
        page.drawText('TOTAL', {
            x: config.table.headerPositions[0] + 5,
            y: yPosition - 5,
            size: 12,
            font: config.fonts.bold,
            color: config.colors.text,
        });
        page.drawText(total, {
            x: showQuantity
                ? config.table.headerPositions[3] + 5
                : config.table.headerPositions[2] + 5,
            y: yPosition - 5,
            size: 12,
            font: config.fonts.bold,
            color: config.colors.text,
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error creating PDF:', error);
        throw error;
    }
}
export async function replacePage(client, date, tableData, total, proposal) {
    try {
        console.log('Starting PDF manipulation...');
        
        // Load the original PDF
        const originalPdfBytesog = await addFrontOfPDF(date, client, proposal);
        console.log('Original PDF loaded');

        const originalPdfDoc = await PDFDocument.load(originalPdfBytesog);
        console.log('Original PDF document loaded');

        if (proposal === "DM") {
            const monthlyPlanPdfBytes = await createMonthlyPackagePDF(tableData, total, "Monthly Plan", true);
            const monthlyPlanPdfDoc = await PDFDocument.load(monthlyPlanPdfBytes);
            console.log('Monthly Plan PDF loaded');

            const threeMonthTotal = +total * 3;
            tableData.forEach((item) => item.quantity = item.quantity * 3);

            const threeMonthPlanPdfBytes = await createMonthlyPackagePDF(tableData, threeMonthTotal.toFixed(), "3 Month Plan", true);
            const threeMonthPlanPdfDoc = await PDFDocument.load(threeMonthPlanPdfBytes);
            console.log('3 Month Plan PDF loaded');

            const [monthlyNewPage] = await originalPdfDoc.copyPages(monthlyPlanPdfDoc, [0]);
            const [threeMonthNewPage] = await originalPdfDoc.copyPages(threeMonthPlanPdfDoc, [0]);

            originalPdfDoc.insertPage(2, monthlyNewPage);
            originalPdfDoc.removePage(3);
            originalPdfDoc.insertPage(3, threeMonthNewPage);
            originalPdfDoc.removePage(4);
        } else {
            const SDPlanPdfBytes = await createMonthlyPackagePDF(tableData, total, "Plan Overview", true);
            const SDPlanPdfDoc = await PDFDocument.load(SDPlanPdfBytes);
            console.log('Software Development Plan PDF loaded');

            const [SDPlanNewPage] = await originalPdfDoc.copyPages(SDPlanPdfDoc, [0]);

            originalPdfDoc.insertPage(2, SDPlanNewPage);
            originalPdfDoc.removePage(3);
        }

        // Serialize the modified PDFDocument to bytes
        const pdfBytes = await originalPdfDoc.save();
        console.log('Modified PDF saved');

        return pdfBytes;
    } catch (error) {
        console.error('Error in replacePage function:', error);
        throw new Error(`Failed to replace page in PDF: ${error}`);
    }
}
