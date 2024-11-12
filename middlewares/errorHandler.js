const { sendErrorResponse } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error for debugging

  // Customize error response
  if (err.name === 'ValidationError') {
    return sendErrorResponse(res, 'Validation error', 400, err.errors);
  }

  // General server error
  return sendErrorResponse(res, 'Server error', 500);
};

module.exports = errorHandler;
