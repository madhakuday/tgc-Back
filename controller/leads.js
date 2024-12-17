const Question = require("../models/question.model");

const checkRepresentation = async (req, res, next) => {
    try {
        const { responses } = req.body;

        const representedByFirmQuestion = await Question.findOne({ fixedId: 'represented_by_firm_attorney' });
        const representedByFirmQuestionId = representedByFirmQuestion ? representedByFirmQuestion._id.toString() : null;

        const representedByFirmResponse = responses.find(
            (response) => response.questionId === representedByFirmQuestionId
        );

        if (representedByFirmResponse && representedByFirmResponse.response.toLowerCase() === 'yes') {
            return sendSuccessResponse(res, {}, 'Thank you for your response. No issues detected.', 201);
        }

        next();
    } catch (error) {

        res.status(500).json({ message: 'An error occurred during the representation check.' });
    }
};

module.exports = { checkRepresentation }