// backend/bases/BaseController.js
const { StatusCodes } = require("http-status-codes");
const { AlreadyExist, BadRequestError, NotFoundError } = require("../utils/ErrorHelpers/Errors");
const ApiError = require("../utils/ErrorHelpers/ApiError");

class BaseController {
  constructor(model) {
    this.model = model;
    if (!this.model) {
      throw new Error("Model must be provided to BaseController");
    }
  }

  // --- Validation Helpers ---

  requireFields(body, fields) {
    const missing = fields.filter((field) => !body[field]);
    if (missing.length > 0) {
      // console.log(missing);
      throw new ApiError(StatusCodes.BAD_REQUEST, `Missing required fields: ${missing.join(", ")}`);
    }
  }

  bodyExist(body) {
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestError("Body Not Found");
    }
  }

  paramsExist(params, requiredKeys = []) {
    if (!params || Object.keys(params).length === 0) {
      throw new BadRequestError("No route parameters supplied");
    }

    for (const key of requiredKeys) {
      if (!params[key] || String(params[key]).trim() === "") {
        throw new BadRequestError(`Missing parameter: ${key}`);
      }
    }
  }

  fileExist(file) {
    if (!file) {
      throw new BadRequestError("File not found");
    }
  }

  // --- Database Operations (Mongoose) ---

  async alreadyExist(filter, message = `${this.model.modelName} already exists`) {
    // Mongoose: findOne(filter)
    const record = await this.model.findOne(filter);

    if (record) {
      throw new AlreadyExist(message);
    }
    return null;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async delete(filter) {
    // Mongoose: findOneAndDelete or findOne then delete
    const record = await this.model.findOne(filter);

    if (!record) {
      throw new NotFoundError("Record not found to delete");
    }

    await record.deleteOne(); // Mongoose document method
    return record;
  }

  async findOne(filter, message = "Record not found", populate = []) {
    // Mongoose: Chaining .populate()
    let query = this.model.findOne(filter);
    
    if (populate.length > 0) {
      populate.forEach(p => query.populate(p));
    }

    const record = await query;

    if (!record) {
      throw new NotFoundError(message);
    }

    return record;
  }

  async findOrCreate(filter, data) {
    let record = await this.model.findOne(filter);
    if (!record) {
      record = await this.model.create(data);
    }
    return record;
  }

  async getAllOrPaginated(filter = {}, options = {}) {
    const {
      paginate = false,
      page = 1,
      limit = 10,
      sort = { createdAt: -1 }, // Mongoose sort format: { field: -1 } (desc) or 1 (asc)
      populate = [], // Array of fields to populate
    } = options;

    // Build the query
    let query = this.model.find(filter);

    // Apply Sorting
    query = query.sort(sort);

    // Apply Population
    if (populate.length > 0) {
      populate.forEach(p => query.populate(p));
    }

    if (paginate) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Execute query with skip/limit
      const data = await query.skip(skip).limit(limitNum);
      
      // Get total count (separate query)
      const total = await this.model.countDocuments(filter);

      return {
        data,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };
    }

    // Return all if no pagination
    const data = await query;
    return { data };
  }
}

module.exports = BaseController;