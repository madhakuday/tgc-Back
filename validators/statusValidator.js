const { body } = require('express-validator');

const createStatusValidation = [
  body('name').notEmpty().withMessage('Status name is required'),
  body('color').notEmpty().withMessage('Status color is required'),
  body('visibleTo').isArray().withMessage('Visible To field is required')
];


module.exports = {
  createStatusValidation,
};
