// This file is for vendor lead creation with API ONLY.

const express = require('express');
const jwt = require('jsonwebtoken');
const Lead = require('../models/lead.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');

const router = express.Router();

const vendorAuthMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return sendErrorResponse(res, 'Authorization token missing', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.userId = decoded.userId;
        req.campId = decoded.campId;
        next();
    } catch (error) {
        return sendErrorResponse(res, 'Invalid authorization token', 401);
    }
};

const defaultData = [
    { key: "contact_number", q_id: "67211e35066e168369880d7c" },
    { key: "email", q_id: "67211e35066e168369880d7b" },
    { key: "dob", q_id: "6729a5db127c4b270ff85bd7" },
    { key: "address", q_id: "6729a559127c4b270ff85bc5" },
    { key: "first_name", q_id: "67211e35066e168369880d79" },
    { key: "last_name", q_id: "67211e35066e168369880d7a" },
    { key: "ip_address", q_id: "67211e35066e168369880d7e" },
    { key: "lp_url", q_id: "6734b89a3e68b1eaf89adf78" },
    { key: "represented_by_attorney", q_id: "6729a906127c4b270ff85cc4" },
    { key: "summary", q_id: "6734b8e33e68b1eaf89adf88" },
    { key: "year_of_diagnosed", q_id: "6729b595127c4b270ff8648d" },
    { key: "injury", q_id: "6734b9113e68b1eaf89adf95" },
    { key: "straightener_used", q_id: "6734b92f3e68b1eaf89adf9f" },
    { key: "trusted_form_certificate", q_id: "67211e35066e168369880d82" }
];

router.post(
    '/lead-by-api',
    vendorAuthMiddleware,
    asyncHandler(async (req, res) => {
        try {
            const userId = req.userId;
            const campId = req.campId;
            const requestData = req.body.data;

            if (!campId) {
                return sendErrorResponse(res, 'Camp id not provided', 404);
            }

            const dataMap = Object.fromEntries(defaultData.map(item => [item.key, item.q_id]));

            const transformedResponses = requestData.map(item => {
                const questionId = dataMap[item.key];
                return questionId ? { questionId, response: item.value } : null;
            }).filter(response => response !== null);

            const emailResponse = transformedResponses.find(
                response => response.questionId === dataMap['email']
            );
            const phoneResponse = transformedResponses.find(
                response => response.questionId === dataMap['contact_number']
            );

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailResponse && !emailRegex.test(emailResponse.response)) {
                return sendErrorResponse(res, 'Invalid email format', 400);
            }

            const existingLead = await Lead.findOne({
                $or: [
                    { 'responses.response': emailResponse?.response, 'responses.questionId': dataMap['email'] },
                    { 'responses.response': phoneResponse?.response, 'responses.questionId': dataMap['contact_number'] }
                ]
            });

            if (existingLead) {
                return sendErrorResponse(res, 'A lead with the same email or phone number already exists.', 400);
            }

            let lastLeadNumber = 0;
            const lastLead = await Lead.findOne().sort({ createdAt: -1 });
            if (lastLead) {
                lastLeadNumber = parseInt(lastLead.leadId.split('-')[1]);
            }

            let newLeadNumber = lastLeadNumber + 1;
            const leadId = `lead-${newLeadNumber}`;

            const leadData = {
                leadId,
                userId,
                campaignId: campId,
                responses: transformedResponses,
                generated_by_api: true,
            };

            const lead = new Lead(leadData);
            const savedLead = await lead.save();

            return sendSuccessResponse(res, savedLead, 'Lead created successfully', 201);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: error.message });
        }
    })
);

module.exports = router;
