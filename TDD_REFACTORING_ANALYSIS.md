# TDD Refactoring Analysis & Implementation Plan

## 📊 Current Architecture Analysis

### Current Structure
```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic (tightly coupled to models)
├── models/          # Mongoose schemas
├── routes/          # Express route definitions
├── middlewares/     # Cross-cutting concerns
└── utils/           # Helper functions
```

### Dependency Graph

```
Controllers → Services → Models (Mongoose)
                ↓
            Utils/Helpers
```

### Key Issues Identified

1. **Tight Coupling**
   - Services directly import Mongoose models
   - No abstraction layer for data access
   - Hard to mock in tests

2. **No Dependency Injection**
   - Services instantiate dependencies directly
   - Cannot swap implementations for testing

3. **Mixed Concerns**
   - Business logic mixed with data access
   - No clear separation of layers

4. **No Test Infrastructure**
   - No test files
   - No testing framework configured
   - No mocks/fixtures

## 🎯 Target Architecture (Clean Architecture + TDD)

### New Structure
```
src/
├── app/                    # Application layer
│   ├── controllers/        # HTTP handlers (thin layer)
│   ├── routes/             # Route definitions
│   ├── validators/        # Input validation
│   └── middleware/        # Express middleware
├── domain/                 # Business logic layer
│   ├── entities/          # Domain entities (if needed)
│   └── use-cases/         # Business use cases
├── core/                   # Core infrastructure
│   ├── errors/            # Error classes
│   ├── utils/             # Shared utilities
│   └── config/            # Configuration
├── infrastructure/         # External dependencies
│   ├── db/                # Database connection
│   ├── repositories/      # Data access layer (abstracted)
│   └── orm/               # Mongoose models (implementation detail)
└── services/              # Service layer (orchestrates use cases)

tests/
├── unit/                  # Unit tests
│   ├── repositories/
│   ├── services/
│   ├── controllers/
│   └── use-cases/
├── integration/           # Integration tests
│   ├── routes/
│   └── services/
├── e2e/                   # End-to-end tests
├── fixtures/              # Test data
├── mocks/                 # Mock implementations
└── utils/                 # Test utilities
```

## 🔄 Refactoring Strategy

### Phase 1: Setup Testing Infrastructure
1. Install Jest + Supertest
2. Create Jest configuration
3. Set up test scripts
4. Create test utilities and factories

### Phase 2: Create Repository Layer
1. Create repository interfaces/abstract classes
2. Implement Mongoose repositories
3. Create mock repositories for testing
4. Refactor services to use repositories (DI)

### Phase 3: Refactor Services
1. Extract business logic to use-cases (optional)
2. Inject repositories into services
3. Remove direct model imports
4. Make services testable

### Phase 4: Write Tests
1. Unit tests for repositories
2. Unit tests for services (with mocked repositories)
3. Unit tests for controllers (with mocked services)
4. Integration tests for routes

### Phase 5: CI/CD Setup
1. GitHub Actions workflow
2. Coverage thresholds
3. Test reporting

## 📋 Priority Order for TDD Conversion

### High Priority (Core Functionality)
1. **Student Service** - Most complex, many dependencies
2. **Auth Service** - Critical security component
3. **Batch Service** - Core business logic
4. **Test Service** - Core functionality

### Medium Priority
5. **Result Service** - Important but simpler
6. **Ranking Service** - Depends on results
7. **Admin Service** - Administrative functions

### Low Priority
8. **Dashboard Service** - Aggregation logic
9. **Audit Service** - Logging (can be tested later)

## 🧪 Testing Strategy

### Unit Tests
- **Repositories**: Mock Mongoose models
- **Services**: Mock repositories
- **Controllers**: Mock services
- **Use Cases**: Mock all dependencies

### Integration Tests
- **Routes**: Test with test database
- **Service Integration**: Test service + repository together
- **Database Operations**: Test actual DB queries

### E2E Tests
- **API Endpoints**: Full request/response cycle
- **Authentication Flow**: Complete auth scenarios
- **Business Workflows**: End-to-end user journeys

## 🔧 Dependency Injection Pattern

### Repository Pattern
```javascript
// Interface/Abstract
class IStudentRepository {
  async findById(id) {}
  async create(data) {}
  async update(id, data) {}
}

// Implementation
class StudentRepository extends IStudentRepository {
  constructor(StudentModel) {
    this.model = StudentModel;
  }
}

// Service with DI
class StudentService {
  constructor(studentRepository) {
    this.repository = studentRepository;
  }
}
```

## 📝 Next Steps Checklist

- [x] Analysis complete
- [ ] Install testing dependencies
- [ ] Create Jest configuration
- [ ] Set up test folder structure
- [ ] Create repository layer
- [ ] Refactor first service (Student)
- [ ] Write tests for Student service
- [ ] Repeat for other services
- [ ] Set up CI/CD

