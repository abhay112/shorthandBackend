// controllers/pdfController.js
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

// ✅ Fix __dirname (not available in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, '..', 'views', 'template.html');

/**
 * Get Chrome/Chromium executable path based on OS
 * Auto-detects Chrome installation or uses bundled Chromium
 */
function getChromeExecutablePath() {
  // Allow override via environment variable
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  // For production/Docker, try common paths (Alpine Linux first for Docker)
  const commonPaths = [
    '/usr/bin/chromium-browser', // Alpine Linux (Docker)
    '/usr/bin/chromium', // Alpine Linux alternative
    '/usr/bin/google-chrome-stable', // Debian/Ubuntu
    '/usr/bin/chromium-browser', // Debian/Ubuntu alternative
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows 32-bit
  ];

  // Check if any common path exists
  for (const chromePath of commonPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Return undefined to let Puppeteer use bundled Chromium
  return undefined;
}

/**
 * Compile Handlebars template with error handling
 */
function compileTemplate(data) {
  try {
    if (!fs.existsSync(templatePath)) {
      throw new AppError('PDF template file not found', 500);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);
    return template(data);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to compile PDF template: ${error.message}`, 500);
  }
}

/**
 * Validate PDF buffer by checking magic bytes
 */
function validatePdfBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new AppError('Generated PDF buffer is empty', 500);
  }

  // Ensure buffer is a Buffer
  const pdfBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // Check PDF magic bytes (first 4 bytes should be '%PDF')
  const magicBytes = pdfBuffer.slice(0, 4).toString('ascii');
  const isValidPdf = magicBytes === '%PDF';

  if (!isValidPdf) {
    // Check if buffer contains error message
    const bufferAsString = pdfBuffer.toString('utf-8', 0, Math.min(500, pdfBuffer.length));
    if (bufferAsString.includes('error') || bufferAsString.includes('Error') || bufferAsString.includes('Exception')) {
      throw new AppError(`PDF generation error: ${bufferAsString.substring(0, 200)}`, 500);
    }
    throw new AppError(`Generated file is not a valid PDF. Magic bytes: ${magicBytes}`, 500);
  }

  return pdfBuffer;
}

/**
 * Sanitize filename to prevent path traversal and invalid characters
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'document';
  }

  // Remove path separators and dangerous characters
  return filename
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100) // Limit length
    .trim();
}

/**
 * Generate PDF from HTML content
 * POST /api/v1/admin/pdf
 * Body: { html: string, filename?: string, studentName?: string }
 */
export const generatePdf = asyncHandler(async (req, res) => {
  const { html, filename, studentName } = req.body;

  // Input validation
  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    throw new AppError('HTML content is required and must be a non-empty string', 400);
  }

  // Determine filename - prioritize filename, fallback to studentName, then default
  const baseFilename = sanitizeFilename(filename || studentName || 'document');
  const pdfFilename = baseFilename.endsWith('.pdf') ? baseFilename : `${baseFilename}.pdf`;

  let browser = null;
  let page = null;

  try {
    // Launch browser with proper configuration
    const chromeExecutablePath = getChromeExecutablePath();
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--single-process', // Required for running in Docker
      ],
      timeout: 30000, // 30 seconds timeout for browser launch
    };

    // Always set executablePath if we found one (required for Docker/Alpine)
    if (chromeExecutablePath) {
      launchOptions.executablePath = chromeExecutablePath;
      logger.info('Using Chromium from system path', { path: chromeExecutablePath });
    } else {
      logger.warn('Chromium executable not found, Puppeteer will try to use bundled version');
    }

    logger.info('Launching browser for PDF generation', {
      executablePath: chromeExecutablePath || 'bundled Chromium',
      userId: req.user?.id,
    });

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    // Compile template with HTML content
    const finalHtml = compileTemplate({ html });

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

    // Set content with timeout and error handling
    await page.setContent(finalHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Emulate screen media type for better rendering
    await page.emulateMediaType('screen');

    // Generate PDF
    logger.info('Generating PDF', { userId: req.user?.id, filename: pdfFilename });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
    });

    // Close browser immediately to free resources
    await browser.close();
    browser = null;
    page = null;

    // Validate PDF buffer
    const validatedBuffer = validatePdfBuffer(pdfBuffer);

    logger.info('PDF generated successfully', {
      userId: req.user?.id,
      filename: pdfFilename,
      size: validatedBuffer.length,
    });

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFilename}"`,
      'Content-Length': validatedBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Encoding': 'identity', // Ensure no compression
    });

    // Send PDF buffer
    res.send(validatedBuffer);
  } catch (error) {
    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        logger.error('Error closing browser', { error: closeError.message });
      }
    }

    // Log error with context
    logger.error('PDF generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      filename: pdfFilename,
    });

    // Re-throw AppError as-is, wrap others
    if (error instanceof AppError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new AppError(
      `PDF generation failed: ${error.message || 'Unknown error'}`,
      500
    );
  }
});

export default { generatePdf };
