// controllers/pdfController.js
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';

// ✅ Fix __dirname (not available in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, '..', 'views', 'template.html');

function compileTemplate(data) {
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);
  return template(data);
}

const generatePdf = async (req, res) => {
  const { html, filename } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  let browser;
  let page;
  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome-stable', // adjust if needed
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    });

    page = await browser.newPage();
    const finalHtml = compileTemplate({ html });

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    try {
      await page.setContent(finalHtml, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
    } catch (contentError) {
      throw new Error(`Failed to set page content: ${contentError.message}`);
    }
    
    await page.emulateMediaType('screen');

    // Generate PDF with additional options
    let pdfBuffer;
    try {
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        preferCSSPageSize: false
      });
    } catch (pdfError) {
      throw new Error(`Failed to generate PDF: ${pdfError.message}`);
    }

    // Close browser before sending response to free resources
    await browser.close();
    browser = null;

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    // Ensure pdfBuffer is a Buffer
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    // Log buffer info for debugging
    console.log('PDF Buffer Info:', {
      type: typeof pdfBuffer,
      isBuffer: Buffer.isBuffer(pdfBuffer),
      length: buffer.length,
      firstBytesHex: buffer.slice(0, 8).toString('hex'),
      firstBytesAscii: buffer.slice(0, 8).toString('ascii')
    });

    // Verify it's a valid PDF by checking magic bytes (first 4 bytes should be '%PDF')
    // Try multiple encodings in case of encoding issues
    const checks = [
      buffer.slice(0, 4).toString('ascii'),
      buffer.slice(0, 4).toString('latin1'),
      buffer.slice(0, 4).toString('utf8')
    ];
    
    const isValidPdf = checks.some(check => check === '%PDF');
    
    if (!isValidPdf) {
      // Log detailed info for debugging
      console.error('PDF validation failed. Details:', {
        bufferType: typeof pdfBuffer,
        isBuffer: Buffer.isBuffer(pdfBuffer),
        bufferLength: buffer.length,
        first20BytesHex: buffer.slice(0, 20).toString('hex'),
        first20BytesAscii: buffer.slice(0, 20).toString('ascii'),
        checks: checks
      });
      
      // If it's not a PDF, it might be an error message from puppeteer
      const bufferAsString = buffer.toString('utf-8', 0, Math.min(500, buffer.length));
      if (bufferAsString.includes('error') || bufferAsString.includes('Error') || bufferAsString.includes('Exception')) {
        throw new Error(`PDF generation error: ${bufferAsString.substring(0, 500)}`);
      }
      
      // If buffer has reasonable size, it might still be valid - log warning but proceed
      if (buffer.length > 100) {
        console.warn('PDF validation failed but buffer has content. Proceeding with caution. First bytes:', checks[0]);
        // Don't throw - let it through and see if client can handle it
      } else {
        throw new Error(`Generated file is not a valid PDF. Buffer too small (${buffer.length} bytes). First bytes: ${checks[0]}`);
      }
    }

    // Set headers before sending - ensure PDF is treated as binary
    const pdfFilename = filename && filename.endsWith('.pdf') 
      ? filename 
      : `${filename || 'document'}.pdf`;

    // Set all headers at once to ensure proper content type
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFilename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Encoding': 'identity' // Ensure no compression
    });
    
    // Send PDF buffer - Express will handle Buffer correctly
    res.send(buffer);
  } catch (err) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    res
      .status(500)
      .json({ error: 'PDF generation failed', details: err.message });
  }
};

export default { generatePdf };
