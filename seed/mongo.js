const mongoose = require('mongoose');
const Question = require('../models/question.model'); // Adjust path as necessary

const fixedQuestions = [
    // { title: 'First name', type: 'text', isFixed: true, fixedId: 'first_name' },
    // { title: 'Last name', type: 'text', isFixed: true, fixedId: 'last_name' },
    // { title: 'Email', type: 'email', isFixed: true, fixedId: 'email', isUnique: true },
    // { title: 'Contact Number', type: 'text', isFixed: true, fixedId: 'contact_number', isUnique: true },
    // { title: 'DOB', type: 'date', isFixed: true, fixedId: 'dob' },
    { title: 'Address', type: 'text', isFixed: true, fixedId: 'address' },
];

const seedFixedQuestions = async () => {
    try {
        for (const question of fixedQuestions) {
            const existingQuestion = await Question.findOne({ fixedId: question.fixedId });

            if (!existingQuestion) {
                await Question.create(question);
            } else {
            }
        }
    } catch (error) {
    }
};

// Run the seed function on app start
module.exports = seedFixedQuestions;
