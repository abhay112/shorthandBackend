# TDD Implementation Guide

## 🎯 Overview

This guide explains the TDD (Test-Driven Development) architecture implemented in this project.

## 📁 Folder Structure

```
backend/
├── src/
│   ├── infrastructure/
│   │   └── repositories/      # Data access layer (DI-ready)
│   ├── services/
│   │   └── refactored/        # Refactored services with DI
│   └── ...
├── tests/
│   ├── unit/                  # Unit tests
│   │   ├── repositories/
│   │   ├── services/
│   │   └── controllers/
│   ├── integration/          # Integration tests
│   │   └── routes/
│   ├── e2e/                   # End-to-end tests
│   ├── utils/                 # Test utilities
│   │   ├── testHelpers.js     # Helper functions
│   │   ├── factories.js       # Data factories
│   │   └── mocks.js           # Mock implementations
│   ├── setup.js               # Global test setup
│   └── teardown.js            # Global test teardown
└── ...
```

## 🔧 Key Concepts

### 1. Repository Pattern

Repositories abstract data access, making services testable:

```javascript
// Repository (infrastructure/repositories/StudentRepository.js)
class StudentRepository extends BaseRepository {
  async findByEmail(email) {
    return await this.findOne({ email });
  }
}

// Service uses repository (injected)
class StudentService {
  constructor({ studentRepository }) {
    this.studentRepository = studentRepository;
  }
  
  async getProfile(id) {
    return await this.studentRepository.findById(id);
  }
}
```

### 2. Dependency Injection

Services receive dependencies via constructor:

```javascript
// In production
const service = new StudentService({
  studentRepository: StudentRepository,
  resultRepository: ResultRepository,
});

// In tests
const service = new StudentService({
  studentRepository: new MockStudentRepository(),
  resultRepository: new MockResultRepository(),
});
```

### 3. Testing Layers

#### Unit Tests
- Test individual components in isolation
- Mock all dependencies
- Fast execution
- Example: `tests/unit/services/StudentService.test.js`

#### Integration Tests
- Test component interactions
- Use test database
- Slower execution
- Example: `tests/integration/routes/studentRoutes.test.js`

#### E2E Tests
- Test complete workflows
- Full system test
- Slowest execution
- Example: `tests/e2e/authFlow.test.js`

## 📝 Writing Tests

### Unit Test Example

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import StudentService from '../../../src/services/StudentService.js';
import { MockStudentRepository } from '../../utils/mocks.js';

describe('StudentService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = new MockStudentRepository();
    service = new StudentService({
      studentRepository: mockRepository,
    });
  });

  it('should get student profile', async () => {
    const testStudent = { id: '123', name: 'Test' };
    mockRepository.seed([testStudent]);

    const result = await service.getProfile('123');
    expect(result.name).toBe('Test');
  });
});
```

### Integration Test Example

```javascript
import request from 'supertest';
import app from '../../../src/app.js';

describe('GET /api/v1/user/profile', () => {
  it('should return user profile', async () => {
    const response = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only e2e tests
npm run test:e2e
```

## 📊 Coverage Thresholds

Current coverage thresholds (in `package.json`):
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 🔄 Migration Strategy

### Step 1: Create Repository
1. Create repository in `src/infrastructure/repositories/`
2. Extend `BaseRepository`
3. Add domain-specific methods

### Step 2: Write Repository Tests
1. Create test file in `tests/unit/repositories/`
2. Mock Mongoose model
3. Test all methods

### Step 3: Refactor Service
1. Inject repository via constructor
2. Replace direct model calls with repository calls
3. Keep business logic intact

### Step 4: Write Service Tests
1. Create test file in `tests/unit/services/`
2. Mock repositories
3. Test business logic

### Step 5: Write Integration Tests
1. Create test file in `tests/integration/routes/`
2. Use test database
3. Test full request/response cycle

## 🎓 Best Practices

1. **Write tests first** (TDD cycle: Red → Green → Refactor)
2. **Mock external dependencies** (databases, APIs, file system)
3. **Keep tests isolated** (each test should be independent)
4. **Use descriptive test names** (describe what is being tested)
5. **Test edge cases** (null, undefined, empty arrays, etc.)
6. **Maintain test coverage** (aim for 70%+ coverage)
7. **Keep tests fast** (unit tests should run in milliseconds)

## 🐛 Debugging Tests

```bash
# Run specific test file
npm test -- StudentService.test.js

# Run tests matching pattern
npm test -- --testNamePattern="getProfile"

# Run with verbose output
npm test -- --verbose

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)

## ✅ Checklist for New Features

- [ ] Create repository (if new entity)
- [ ] Write repository unit tests
- [ ] Create/update service with DI
- [ ] Write service unit tests
- [ ] Update/create controller
- [ ] Write controller unit tests
- [ ] Write route integration tests
- [ ] Update API documentation
- [ ] Ensure coverage thresholds met

