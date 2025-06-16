const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const downloadsDir = path.join(__dirname, '..', 'downloads');
const templatePath = path.join(__dirname, '..', 'views', 'template.html');

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

function getNextFilename() {
  const files = fs.readdirSync(downloadsDir)
    .filter(file => file.startsWith('p') && file.endsWith('.pdf'));
  const nums = files.map(file => parseInt(file.slice(1, -4))).filter(num => !isNaN(num));
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `p${nextNum}.pdf`;
}

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
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    const filename = getNextFilename();
    const filePath = path.join(downloadsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    res.json({ message: 'PDF generated successfully', filename });
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
