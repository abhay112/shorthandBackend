# 📧 Email Service Implementation Guide

## 🎯 Overview

This guide provides step-by-step instructions for implementing the Email Service microservice as outlined in Phase 1 of the project roadmap.

---

## 📋 Prerequisites

- Node.js 18+
- MongoDB instance
- Redis instance (for queues)
- Email provider account (SendGrid/SES/Resend)
- Docker (optional, for containerization)

---

## 🏗️ Step 1: Project Structure

Create a new directory for the email service:

```bash
mkdir email-service
cd email-service
npm init -y
```

### **Directory Structure**
```
email-service/
├── src/
│   ├── config/
│   │   ├── index.js          # Environment config
│   │   └── email.js           # Email provider config
│   ├── controllers/
│   │   └── emailController.js # Email endpoints
│   ├── models/
│   │   ├── EmailLog.js        # Email log schema
│   │   └── EmailTemplate.js   # Template schema
│   ├── services/
│   │   ├── emailService.js    # Core email logic
│   │   ├── templateService.js # Template rendering
│   │   └── trackingService.js # Open/click tracking
│   ├── queues/
│   │   └── emailQueue.js      # BullMQ queue setup
│   ├── workers/
│   │   └── emailWorker.js     # Queue worker
│   ├── routes/
│   │   └── emailRoutes.js     # Express routes
│   ├── middlewares/
│   │   ├── auth.js            # API key auth
│   │   └── errorHandler.js    # Error handling
│   ├── utils/
│   │   └── logger.js          # Winston logger
│   └── app.js                 # Express app
├── templates/
│   ├── welcome.hbs
│   ├── test-assignment.hbs
│   ├── test-reminder.hbs
│   ├── result-notification.hbs
│   └── admin-notification.hbs
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 📦 Step 2: Install Dependencies

```bash
npm install express mongoose dotenv winston winston-loki
npm install @sendgrid/mail nodemailer handlebars
npm install bullmq redis uuid
npm install cors helmet compression express-rate-limit
```

**package.json:**
```json
{
  "name": "email-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "worker": "node src/workers/emailWorker.js"
  },
  "dependencies": {
    "@sendgrid/mail": "^7.7.0",
    "bullmq": "^5.0.0",
    "compression": "^1.8.1",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.18.2",
    "express-rate-limit": "^8.1.0",
    "handlebars": "^4.7.8",
    "helmet": "^8.1.0",
    "mongoose": "^8.16.0",
    "redis": "^4.6.0",
    "uuid": "^13.0.0",
    "winston": "^3.17.0",
    "winston-loki": "^6.1.3"
  }
}
```

---

## ⚙️ Step 3: Configuration

### **src/config/index.js**
```javascript
import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shorthnd-email',
    options: {
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000
    }
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null
  },
  
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid', // sendgrid, ses, resend
    fromEmail: process.env.FROM_EMAIL || 'noreply@vikalpshorthand.com',
    fromName: process.env.FROM_NAME || 'Shorthand Platform',
    apiKey: process.env.EMAIL_API_KEY,
    trackingDomain: process.env.TRACKING_DOMAIN || 'track.vikalpshorthand.com'
  },
  
  api: {
    apiKey: process.env.API_KEY || 'your-secret-api-key'
  }
};
```

### **.env.example**
```env
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/shorthnd-email

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Provider (SendGrid)
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=noreply@vikalpshorthand.com
FROM_NAME=Shorthand Platform
TRACKING_DOMAIN=track.vikalpshorthand.com

# API Security
API_KEY=your-secret-api-key-here

# Loki (Optional)
LOKI_URL=http://loki:3100
ENABLE_LOKI_LOGS=true
```

---

## 🗄️ Step 4: Database Models

### **src/models/EmailLog.js**
```javascript
import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  emailId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  to: {
    type: String,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  template: {
    type: String,
    required: true
  },
  templateData: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'],
    default: 'pending',
    index: true
  },
  provider: {
    type: String,
    enum: ['sendgrid', 'ses', 'resend'],
    required: true
  },
  providerMessageId: {
    type: String,
    index: true
  },
  tracking: {
    openTrackingId: String,
    clickTrackingIds: [String],
    openedAt: Date,
    clickedAt: Date,
    clickCount: { type: Number, default: 0 }
  },
  bounce: {
    reason: String,
    bouncedAt: Date
  },
  error: {
    message: String,
    code: String,
    stack: String
  },
  metadata: {
    userId: mongoose.Schema.Types.ObjectId,
    batchId: mongoose.Schema.Types.ObjectId,
    testId: mongoose.Schema.Types.ObjectId,
    type: String // welcome, test_assignment, test_reminder, result, admin_action
  },
  sentAt: Date,
  deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

emailLogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes
emailLogSchema.index({ to: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ 'metadata.type': 1, createdAt: -1 });

export default mongoose.model('EmailLog', emailLogSchema);
```

### **src/models/EmailTemplate.js**
```javascript
import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlTemplate: {
    type: String,
    required: true
  },
  textTemplate: {
    type: String
  },
  variables: [String], // List of available variables
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

emailTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('EmailTemplate', emailTemplateSchema);
```

---

## 🔧 Step 5: Email Service Implementation

### **src/services/emailService.js**
```javascript
import sgMail from '@sendgrid/mail';
import EmailLog from '../models/EmailLog.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { renderTemplate } from './templateService.js';
import { addTracking } from './trackingService.js';

// Initialize SendGrid
if (config.email.apiKey) {
  sgMail.setApiKey(config.email.apiKey);
}

class EmailService {
  /**
   * Send email
   */
  static async sendEmail({
    to,
    template,
    templateData = {},
    subject,
    metadata = {}
  }) {
    const emailId = uuidv4();
    
    try {
      // Create email log
      const emailLog = new EmailLog({
        emailId,
        to,
        subject: subject || `Email from ${config.email.fromName}`,
        template,
        templateData,
        provider: config.email.provider,
        status: 'pending',
        metadata
      });
      
      await emailLog.save();
      
      // Render template
      const { html, text } = await renderTemplate(template, templateData);
      
      // Add tracking
      const { htmlWithTracking, openTrackingId, clickTrackingIds } = 
        addTracking(html, emailId);
      
      // Update email log with tracking IDs
      emailLog.tracking.openTrackingId = openTrackingId;
      emailLog.tracking.clickTrackingIds = clickTrackingIds;
      await emailLog.save();
      
      // Prepare email
      const msg = {
        to,
        from: {
          email: config.email.fromEmail,
          name: config.email.fromName
        },
        subject: emailLog.subject,
        html: htmlWithTracking,
        text: text,
        trackingSettings: {
          clickTracking: {
            enable: false // We handle this ourselves
          },
          openTracking: {
            enable: false // We handle this ourselves
          }
        }
      };
      
      // Send email
      const [response] = await sgMail.send(msg);
      
      // Update email log
      emailLog.status = 'sent';
      emailLog.providerMessageId = response.headers['x-message-id'];
      emailLog.sentAt = new Date();
      await emailLog.save();
      
      logger.info('Email sent successfully', {
        emailId,
        to,
        template,
        providerMessageId: emailLog.providerMessageId
      });
      
      return {
        success: true,
        emailId,
        messageId: emailLog.providerMessageId
      };
      
    } catch (error) {
      logger.error('Failed to send email', {
        emailId,
        to,
        template,
        error: error.message,
        stack: error.stack
      });
      
      // Update email log with error
      const emailLog = await EmailLog.findOne({ emailId });
      if (emailLog) {
        emailLog.status = 'failed';
        emailLog.error = {
          message: error.message,
          code: error.code,
          stack: error.stack
        };
        await emailLog.save();
      }
      
      throw error;
    }
  }
  
  /**
   * Track email open
   */
  static async trackOpen(emailId) {
    try {
      const emailLog = await EmailLog.findOne({ emailId });
      if (!emailLog) {
        logger.warn('Email log not found for open tracking', { emailId });
        return;
      }
      
      if (!emailLog.tracking.openedAt) {
        emailLog.status = 'opened';
        emailLog.tracking.openedAt = new Date();
        await emailLog.save();
        
        logger.info('Email opened', { emailId, to: emailLog.to });
      }
    } catch (error) {
      logger.error('Failed to track email open', { emailId, error: error.message });
    }
  }
  
  /**
   * Track email click
   */
  static async trackClick(emailId, linkIndex) {
    try {
      const emailLog = await EmailLog.findOne({ emailId });
      if (!emailLog) {
        logger.warn('Email log not found for click tracking', { emailId });
        return;
      }
      
      if (!emailLog.tracking.clickedAt) {
        emailLog.status = 'clicked';
        emailLog.tracking.clickedAt = new Date();
      }
      
      emailLog.tracking.clickCount += 1;
      await emailLog.save();
      
      logger.info('Email clicked', {
        emailId,
        to: emailLog.to,
        linkIndex,
        clickCount: emailLog.tracking.clickCount
      });
    } catch (error) {
      logger.error('Failed to track email click', { emailId, error: error.message });
    }
  }
  
  /**
   * Get email statistics
   */
  static async getStatistics(filters = {}) {
    try {
      const match = {};
      if (filters.startDate) match.createdAt = { $gte: filters.startDate };
      if (filters.endDate) match.createdAt = { ...match.createdAt, $lte: filters.endDate };
      if (filters.status) match.status = filters.status;
      if (filters.template) match.template = filters.template;
      
      const stats = await EmailLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const total = await EmailLog.countDocuments(match);
      const opened = await EmailLog.countDocuments({ ...match, status: 'opened' });
      const clicked = await EmailLog.countDocuments({ ...match, status: 'clicked' });
      
      return {
        total,
        sent: stats.find(s => s._id === 'sent')?.count || 0,
        delivered: stats.find(s => s._id === 'delivered')?.count || 0,
        opened,
        clicked,
        bounced: stats.find(s => s._id === 'bounced')?.count || 0,
        failed: stats.find(s => s._id === 'failed')?.count || 0,
        openRate: total > 0 ? (opened / total * 100).toFixed(2) : 0,
        clickRate: total > 0 ? (clicked / total * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('Failed to get email statistics', { error: error.message });
      throw error;
    }
  }
}

export default EmailService;
```

### **src/services/templateService.js**
```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../../templates');

/**
 * Render email template
 */
export async function renderTemplate(templateName, data) {
  try {
    const htmlPath = path.join(templatesDir, `${templateName}.hbs`);
    const textPath = path.join(templatesDir, `${templateName}.txt`);
    
    // Read HTML template
    const htmlTemplate = fs.readFileSync(htmlPath, 'utf8');
    const template = Handlebars.compile(htmlTemplate);
    const html = template(data);
    
    // Read text template (if exists)
    let text = null;
    if (fs.existsSync(textPath)) {
      const textTemplate = fs.readFileSync(textPath, 'utf8');
      const textTemplateCompiled = Handlebars.compile(textTemplate);
      text = textTemplateCompiled(data);
    }
    
    return { html, text };
  } catch (error) {
    throw new Error(`Failed to render template ${templateName}: ${error.message}`);
  }
}
```

### **src/services/trackingService.js**
```javascript
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

/**
 * Add tracking pixels and rewrite links
 */
export function addTracking(html, emailId) {
  const openTrackingId = uuidv4();
  const clickTrackingIds = [];
  
  // Add open tracking pixel
  const trackingPixel = `
    <img src="${config.email.trackingDomain}/track/open/${emailId}/${openTrackingId}" 
         width="1" height="1" style="display:none;" />
  `;
  
  // Insert tracking pixel before closing body tag
  let htmlWithTracking = html;
  if (html.includes('</body>')) {
    htmlWithTracking = html.replace('</body>', `${trackingPixel}</body>`);
  } else {
    htmlWithTracking = html + trackingPixel;
  }
  
  // Rewrite links for click tracking
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  htmlWithTracking = htmlWithTracking.replace(linkRegex, (match, url) => {
    // Skip if already a tracking link
    if (url.includes('/track/click/')) {
      return match;
    }
    
    const clickTrackingId = uuidv4();
    clickTrackingIds.push(clickTrackingId);
    const trackingUrl = `${config.email.trackingDomain}/track/click/${emailId}/${clickTrackingId}?url=${encodeURIComponent(url)}`;
    
    return match.replace(url, trackingUrl);
  });
  
  return {
    htmlWithTracking,
    openTrackingId,
    clickTrackingIds
  };
}
```

---

## 🛣️ Step 6: API Routes

### **src/routes/emailRoutes.js**
```javascript
import express from 'express';
import EmailController from '../controllers/emailController.js';
import { authenticateApiKey } from '../middlewares/auth.js';

const router = express.Router();

// All routes require API key authentication
router.use(authenticateApiKey);

// Send email
router.post('/send', EmailController.sendEmail);

// Send bulk emails
router.post('/send-bulk', EmailController.sendBulkEmails);

// Get email status
router.get('/status/:emailId', EmailController.getEmailStatus);

// Track email open (public, no auth)
router.get('/track/open/:emailId/:trackingId', EmailController.trackOpen);

// Track email click (public, no auth)
router.get('/track/click/:emailId/:trackingId', EmailController.trackClick);

// Get statistics
router.get('/stats', EmailController.getStatistics);

// Webhook handler (for provider callbacks)
router.post('/webhook', EmailController.handleWebhook);

export default router;
```

### **src/controllers/emailController.js**
```javascript
import EmailService from '../services/emailService.js';
import logger from '../utils/logger.js';

class EmailController {
  /**
   * Send single email
   */
  static async sendEmail(req, res, next) {
    try {
      const { to, template, templateData, subject, metadata } = req.body;
      
      if (!to || !template) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: to, template'
        });
      }
      
      const result = await EmailService.sendEmail({
        to,
        template,
        templateData,
        subject,
        metadata
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Email send error', { error: error.message });
      next(error);
    }
  }
  
  /**
   * Send bulk emails
   */
  static async sendBulkEmails(req, res, next) {
    try {
      const { emails } = req.body;
      
      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'emails must be a non-empty array'
        });
      }
      
      const results = await Promise.allSettled(
        emails.map(email => EmailService.sendEmail(email))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      res.json({
        success: true,
        data: {
          total: emails.length,
          successful,
          failed,
          results: results.map((r, i) => ({
            index: i,
            success: r.status === 'fulfilled',
            data: r.status === 'fulfilled' ? r.value : null,
            error: r.status === 'rejected' ? r.reason.message : null
          }))
        }
      });
    } catch (error) {
      logger.error('Bulk email send error', { error: error.message });
      next(error);
    }
  }
  
  /**
   * Get email status
   */
  static async getEmailStatus(req, res, next) {
    try {
      const { emailId } = req.params;
      
      const EmailLog = (await import('../models/EmailLog.js')).default;
      const emailLog = await EmailLog.findOne({ emailId });
      
      if (!emailLog) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          emailId: emailLog.emailId,
          to: emailLog.to,
          subject: emailLog.subject,
          status: emailLog.status,
          sentAt: emailLog.sentAt,
          deliveredAt: emailLog.deliveredAt,
          openedAt: emailLog.tracking.openedAt,
          clickedAt: emailLog.tracking.clickedAt,
          clickCount: emailLog.tracking.clickCount
        }
      });
    } catch (error) {
      logger.error('Get email status error', { error: error.message });
      next(error);
    }
  }
  
  /**
   * Track email open
   */
  static async trackOpen(req, res, next) {
    try {
      const { emailId } = req.params;
      
      await EmailService.trackOpen(emailId);
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      
      res.set('Content-Type', 'image/gif');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(pixel);
    } catch (error) {
      logger.error('Track open error', { error: error.message });
      // Still return pixel even on error
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.set('Content-Type', 'image/gif');
      res.send(pixel);
    }
  }
  
  /**
   * Track email click
   */
  static async trackClick(req, res, next) {
    try {
      const { emailId, trackingId } = req.params;
      const { url } = req.query;
      
      const EmailLog = (await import('../models/EmailLog.js')).default;
      const emailLog = await EmailLog.findOne({ emailId });
      
      if (emailLog && emailLog.tracking.clickTrackingIds.includes(trackingId)) {
        await EmailService.trackClick(emailId, trackingId);
      }
      
      // Redirect to original URL
      if (url) {
        res.redirect(url);
      } else {
        res.status(400).json({
          success: false,
          message: 'Missing redirect URL'
        });
      }
    } catch (error) {
      logger.error('Track click error', { error: error.message });
      if (req.query.url) {
        res.redirect(req.query.url);
      } else {
        next(error);
      }
    }
  }
  
  /**
   * Get statistics
   */
  static async getStatistics(req, res, next) {
    try {
      const { startDate, endDate, status, template } = req.query;
      
      const filters = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (status) filters.status = status;
      if (template) filters.template = template;
      
      const stats = await EmailService.getStatistics(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get statistics error', { error: error.message });
      next(error);
    }
  }
  
  /**
   * Handle webhook (for provider callbacks)
   */
  static async handleWebhook(req, res, next) {
    try {
      // Handle SendGrid webhook
      const events = req.body;
      
      for (const event of events) {
        const { email, event: eventType, sg_message_id } = event;
        
        const EmailLog = (await import('../models/EmailLog.js')).default;
        const emailLog = await EmailLog.findOne({ providerMessageId: sg_message_id });
        
        if (emailLog) {
          switch (eventType) {
            case 'delivered':
              emailLog.status = 'delivered';
              emailLog.deliveredAt = new Date();
              break;
            case 'open':
              if (!emailLog.tracking.openedAt) {
                emailLog.status = 'opened';
                emailLog.tracking.openedAt = new Date();
              }
              break;
            case 'click':
              if (!emailLog.tracking.clickedAt) {
                emailLog.status = 'clicked';
                emailLog.tracking.clickedAt = new Date();
              }
              emailLog.tracking.clickCount += 1;
              break;
            case 'bounce':
            case 'dropped':
              emailLog.status = 'bounced';
              emailLog.bounce = {
                reason: event.reason || 'Unknown',
                bouncedAt: new Date()
              };
              break;
          }
          
          await emailLog.save();
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Webhook handler error', { error: error.message });
      res.status(500).send('Error');
    }
  }
}

export default EmailController;
```

---

## 🔐 Step 7: Authentication Middleware

### **src/middlewares/auth.js**
```javascript
import config from '../config/index.js';

/**
 * Authenticate API key
 */
export function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== config.api.apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
  }
  
  next();
}
```

---

## 🚀 Step 8: Main Application

### **src/app.js**
```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import emailRoutes from './routes/emailRoutes.js';
import config from './config/index.js';
import logger from './utils/logger.js';

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-service' });
});

// Routes
app.use('/api/v1/email', emailRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Connect to MongoDB
mongoose
  .connect(config.mongodb.uri, config.mongodb.options)
  .then(() => {
    logger.info('MongoDB connected');
    app.listen(config.port, () => {
      logger.info(`Email Service running on port ${config.port}`);
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error', { error: err.message });
    process.exit(1);
  });

export default app;
```

---

## 📧 Step 9: Email Templates

### **templates/welcome.hbs**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Shorthand Platform</title>
</head>
<body>
  <h1>Welcome, {{name}}!</h1>
  <p>Your account has been created successfully.</p>
  <p>You can now log in and start taking tests.</p>
  <p>Best regards,<br>Shorthand Platform Team</p>
</body>
</html>
```

### **templates/test-assignment.hbs**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Test Assigned</title>
</head>
<body>
  <h1>Hello, {{studentName}}!</h1>
  <p>A new test has been assigned to you:</p>
  <h2>{{testTitle}}</h2>
  <p><strong>Batch:</strong> {{batchName}}</p>
  <p><strong>Due Date:</strong> {{dueDate}}</p>
  <p><a href="{{testUrl}}">Take Test Now</a></p>
  <p>Best regards,<br>Shorthand Platform Team</p>
</body>
</html>
```

---

## 🐳 Step 10: Docker Configuration

### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "src/app.js"]
```

### **docker-compose.yml**
```yaml
version: '3.9'

services:
  email-service:
    build: .
    container_name: email-service
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/shorthnd-email
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mongodb
      - redis
    networks:
      - shorthnd-network

  mongodb:
    image: mongo:7
    container_name: email-mongodb
    volumes:
      - email-mongodb-data:/data/db
    networks:
      - shorthnd-network

  redis:
    image: redis:7-alpine
    container_name: email-redis
    networks:
      - shorthnd-network

networks:
  shorthnd-network:
    driver: bridge

volumes:
  email-mongodb-data:
```

---

## 🔗 Step 11: Integration with Main Backend

### **Update Main Backend: src/services/emailService.js**
```javascript
import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class EmailService {
  static async sendEmail({ to, template, templateData, subject, metadata }) {
    try {
      const response = await axios.post(
        `${config.emailServiceUrl}/api/v1/email/send`,
        {
          to,
          template,
          templateData,
          subject,
          metadata
        },
        {
          headers: {
            'X-API-Key': config.emailServiceApiKey
          }
        }
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to send email via email service', {
        error: error.message,
        to,
        template
      });
      throw error;
    }
  }
}

export default EmailService;
```

### **Update Main Backend: src/config/index.js**
```javascript
export default {
  // ... existing config
  emailServiceUrl: process.env.EMAIL_SERVICE_URL || 'http://email-service:3001',
  emailServiceApiKey: process.env.EMAIL_SERVICE_API_KEY || 'your-secret-api-key'
};
```

### **Usage in Main Backend**
```javascript
// In studentController.js (registration)
import EmailService from '../services/emailService.js';

// After student creation
await EmailService.sendEmail({
  to: student.email,
  template: 'welcome',
  templateData: {
    name: student.name
  },
  metadata: {
    userId: student._id,
    type: 'welcome'
  }
});
```

---

## ✅ Step 12: Testing

### **Test Email Sending**
```bash
curl -X POST http://localhost:3001/api/v1/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "to": "test@example.com",
    "template": "welcome",
    "templateData": {
      "name": "Test User"
    },
    "metadata": {
      "type": "welcome"
    }
  }'
```

### **Check Email Status**
```bash
curl http://localhost:3001/api/v1/email/status/{emailId} \
  -H "X-API-Key: your-secret-api-key"
```

---

## 📊 Step 13: Monitoring Integration

Add Prometheus metrics and Loki logging similar to main backend.

---

## 🎯 Next Steps

1. **Deploy Email Service** alongside main backend
2. **Test Integration** with main backend
3. **Monitor Performance** and error rates
4. **Add More Templates** as needed
5. **Implement Queue System** (BullMQ) for async processing

---

**Last Updated:** 2025-01-15

