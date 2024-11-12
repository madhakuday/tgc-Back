const { body } = require('express-validator');

const parseResponses = (req, res, next) => {
    if (req.body.responses) {
        try {
            req.body.responses = req.body.responses.map(response => JSON.parse(response));
        } catch (error) {
            return res.status(400).json({ message: 'Invalid JSON in responses' });
        }
    }
    next();
};

const createLeadValidation = [
  body('responses').isArray().withMessage('Responses should be an array'),
  body('responses.*.questionId').notEmpty().withMessage('Question ID is required for each response'),
  body('responses.*.response').notEmpty().withMessage('Response is required for each question'),
  body('remark').optional().isString().withMessage('Remark must be a string'),
];

module.exports = {
  parseResponses,
  createLeadValidation,
};
