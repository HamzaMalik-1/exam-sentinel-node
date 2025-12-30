const ApiResponse = require("./ApiResponse");

const sendResponse = (res, statusCode,message, data=null ) => {
  const response = new ApiResponse(statusCode, message,data);
  return res.status(statusCode).json(response);
};

module.exports = sendResponse;
