const { body } = require('express-validator');

const registerValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    // body('password')
    //   .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    //   .matches(/\d/).withMessage('Password must contain a number')
    //   .matches(/[a-zA-Z]/).withMessage('Password must contain a letter'),
    body('userType').isIn(['client', 'vendor', 'admin', 'staff']).withMessage('Invalid user type'),
    body('role')
    .if(body('userType').equals('staff'))
    .isIn(['verifier', 'lead_management']).withMessage('Invalid user role'),
    // body('questions')
    //   .if(body('userType').isIn(['vendor', 'staff']))
    //   .isArray().withMessage('Questions must be an array')
    //   .custom((questions) => {
    //     if (!questions || !Array.isArray(questions)) {
    //       throw new Error('Questions must be an array');
    //     }
    //     questions.forEach((question) => {
    //       if (!('questionId' in question) || !(typeof question.questionId === 'string' || typeof question.questionId === 'number')) {
    //         throw new Error('Each question must have a valid questionId (string or number)');
    //       }
    //       if (!('isRequired' in question) || typeof question.isRequired !== 'boolean') {
    //         throw new Error('Each question must have an isRequired field of type boolean');
    //       }
    //     });
    //     return true;
    //   }),

];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[a-zA-Z]/).withMessage('Password must contain a letter'),
]

module.exports = { 
  registerValidation,
  loginValidation
};
