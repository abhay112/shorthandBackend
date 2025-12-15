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
        url: process.env.API_URL || 'http://localhost:5001/api/v1',
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
            description: {
              type: 'string',
              description: 'Description of the test'
            },
            audioURL: {
              type: 'string',
              description: 'URL or path to the audio file'
            },
            referenceText: {
              type: 'string',
              description: 'Reference text for the typing test'
            },
            difficulty: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert'],
              default: 'intermediate',
              description: 'Difficulty level of the test'
            },
            category: {
              type: 'string',
              enum: ['dictation', 'transcription', 'speed_test', 'accuracy_test', 'comprehensive'],
              default: 'comprehensive',
              description: 'Category of the test'
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
            assignedDays: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  batchId: {
                    type: 'string'
                  },
                  day: {
                    type: 'number'
                  },
                  date: {
                    type: 'string',
                    format: 'date-time'
                  },
                  isActive: {
                    type: 'boolean'
                  }
                }
              },
              description: 'Day-wise assignment of tests to batches'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Whether the test is active'
            },
            isPublished: {
              type: 'boolean',
              default: false,
              description: 'Whether the test is published'
            },
            duration: {
              type: 'number',
              default: 300,
              description: 'Duration of the test in seconds'
            },
            maxRetakes: {
              type: 'number',
              default: 3,
              description: 'Maximum number of retakes allowed'
            },
            settings: {
              type: 'object',
              properties: {
                allowPause: {
                  type: 'boolean',
                  default: true
                },
                maxPauses: {
                  type: 'number',
                  default: 3
                },
                showTimer: {
                  type: 'boolean',
                  default: true
                },
                showProgress: {
                  type: 'boolean',
                  default: true
                },
                autoSubmit: {
                  type: 'boolean',
                  default: true
                }
              }
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
        Result: {
          type: 'object',
          required: ['studentId', 'batchId', 'testId', 'wpm', 'accuracy', 'speed'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated id of the result'
            },
            studentId: {
              type: 'string',
              description: 'ID of the student who took the test'
            },
            batchId: {
              type: 'string',
              description: 'ID of the batch'
            },
            testId: {
              type: 'string',
              description: 'ID of the test'
            },
            wpm: {
              type: 'number',
              description: 'Words per minute'
            },
            accuracy: {
              type: 'number',
              description: 'Accuracy percentage'
            },
            speed: {
              type: 'number',
              description: 'Typing speed'
            },
            totalWords: {
              type: 'number',
              description: 'Total words in the test'
            },
            correctWords: {
              type: 'number',
              description: 'Number of correct words'
            },
            incorrectWords: {
              type: 'number',
              description: 'Number of incorrect words'
            },
            totalCharacters: {
              type: 'number',
              description: 'Total characters typed'
            },
            correctCharacters: {
              type: 'number',
              description: 'Number of correct characters'
            },
            incorrectCharacters: {
              type: 'number',
              description: 'Number of incorrect characters'
            },
            timeTaken: {
              type: 'number',
              description: 'Time taken in seconds'
            },
            attemptNumber: {
              type: 'number',
              description: 'Attempt number (1-3)'
            },
            isRetake: {
              type: 'boolean',
              description: 'Whether this is a retake'
            },
            rank: {
              type: 'number',
              description: 'Rank in the batch for this test'
            },
            percentile: {
              type: 'number',
              description: 'Percentile score'
            },
            mistakes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  word: {
                    type: 'string'
                  },
                  expected: {
                    type: 'string'
                  },
                  typed: {
                    type: 'string'
                  },
                  position: {
                    type: 'number'
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  }
                }
              }
            },
            stenographyErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['substitution', 'omission', 'insertion', 'transposition', 'punctuation']
                  },
                  original: {
                    type: 'string'
                  },
                  typed: {
                    type: 'string'
                  },
                  position: {
                    type: 'number'
                  },
                  severity: {
                    type: 'string',
                    enum: ['minor', 'major', 'critical']
                  }
                }
              }
            },
            status: {
              type: 'string',
              enum: ['in_progress', 'completed', 'abandoned'],
              default: 'completed'
            },
            submittedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Submission timestamp'
            }
          }
        },
        TestSession: {
          type: 'object',
          required: ['studentId', 'batchId', 'testId', 'sessionId'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated id of the session'
            },
            studentId: {
              type: 'string',
              description: 'ID of the student'
            },
            batchId: {
              type: 'string',
              description: 'ID of the batch'
            },
            testId: {
              type: 'string',
              description: 'ID of the test'
            },
            sessionId: {
              type: 'string',
              description: 'Unique session identifier'
            },
            currentAttempt: {
              type: 'number',
              default: 1,
              description: 'Current attempt number'
            },
            totalAttempts: {
              type: 'number',
              default: 0,
              description: 'Total attempts made'
            },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed', 'abandoned', 'expired'],
              default: 'not_started'
            },
            timeStarted: {
              type: 'string',
              format: 'date-time',
              description: 'Session start time'
            },
            timeCompleted: {
              type: 'string',
              format: 'date-time',
              description: 'Session completion time'
            },
            timeExpires: {
              type: 'string',
              format: 'date-time',
              description: 'Session expiration time'
            },
            canRetake: {
              type: 'boolean',
              default: true,
              description: 'Whether student can retake the test'
            },
            maxRetakes: {
              type: 'number',
              default: 3,
              description: 'Maximum retakes allowed'
            }
          }
        },
        StudentRanking: {
          type: 'object',
          required: ['studentId', 'batchId', 'testId', 'rank', 'percentile'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated id of the ranking'
            },
            studentId: {
              type: 'string',
              description: 'ID of the student'
            },
            batchId: {
              type: 'string',
              description: 'ID of the batch'
            },
            testId: {
              type: 'string',
              description: 'ID of the test'
            },
            rank: {
              type: 'number',
              description: 'Rank in the batch'
            },
            percentile: {
              type: 'number',
              description: 'Percentile score'
            },
            wpm: {
              type: 'number',
              description: 'Words per minute achieved'
            },
            accuracy: {
              type: 'number',
              description: 'Accuracy percentage'
            },
            speed: {
              type: 'number',
              description: 'Typing speed'
            },
            totalStudents: {
              type: 'number',
              description: 'Total students in the batch'
            },
            totalAttempts: {
              type: 'number',
              description: 'Total attempts for this test'
            },
            previousRank: {
              type: 'number',
              description: 'Previous rank (if any)'
            },
            rankChange: {
              type: 'number',
              description: 'Change in rank from previous attempt'
            },
            testDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date of the test'
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
