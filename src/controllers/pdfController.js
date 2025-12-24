// controllers/pdfController.js
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
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
 * Check if a file exists and is executable
 */
function isExecutable(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    // Check if it's a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return false;
    }
    // On Unix-like systems, check if executable
    // On Windows, if file exists, assume it's executable
    if (process.platform === 'win32') {
      return true;
    }
    // Check read permission (basic check)
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Chrome/Chromium executable path based on OS
 * Auto-detects Chrome installation or uses bundled Chromium
 * Works on: macOS, Linux (Ubuntu/Debian/Alpine), Windows, Docker
 * 
 * Strategy:
 * - Docker: Always try to use system Chromium (required)
 * - Production Linux: Try system Chrome, fallback to bundled
 * - Local macOS/Windows: Prefer bundled Puppeteer (more reliable)
 */
function getChromeExecutablePath() {
  const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalDev = !isDocker && !isProduction;
  
  // Allow override via environment variable - BUT VALIDATE IT EXISTS AND IS EXECUTABLE
  // CRITICAL: If env var is set but invalid, we MUST return undefined to use bundled Puppeteer
  if (process.env.CHROME_EXECUTABLE_PATH) {
    const envPath = process.env.CHROME_EXECUTABLE_PATH;
    if (isExecutable(envPath)) {
      logger.info('Using Chrome from CHROME_EXECUTABLE_PATH', { path: envPath });
      return envPath;
    }
    // Env var set but path doesn't exist or isn't executable - IGNORE IT and use bundled
    logger.warn('CHROME_EXECUTABLE_PATH set but path is invalid - will use bundled Puppeteer Chromium', { 
      configuredPath: envPath,
      exists: fs.existsSync(envPath),
      note: 'Invalid CHROME_EXECUTABLE_PATH ignored to prevent launch failures'
    });
    // Return undefined to force bundled Puppeteer usage
    return undefined;
  }

  // For local development (macOS/Windows), prefer bundled Puppeteer for reliability
  if (isLocalDev) {
    logger.info('Local development detected - will use bundled Puppeteer Chromium for better compatibility', {
      platform: process.platform
    });
    return undefined;
  }

  // Build path list based on environment
  const commonPaths = [];
  
  if (isDocker) {
    // Docker/Alpine Linux paths (most likely)
    commonPaths.push(
      '/usr/bin/chromium-browser', // Alpine symlink
      '/usr/bin/chromium', // Alpine direct
      '/usr/bin/chrome', // Alternative
      '/usr/bin/google-chrome-stable' // Debian/Ubuntu in Docker
    );
  } else {
    // Non-Docker production environments - try OS-specific paths
    if (process.platform === 'darwin') {
      // macOS (production)
      commonPaths.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      );
    } else if (process.platform === 'linux') {
      // Linux (Ubuntu/Debian/etc) - production server
      commonPaths.push(
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/chrome',
        '/snap/bin/chromium', // Snap package
        '/opt/google/chrome/chrome' // Alternative location
      );
    } else if (process.platform === 'win32') {
      // Windows (production)
      commonPaths.push(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
      );
    }
  }

  // Check if any common path exists and is executable
  for (const chromePath of commonPaths) {
    // Double-check: path must exist AND be executable
    if (fs.existsSync(chromePath) && isExecutable(chromePath)) {
      logger.info('Auto-detected Chrome/Chromium', { path: chromePath, isDocker, isProduction });
      return chromePath;
    }
  }

  // No system Chrome found - will use bundled Puppeteer Chromium
  logger.info('No system Chrome/Chromium found, will use bundled Puppeteer Chromium', { 
    isDocker,
    isProduction,
    platform: process.platform,
    checkedPaths: commonPaths.length
  });
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
    // Detect if running in Docker
    const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
    
    // Launch browser with proper configuration
    const chromeExecutablePath = getChromeExecutablePath();
    
    // Determine if we should use system Chrome or bundled Puppeteer
    const useSystemChrome = !!chromeExecutablePath;
    
    // Log the decision for debugging
    logger.info('Chrome path detection result', {
      chromeExecutablePath: chromeExecutablePath || 'none (using bundled)',
      useSystemChrome,
      isDocker,
      envPath: process.env.CHROME_EXECUTABLE_PATH || 'not set'
    });
    
    // Core args required for both environments (Puppeteer 24.x compatible)
    const coreArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Critical: use /tmp instead of /dev/shm
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-zygote', // Critical for Docker stability
    ];
    
    // Additional args for Docker/production environment
    const dockerArgs = isDocker ? [
      '--single-process', // Critical: prevents "Target closed" errors in Docker
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--disable-translate',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-web-security',
      '--font-render-hinting=none',
    ] : [];
    
    const launchOptions = {
      // Puppeteer 24.x: Use 'new' headless mode for better compatibility
      headless: 'new',
      args: [...coreArgs, ...dockerArgs],
      timeout: isDocker ? 120000 : 60000,
      protocolTimeout: isDocker ? 180000 : 120000,
      // Critical: Use WebSocket instead of pipe for Docker stability
      pipe: false,
      // Dump IO for debugging if needed
      dumpio: process.env.PUPPETEER_DEBUG === 'true',
    };

    // Choose Puppeteer instance:
    // - If system Chrome found: use puppeteer-core (lighter, uses system Chrome)
    // - If no system Chrome: use puppeteer (includes bundled Chromium)
    // Note: In Docker, system Chromium is installed, so we use puppeteer-core
    // On Ubuntu server without Chrome, we fall back to bundled Puppeteer Chromium
    let puppeteerInstance;
    if (useSystemChrome) {
      launchOptions.executablePath = chromeExecutablePath;
      puppeteerInstance = puppeteerCore;
      logger.info('Using puppeteer-core with system Chrome/Chromium', { 
        path: chromeExecutablePath,
        isDocker 
      });
    } else {
      // Use bundled Puppeteer Chromium (will download if not present and not skipped)
      puppeteerInstance = puppeteer;
      const skipDownload = process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true';
      logger.info('Using bundled Puppeteer Chromium', { 
        skipDownload,
        note: skipDownload ? 'Chromium download skipped - ensure system Chrome is available' : 'Will use bundled Chromium'
      });
    }

    logger.info('Launching browser for PDF generation', {
      executablePath: chromeExecutablePath || 'bundled Chromium',
      userId: req.user?.id,
      isDocker,
      useSystemChrome,
      headless: launchOptions.headless,
      argsCount: launchOptions.args.length,
    });

    // Launch browser with retry logic and automatic fallback to bundled Chromium
    const maxRetries = isDocker ? 3 : 2;
    let retries = maxRetries;
    let lastError = null;
    let triedBundledFallback = false;
    
    while (retries > 0) {
      try {
        browser = await puppeteerInstance.launch(launchOptions);
        logger.info('Browser launched successfully');
        
        // Create page with error handling
        page = await browser.newPage();
        
        // Set default timeout for page operations
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);
        
        // Handle page crashes gracefully
        page.on('error', (err) => {
          logger.error('Page crashed', { error: err.message });
        });
        
        // Verify page is responsive
        await page.evaluate(() => true);
        
        logger.info('Browser and page ready for PDF generation');
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        const errorMessage = error.message || '';
        const errorString = errorMessage.toLowerCase();
        
        // Detect browser not found errors - be more lenient with pattern matching
        const isBrowserNotFound = 
          (errorString.includes('browser') && 
           (errorString.includes('not found') || 
            errorString.includes('no executable') ||
            errorString.includes('executable was not found') ||
            errorString.includes('tried to find'))) ||
          errorString.includes('executable doesn\'t exist') ||
          errorString.includes('cannot find') ||
          (errorString.includes('chrome') && errorString.includes('not found'));
        
        // If system Chrome fails and we haven't tried bundled yet, fallback to bundled Puppeteer
        if (useSystemChrome && isBrowserNotFound && !triedBundledFallback) {
          logger.warn('System Chrome not found, falling back to bundled Puppeteer Chromium', {
            attemptedPath: chromeExecutablePath,
            error: errorMessage,
            isDocker
          });
          
          // Switch to bundled Puppeteer
          puppeteerInstance = puppeteer;
          delete launchOptions.executablePath; // Remove executablePath for bundled version
          triedBundledFallback = true;
          retries = maxRetries; // Reset retries for bundled attempt
          logger.info('Retrying with bundled Puppeteer Chromium...');
          continue; // Retry immediately with bundled version
        }
        
        retries--;
        logger.warn(`Browser launch attempt failed, retries left: ${retries}`, { 
          error: errorMessage,
          useSystemChrome,
          triedBundledFallback,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        
        // Cleanup failed browser instance
        if (browser) {
          try {
            await browser.close().catch(() => {});
          } catch {
            // Force kill if close fails
            try {
              browser.process()?.kill('SIGKILL');
            } catch {
              // Ignore kill errors
            }
          }
          browser = null;
          page = null;
        }
        
        if (retries === 0) {
          throw new Error(`Failed to launch browser after ${maxRetries} attempt(s): ${lastError.message}`);
        }
        
        // Wait before retry with exponential backoff
        const waitTime = (maxRetries - retries) * 1000;
        await new Promise(resolve => global.setTimeout(resolve, waitTime));
      }
    }

    // Compile template with HTML content
    const finalHtml = compileTemplate({ html });

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

    // Set content with timeout and error handling
    // Use 'load' instead of 'networkidle0' for more reliability in Docker
    try {
      await page.setContent(finalHtml, {
        waitUntil: 'load',
        timeout: 30000,
      });
      
      // Wait a bit for any dynamic content to render
      await new Promise(resolve => global.setTimeout(resolve, 1000));
    } catch (contentError) {
      logger.warn('Error setting page content, retrying with simpler wait condition', { 
        error: contentError.message 
      });
      // Retry with simpler wait condition
      await page.setContent(finalHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await new Promise(resolve => global.setTimeout(resolve, 1000));
    }

    // Emulate screen media type for better rendering
    await page.emulateMediaType('screen');

    // Generate PDF with error handling
    logger.info('Generating PDF', { userId: req.user?.id, filename: pdfFilename });

    let pdfBuffer;
    try {
      pdfBuffer = await page.pdf({
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
        timeout: 30000,
      });
    } catch (pdfError) {
      // If PDF generation fails, try with simpler options
      logger.warn('PDF generation failed with standard options, retrying with simplified options', {
        error: pdfError.message
      });
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        timeout: 30000,
      });
    }

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
