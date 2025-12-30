const { ValidationError, UniqueConstraintError } = require("sequelize");
const ApiError = require("../utils/ErrorHelpers/ApiError");
const {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  AlreadyExist,
} = require("../utils/ErrorHelpers/Errors");

const errorHandler = (err, req, res, next) => {
  console.log("err", err);

  const success = false;
  let message = "";
  let statusCode = 500; // default to Internal Server Error

  if (err instanceof ValidationError) {
    message = err.errors?.[0]?.message || "Validation Error";
    statusCode = err.statusCode || 400;
  } else if (err instanceof UniqueConstraintError) {
    message = err.errors?.[0]?.message || "Unique Constraint Error";
    statusCode = err.statusCode || 409;
  } else if (err instanceof BadRequestError) {
    message = err.message || "Bad Request";
    statusCode = err.statusCode || 400;
  } else if (err instanceof NotFoundError) {
    message = err.message || "Not Found";
    statusCode = err.statusCode || 404;
  } else if (err instanceof ForbiddenError) {
    message = err.message || "Forbidden";
    statusCode = err.statusCode || 403;
  } else if (err instanceof UnauthorizedError) {
    message = err.message || "Unauthorized";
    statusCode = err.statusCode || 401;
  } else if (err instanceof AlreadyExist) {
    message = err.message || "Already Exists";
    statusCode = err.statusCode || 409;
  } else if (err instanceof ApiError) {
    message = err.message || "API Error";
    statusCode = err.statusCode || 500;
  }
  
  else {
    message = err.message || "Server Error";
    statusCode = 500;
  }

  return res.status(statusCode).json({
    success,
    message,
    details: err.details || null,
  });
};

module.exports = { errorHandler };
