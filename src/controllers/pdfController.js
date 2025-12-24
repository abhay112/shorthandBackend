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

/**
 * Get Chrome/Chromium executable path
 * Tries common paths, falls back to Puppeteer's bundled Chromium
 */
function getChromeExecutablePath() {
  // Allow override via environment variable (useful for Docker/production)
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  // Common Chrome/Chromium paths for different platforms
  const chromePaths = [
    '/usr/bin/google-chrome-stable',      // Linux (Debian/Ubuntu)
    '/usr/bin/chromium-browser',          // Linux (Chromium)
    '/usr/bin/chromium',                  // Linux (Chromium alternative)
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',   // Windows
  ];

  // Check if any path exists
  for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Return undefined to use Puppeteer's bundled Chromium
  return undefined;
}

function compileTemplate(data) {
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);
  return template(data);
}

const generatePdf = async (req, res) => {
  const { html, filename, studentName } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  // Determine filename - prioritize filename, fallback to studentName, then default
  const pdfFilename = filename || studentName || 'document';
  const safeFilename = pdfFilename.endsWith('.pdf') ? pdfFilename : `${pdfFilename}.pdf`;

  let browser;
  try {
    // Get Chrome path or use bundled Chromium
    const chromeExecutablePath = getChromeExecutablePath();
    
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };

    // Only set executablePath if we found Chrome, otherwise use bundled Chromium
    if (chromeExecutablePath) {
      launchOptions.executablePath = chromeExecutablePath;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    const finalHtml = compileTemplate({ html });

    await page.setContent(finalHtml, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    // Close browser before sending response
    await browser.close();
    browser = null;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': pdfBuffer.length,
      'Content-Encoding': 'identity', // Ensure no compression
    });
    res.send(pdfBuffer);
  } catch (err) {
    // Ensure browser is closed on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        // Ignore close errors
      }
    }
    res
      .status(500)
      .json({ error: 'PDF generation failed', details: err.message });
  }
};

export default { generatePdf };
