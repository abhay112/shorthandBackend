/**
 * Base Repository Interface
 * Defines the contract for all repositories
 */
export class BaseRepository {
  constructor(model) {
    if (this.constructor === BaseRepository) {
      throw new Error('BaseRepository cannot be instantiated directly');
    }
    this.model = model;
  }

  /**
   * Find document by ID
   */
  async findById(id, populate = []) {
    let query = this.model.findById(id);
    populate.forEach(path => {
      query = query.populate(path);
    });
    return await query.exec();
  }

  /**
   * Find one document matching query
   */
  async findOne(query = {}, populate = []) {
    let mongooseQuery = this.model.findOne(query);
    populate.forEach(path => {
      mongooseQuery = mongooseQuery.populate(path);
    });
    return await mongooseQuery.exec();
  }

  /**
   * Find multiple documents matching query
   */
  async find(query = {}, options = {}) {
    const {
      populate = [],
      sort = {},
      limit = null,
      skip = 0,
      select = null,
      lean = false
    } = options;

    let mongooseQuery = this.model.find(query);

    populate.forEach(path => {
      mongooseQuery = mongooseQuery.populate(path);
    });

    if (sort && Object.keys(sort).length > 0) {
      mongooseQuery = mongooseQuery.sort(sort);
    }

    if (skip > 0) {
      mongooseQuery = mongooseQuery.skip(skip);
    }

    if (limit) {
      mongooseQuery = mongooseQuery.limit(limit);
    }

    if (select) {
      mongooseQuery = mongooseQuery.select(select);
    }

    if (lean) {
      mongooseQuery = mongooseQuery.lean();
    }

    return await mongooseQuery.exec();
  }

  /**
   * Create a new document
   */
  async create(data) {
    return await this.model.create(data);
  }

  /**
   * Update document by ID
   */
  async updateById(id, data, options = {}) {
    const { new: returnNew = true, runValidators = true } = options;
    return await this.model.findByIdAndUpdate(
      id,
      data,
      { new: returnNew, runValidators }
    );
  }

  /**
   * Update one document matching query
   */
  async updateOne(query, data, options = {}) {
    const { new: returnNew = true, runValidators = true } = options;
    return await this.model.findOneAndUpdate(
      query,
      data,
      { new: returnNew, runValidators }
    );
  }

  /**
   * Update multiple documents
   */
  async updateMany(query, data) {
    return await this.model.updateMany(query, data);
  }

  /**
   * Delete document by ID
   */
  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }

  /**
   * Delete one document matching query
   */
  async deleteOne(query) {
    return await this.model.findOneAndDelete(query);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(query) {
    return await this.model.deleteMany(query);
  }

  /**
   * Count documents matching query
   */
  async count(query = {}) {
    return await this.model.countDocuments(query);
  }

  /**
   * Check if document exists
   */
  async exists(query) {
    const count = await this.model.countDocuments(query);
    return count > 0;
  }

  /**
   * Aggregate pipeline
   */
  async aggregate(pipeline) {
    return await this.model.aggregate(pipeline);
  }
}

export default BaseRepository;

