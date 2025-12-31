// Removed: const { Error } = require("sequelize"); 

class ApiError extends Error {
  constructor(statusCode, message, detail = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.detail = detail;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;