const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const templatePath = path.join(__dirname, '..', 'views', 'template.html');

// Load and compile handlebars template
function compileTemplate(data) {
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);
  return template(data);
}

exports.generatePdf = async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Render HTML via handlebars template
    const finalHtml = compileTemplate({ html });

    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    // ✅ Send PDF as response buffer
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"'
    });
    res.send(pdfBuffer);

  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
