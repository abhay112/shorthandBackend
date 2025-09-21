import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shorthand Typing Test API',
      version: '1.0.0',
      description: 'API documentation for Shorthand Typing Test application',
      contact: {
        name: 'API Support',
        email: 'support@shorthandtest.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token'
        }
      },
      schemas: {
        Student: {
          type: 'object',
          required: ['firebaseUid', 'email'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated id of the student'
            },
            firebaseUid: {
              type: 'string',
              description: 'Firebase UID of the student'
            },
            name: {
              type: 'string',
              description: 'Name of the student'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address of the student'
            },
            role: {
              type: 'string',
              enum: ['student', 'admin'],
              default: 'student',
              description: 'Role of the user'
            },
            isApproved: {
              type: 'boolean',
              default: false,
              description: 'Whether the student is approved by admin'
            },
            isBlocked: {
              type: 'boolean',
              default: false,
              description: 'Whether the student is blocked'
            },
            isOnlineMode: {
              type: 'boolean',
              default: true,
              description: 'Whether the student is in online mode'
            },
            assignedBatches: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of batch IDs assigned to this student'
            },
            results: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of result IDs for this student'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Admin: {
          type: 'object',
          required: ['firebaseUid', 'email'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated id of the admin'
            },
            firebaseUid: {
              type: 'string',
              description: 'Firebase UID of the admin'
            },
            name: {
              type: 'string',
              description: 'Name of the admin'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address of the admin'
            },
            role: {
              type: 'string',
              enum: ['admin', 'super_admin'],
              default: 'admin',
              description: 'Role of the admin'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Whether the admin is active'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Test: {
          type: 'object',
          required: ['title', 'audioURL', 'referenceText', 'uploadedBy'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated id of the test'
            },
            title: {
              type: 'string',
              description: 'Title of the test'
            },
            audioURL: {
              type: 'string',
              description: 'URL or path to the audio file'
            },
            referenceText: {
              type: 'string',
              description: 'Reference text for the typing test'
            },
            uploadedBy: {
              type: 'string',
              description: 'ID of the admin who uploaded the test'
            },
            assignedBatches: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of batch IDs assigned to this test'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Whether the test is active'
            },
            duration: {
              type: 'number',
              default: 300,
              description: 'Duration of the test in seconds'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'object',
              description: 'Error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            meta: {
              type: 'object',
              description: 'Additional metadata'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Students',
        description: 'Student management operations'
      },
      {
        name: 'Admins',
        description: 'Admin management operations'
      },
      {
        name: 'Batches',
        description: 'Batch management operations'
      },
      {
        name: 'Tests',
        description: 'Test management operations'
      },
      {
        name: 'Results',
        description: 'Test results management'
      }
    ]
  },
  apis: [
    './src/controllers/*.js',
    './src/routes/*.js'
  ]
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
