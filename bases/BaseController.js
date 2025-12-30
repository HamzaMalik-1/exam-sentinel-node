const { StatusCodes } = require("http-status-codes");
const { where } = require("sequelize");
const { AlreadyExist, BadRequestError, NotFoundError } = require("../utils/ErrorHelpers/Errors");
const ApiError = require("../utils/ErrorHelpers/ApiError");

class BaseController {
   constructor(model) {
    this.model = model;
    if (!this.model) {
      throw new Error("Model must be provided to BaseController");
    }
  }

 
 requireFields(body, fields) {
  const missing = fields.filter(field => !body[field]);
  if (missing.length > 0) {
    console.log(missing)
    throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`);
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


async alreadyExist(filter, message = `${this.model.name} already exists`) {
  const record = await this.model.findOne({ where: filter });

  if (record) {
    throw new AlreadyExist(message);
  }

  return null; // or undefined, since nothing exists
}


async create(data) {
  return await this.model.create(data);
}

async delete(filter) {
  const record = await this.model.findOne({ where: filter });

  if (!record) {
    throw new NotFoundError("Record not found to delete");
  }

  await record.destroy(); // deletes the instance

  return record; // return deleted instance
}


async findOne(filter, message = "Record not found",include = []) {
  const record = await this.model.findOne({
    where: filter,
    include,
  });

  if (!record) {
    throw new NotFoundError(message);
  }

  return record;
}


async findOrCreate(filter,data)
{
  let record = await this.model.findOne({ where: filter });

  if(!record)
  {
    record =await this.model.create(data)
  }
  return record
}

async getAllOrPaginated(filter = {}, options = {}) {
  const {
    paginate = false,
    page = 1,
    limit = 10,
    order = [['createdAt', 'DESC']],
    include = null, // optional include
  } = options;

  if (paginate) {
    const offset = (page - 1) * limit;

    const { rows, count } = await this.model.findAndCountAll({
      where: filter,
      order,
      limit,
      offset,
      include, // optional
    });

    return {
      data: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    };
  }

  const data = await this.model.findAll({ where: filter, order, include });
  return { data };
}


// async Create(req,requireField)
// {
//   this.model.bodyExist(req.body)

//    this.model.requireFields(req.body, requireField);

// }


  // async checkExistsOrThrow(query, message = "Record not found") {
  //   const record = await this.model.findOne({ where: query });
  //   if (!record) {
  //     throw new ApiError(404, message);
  //   }
  //   return record;
  // }

  // ... other methods like sendResponse, sendError, etc.
}

module.exports = BaseController; 