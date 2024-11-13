const express = require('express');
const Question = require('../models/question.model');
const User = require('../models/user.model');
const validate = require('../middlewares/validationMiddleware');
const { createQuestionValidation, updateQuestionValidation } = require('../validators/question');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const mongoose = require('mongoose');
const Campaign = require('../models/campaign.model');
const router = express.Router();

router.get('/',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, search = '' } = req.query;

        const limitNum = parseInt(limit, 10);
        const pageNum = Math.max(1, parseInt(page, 10));

        const searchQuery = search
            ? { title: { $regex: search, $options: 'i' }, isActive: true }
            : { isActive: true };

        const totalQuestions = await Question.countDocuments(searchQuery);

        let questions;
        const skip = (pageNum - 1) * limitNum;

        if (limitNum === -1) {
            questions = await Question.find(searchQuery).sort({ order: 1, _id: 1 });
        } else {
            questions = await Question.find(searchQuery)
                .sort({ order: 1, _id: 1 })
                .skip(skip)
                .limit(limitNum);
        }

        const response = {
            totalQuestions,
            totalPages: limitNum === -1 ? 1 : Math.ceil(totalQuestions / limitNum),
            currentPage: pageNum,
            questions,
        };

        return sendSuccessResponse(res, response, 'Questions fetched successfully', 200);
    })
);

// Get all question by user ii
router.get('/getAllQuestionById',
    asyncHandler(async (req, res) => {
        const id = req.user.id;
        
        const user = await User.findById(id).populate('questions.questionId');

        if (!user) {
            return sendErrorResponse(res, 'User not found', 404);
        }

        const combinedQuestions = user.questions.map(q => ({
            questionId: q.questionId._id,
            title: q.questionId.title,
            type: q.questionId.type,
            isActive: q.questionId.isActive,
            isRequired: q.isRequired,
            userId: user._id
        }));

        return sendSuccessResponse(res, combinedQuestions, 'Questions fetched successfully', 200);
    })
);

router.get('/getAllQuestionByCampId/:campId',
    asyncHandler(async (req, res) => {
        const id = req.params.campId;
        
        const campaign = await Campaign.findById(new mongoose.Types.ObjectId(id)).populate('questions.questionId');

        const combinedQuestions = campaign.questions.map(q => ({
            questionId: q.questionId._id,
            title: q.questionId.title,
            type: q.questionId.type,
            isActive: q.questionId.isActive,
            isRequired: q.isRequired
        }));

        if (!campaign) {
            return sendErrorResponse(res, 'User not found', 404);
        }

        return sendSuccessResponse(res, combinedQuestions, 'Questions fetched successfully', 200);
    })
);

router.post('/',
    validate(createQuestionValidation),
    asyncHandler(async (req, res) => {
        const questions = req.body.questions;
        const existingTitles = [];

        for (const question of questions) {
            const normalizedTitle = question.title.trim().toLowerCase();
            const existingQuestion = await Question.findOne({
                title: { $regex: `^${normalizedTitle}$`, $options: 'i' },
                isActive: true
            });

            if (existingQuestion) {
                existingTitles.push(question.title);
            }
        }

        if (existingTitles.length > 0) {
            return sendErrorResponse(res, `The following questions already exist: ${existingTitles.join(', ')}`, 400);
        }

        // Insert questions exactly as inputted
        const savedQuestions = await Question.insertMany(questions);
        return sendSuccessResponse(res, savedQuestions, 'Questions created successfully', 201);
    })
);

router.put('/:id',
    validate(updateQuestionValidation),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updatedDataArray = req.body.question;

        if (Array.isArray(updatedDataArray)) {
            const updatedQuestions = [];

            for (let updatedData of updatedDataArray) {
                const normalizedTitle = updatedData.title.trim().toLowerCase();

                const existingQuestion = await Question.findOne({
                    title: { $regex: `^${normalizedTitle}$`, $options: 'i' },
                    _id: { $ne: id },
                    isActive: true
                });

                if (existingQuestion) {
                    return sendErrorResponse(
                        res,
                        `A question with the title "${updatedData.title}" already exists.`,
                        400
                    );
                }

                const updatedQuestion = await Question.findByIdAndUpdate(
                    id,
                    updatedData,
                    { new: true }
                );

                if (!updatedQuestion) {
                    return sendErrorResponse(res, `Question with ID ${id} not found`, 404);
                }

                updatedQuestions.push(updatedQuestion);
            }

            return sendSuccessResponse(res, updatedQuestions, 'Questions updated successfully', 200);
        } else {
            return sendErrorResponse(res, 'Invalid data format, expected an array', 400);
        }
    })
);

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const question = await Question.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!question) return sendErrorResponse(res, 'Question not found', 404);

        return sendSuccessResponse(res, question, 'Question soft deleted successfully', 200);
    })
);

module.exports = router;
