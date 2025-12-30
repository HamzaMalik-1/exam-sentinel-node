const { NotFoundError, ConflictError, BadRequestError } = require("../utils/ErrorHelpers/Errors");

class BaseController {
  constructor(model) {
    this.model = model;
  }

  // ✅ Create or Update
  async createAndUpdate(data, condition = null) {
    if (condition) {
      const existing = await this.model.findOne({ where: condition });
      if (existing) {
        await existing.update(data);
        return existing;
      }
    }
    return await this.model.create(data);
  }

  // ✅ Delete
  async delete(condition, errorMessage = "Item not found") {
    const record = await this.model.findOne({ where: condition });
    if (!record) {
      throw new NotFoundError(errorMessage);
    }
    await record.destroy();
    return true;
  }

  // ✅ Read (single or all)
  async read(filter = {}, options = {}) {
    const {
      single = false,
      include = [],
      attributes = null,
      order = [['createdAt', 'DESC']]
    } = options;

    const query = {
      where: filter,
      include,
      attributes,
      order,
    };

    return single
      ? await this.model.findOne(query)
      : await this.model.findAll(query);
  }

  // 🛡️ Utilities (from your sample)
  bodyExist(body) {
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestError("Request body is empty");
    }
  }

  requireFields(body, fields) {
    fields.forEach(field => {
      if (!body[field]) {
        throw new BadRequestError(`${field} is required`);
      }
    });
  }

  async alreadyExist(filter, errorMessage = "Record already exists") {
    const found = await this.model.findOne({ where: filter });
    if (found) {
      throw new ConflictError(errorMessage);
    }
  }

  async findOne(filter, errorMessage = "Item not found") {
    const record = await this.model.findOne({ where: filter });
    if (!record) {
      throw new NotFoundError(errorMessage);
    }
    return record;
  }
}

module.exports = { BaseController };
