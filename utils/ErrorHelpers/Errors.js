const ApiError =require('./ApiError')
const { StatusCodes, ReasonPhrases } = require('http-status-codes');


class BadRequestError extends ApiError {
  constructor(message = ReasonPhrases.BAD_REQUEST, details) {
    console.log(message)
    super(StatusCodes.BAD_REQUEST, message, details);
  }
}

class ForbiddenError extends ApiError{
 constructor(message = ReasonPhrases.FORBIDDEN, details) {
    super(StatusCodes.FORBIDDEN, message, details);
  }
}

class NotFoundError  extends ApiError{
 constructor(message = ReasonPhrases.NOT_FOUND, details) {
    super(StatusCodes.NOT_FOUND, message, details);
  }
}

class InternalServerError  extends ApiError
{
 constructor(message = ReasonPhrases.INTERNAL_SERVER_ERROR, details) {
    super(StatusCodes.INTERNAL_SERVER_ERROR, message, details);
  }
}


class UnauthorizedError extends ApiError {
 constructor(message = ReasonPhrases.UNAUTHORIZED, details) {
    super(StatusCodes.UNAUTHORIZED, message, details);
  }
} 

class AlreadyExist extends ApiError {
 constructor(message = ReasonPhrases.CONFLICT, details) {
    super(StatusCodes.CONFLICT, message, details);
  }
} 

module.exports ={
    BadRequestError,
    InternalServerError ,
    NotFoundError ,
    ForbiddenError,
    UnauthorizedError,
    AlreadyExist
}