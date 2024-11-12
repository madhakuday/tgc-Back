// middlewares/validationMiddleware.js
const { validationResult } = require('express-validator');
const { sendErrorResponse } = require('../utils/responseHandler');

// General middleware to accept validators and handle errors
const validate = (validators) => {
  return async (req, res, next) => {
    try {
      // Run the validators
      await Promise.all(validators.map((validator) => validator?.run(req)));

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendErrorResponse(res, 'Validation error', 400, errors.array());
      }

      next();
    } catch (error) {
      console.error("Validation error:", error);
      return sendErrorResponse(res, 'Internal server error during validation', 500);
    }
  };
};

module.exports = validate;
