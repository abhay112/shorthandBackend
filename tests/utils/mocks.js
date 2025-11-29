/**
 * Mock implementations for testing
 */

/**
 * Mock repository base class
 */
export class MockRepository {
  constructor(data = []) {
    this.data = Array.isArray(data) ? [...data] : [data];
  }

  async findById(id) {
    return this.data.find(item => item._id?.toString() === id.toString() || item.id?.toString() === id.toString()) || null;
  }

  async findOne(query) {
    return this.data.find(item => this._matchesQuery(item, query)) || null;
  }

  async find(query = {}) {
    return this.data.filter(item => this._matchesQuery(item, query));
  }

  async create(data) {
    const newItem = {
      _id: data._id || this._generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.push(newItem);
    return newItem;
  }

  async update(id, data) {
    const index = this.data.findIndex(item => 
      item._id?.toString() === id.toString() || item.id?.toString() === id.toString()
    );
    if (index === -1) return null;
    
    this.data[index] = {
      ...this.data[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.data[index];
  }

  async delete(id) {
    const index = this.data.findIndex(item => 
      item._id?.toString() === id.toString() || item.id?.toString() === id.toString()
    );
    if (index === -1) return null;
    
    return this.data.splice(index, 1)[0];
  }

  async countDocuments(query = {}) {
    return this.data.filter(item => this._matchesQuery(item, query)).length;
  }

  _matchesQuery(item, query) {
    for (const key in query) {
      if (query[key] === undefined) continue;
      
      if (key === '_id' || key === 'id') {
        if (item._id?.toString() !== query[key]?.toString() && 
            item.id?.toString() !== query[key]?.toString()) {
          return false;
        }
      } else if (typeof query[key] === 'object' && query[key] !== null) {
        // Handle MongoDB operators
        if (query[key].$in) {
          const itemValue = item[key];
          if (!query[key].$in.some(val => 
            itemValue?.toString() === val?.toString() ||
            (Array.isArray(itemValue) && itemValue.some(iv => iv?.toString() === val?.toString()))
          )) {
            return false;
          }
        } else if (query[key].$gte) {
          if (new Date(item[key]) < new Date(query[key].$gte)) return false;
        } else if (query[key].$lte) {
          if (new Date(item[key]) > new Date(query[key].$lte)) return false;
        }
      } else {
        if (item[key] !== query[key]) {
          return false;
        }
      }
    }
    return true;
  }

  _generateId() {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  reset() {
    this.data = [];
  }

  seed(data) {
    this.data = Array.isArray(data) ? [...data] : [data];
  }
}

/**
 * Mock Student Repository
 */
export class MockStudentRepository extends MockRepository {
  async findByEmail(email) {
    return this.data.find(item => item.email === email) || null;
  }

  async findByFirebaseUid(firebaseUid) {
    return this.data.find(item => item.firebaseUid === firebaseUid) || null;
  }
}

/**
 * Mock Batch Repository
 */
export class MockBatchRepository extends MockRepository {
  async findByName(name) {
    return this.data.find(item => item.name === name) || null;
  }

  async findActive() {
    return this.data.filter(item => item.isActive === true);
  }
}

/**
 * Mock Test Repository
 */
export class MockTestRepository extends MockRepository {
  async findPublished() {
    return this.data.filter(item => item.isPublished === true && item.isActive === true);
  }

  async findActive() {
    return this.data.filter(item => item.isActive === true);
  }
}

/**
 * Mock Result Repository
 */
export class MockResultRepository extends MockRepository {
  async findByStudent(studentId) {
    return this.data.filter(item => 
      item.studentId?.toString() === studentId.toString()
    );
  }

  async findByTest(testId) {
    return this.data.filter(item => 
      item.testId?.toString() === testId.toString()
    );
  }

  async findByBatch(batchId) {
    return this.data.filter(item => 
      item.batchId?.toString() === batchId.toString()
    );
  }

  async getStudentStatistics(studentId) {
    const studentResults = this.data.filter(item => 
      item.studentId?.toString() === studentId.toString() && 
      item.status === 'completed'
    );

    if (studentResults.length === 0) {
      return [{
        totalTests: 0,
        averageWpm: 0,
        averageAccuracy: 0,
        bestWpm: 0,
        bestAccuracy: 0,
        totalTimeSpent: 0,
      }];
    }

    const totalTests = studentResults.length;
    const totalWpm = studentResults.reduce((sum, r) => sum + (r.wpm || 0), 0);
    const totalAccuracy = studentResults.reduce((sum, r) => sum + (r.accuracy || 0), 0);
    const bestWpm = Math.max(...studentResults.map(r => r.wpm || 0));
    const bestAccuracy = Math.max(...studentResults.map(r => r.accuracy || 0));
    const totalTimeSpent = studentResults.reduce((sum, r) => sum + (r.timeTaken || 0), 0);

    return [{
      totalTests,
      averageWpm: totalWpm / totalTests,
      averageAccuracy: totalAccuracy / totalTests,
      bestWpm,
      bestAccuracy,
      totalTimeSpent,
    }];
  }

  async aggregate(pipeline) {
    // Simple mock implementation for aggregation
    // In real tests, you'd implement the pipeline logic
    return this.getStudentStatistics(pipeline[0].$match.studentId);
  }
}

