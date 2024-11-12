const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFixed: {
        type: Boolean,
        default: false
    },
    fixedId: {
        type: String
    }
}, { timestamps: true });


const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
