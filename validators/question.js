const { body } = require('express-validator');

const createQuestionValidation = [
  body('questions').isArray().withMessage('Questions should be an array'), // Validate that 'questions' is an array
  body('questions.*.title').notEmpty().withMessage('Title is required for each question'),
  body('questions.*.type')
    .isIn(['text', 'number', 'email', 'date', 'radio'])
    .withMessage('Type must be one of [text, number, email, date, radio] for each question')
];

const updateQuestionValidation = [
  body('questions.*.title').notEmpty().withMessage('Title is required for each question'),
  body('questions.*.type')
    .isIn(['text', 'number', 'email', 'date', 'radio'])
    .withMessage('Type must be one of [text, number, email, date, radio] for each question')
];

module.exports = {
  createQuestionValidation,
  updateQuestionValidation
};
