// This file is for vendor lead creation with API ONLY.
const express = require('express');
const jwt = require('jsonwebtoken');
const Lead = require('../models/lead.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const { validateLeadData } = require('../utils/leadValidator');
const VendorApiLeadHistory = require('../models/vendor-api-lead.model');

const router = express.Router();

const vendorAuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const historyEntry = new VendorApiLeadHistory({
        callerId: '',
        accessToken: token || 'No access token provided',
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        requestBody: req.body,
        response: {},
        error: '',
        responseStatus: null,
        campaignId: ''
    });

    if (!token) {
        historyEntry.error = JSON.stringify({
            success: false,
            message: 'Authorization token missing',
            errors: '',
        })
        historyEntry.responseStatus = 401
        await historyEntry.save();
        return sendErrorResponse(res, 'Authorization token missing', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        console.log('Decoded Token:', decoded);
        req.userId = decoded.userId;
        req.campId = decoded.campId ? new mongoose.Types.ObjectId(decoded.campId) : null; // Convert to ObjectId
        historyEntry.callerId = decoded.userId;
        next();
    } catch (error) {
        console.log('Error in validation', error);
        
        historyEntry.error = JSON.stringify(error)
        historyEntry.responseStatus = 401
        await historyEntry.save();
        return sendErrorResponse(res, 'Invalid authorization token', 401);
    }
};

// Stage
// const defaultData = [
//     { key: "contact_number", q_id: "67211e35066e168369880d7c" }, // 1 -
//     { key: "email", q_id: "67211e35066e168369880d7b" }, // 2 -
//     { key: "dob", q_id: "6729a5db127c4b270ff85bd7" }, // 3 -
//     { key: "address", q_id: "6729a559127c4b270ff85bc5" }, // 4 -
//     { key: "first_name", q_id: "67211e35066e168369880d79" }, // 5 -
//     { key: "last_name", q_id: "67211e35066e168369880d7a" }, // 6
//     { key: "ip_address", q_id: "67211e35066e168369880d7e" }, // 7
//     { key: "lp_url", q_id: "673299bd7309a506a7db0fbd" }, // 8 -
//     { key: "represented_by_attorney", q_id: "6729a906127c4b270ff85cc4" }, // 9 -
//     { key: "summary", q_id: "6734b8e33e68b1eaf89adf88" }, // 10 -
//     { key: "year_of_diagnosed", q_id: "6729b595127c4b270ff8648d" }, // 11 -
//     { key: "injury", q_id: "6734b9113e68b1eaf89adf95" }, // 12 -
//     { key: "straightener_used", q_id: "6734b92f3e68b1eaf89adf9f" }, // 13 -
//     { key: "trusted_form_certificate", q_id: "67211e35066e168369880d82" }, // 14 -
//     { key: "zip_code", q_id: "67211e35066e168369880d7d" }, // 15 -
//     // ----
//     { key: "product_name", q_id: "67612325835eef54fc482c71" }, // 16 -
//     { key: "use_product", q_id: "673299e17309a506a7db0fd9" }, // 17 -
//     { key: "diagnosed", q_id: "6729aeab127c4b270ff86112" }, // 18 -
// ];

// LIVE
const defaultData = [
    { key: "contact_number", q_id: "67211e35066e168369880d7c" }, // 1
    { key: "email", q_id: "67211e35066e168369880d7b" }, // 2
    { key: "dob", q_id: "6729a5db127c4b270ff85bd7" }, // 3
    { key: "address", q_id: "6729a559127c4b270ff85bc5" }, // 4
    { key: "first_name", q_id: "67211e35066e168369880d79" }, // 5
    { key: "last_name", q_id: "67211e35066e168369880d7a" }, // 6
    { key: "ip_address", q_id: "67211e35066e168369880d7e" }, // 8
    { key: "lp_url", q_id: "673299bd7309a506a7db0fbd" }, // 9
    { key: "represented_by_attorney", q_id: "6729a906127c4b270ff85cc4" }, // 10
    { key: "summary", q_id: "6733f279d1d333e7171e2c79" }, // 11
    { key: "year_of_diagnosed", q_id: "6729b595127c4b270ff8648d" }, // 12
    { key: "injury", q_id: "6729aeab127c4b270ff86112" }, // 13
    { key: "straightener_used", q_id: "6733f2cfd1d333e7171e2c9c" }, // 14
    { key: "trusted_form_certificate", q_id: "67211e35066e168369880d82" }, // 15
    { key: "zip_code", q_id: "67211e35066e168369880d7d" }, // 16
    // ----
    { key: "product_name", q_id: "673be5f3f5891ed2fe4a1b31" }, // 17 -
    { key: "use_product", q_id: "673299e17309a506a7db0fd9" }, // 18 -
    { key: "diagnosed", q_id: "673be64df5891ed2fe4a1b56" }, // 18 -
];

router.post(
    '/lead-by-api',
    vendorAuthMiddleware,
    asyncHandler(async (req, res) => {
        console.log('req', req?.userId, req?.campId);
        
        const historyEntry = {
            userId: req.userId,
            campaignId: req?.campId || '',
            accessToken: req.headers.authorization?.split(' ')[1] || null,
            requestBody: req.body,
            responseStatus: null,
            response: {},
            error: null,
            host: req.headers.host,
            userAgent: req.headers['user-agent'],
            origin: req.headers.origin,
        };
        console.log('historyEntry', historyEntry);

        if (typeof req.body !== 'object' || Array.isArray(req.body) || req.body === null) {
            historyEntry.responseStatus = 400;
            historyEntry.error = {
                success: false,
                message: 'Invalid request body. Expected a JSON object.',
                errors: [],
            };
            await new VendorApiLeadHistory(historyEntry).save();
            return sendErrorResponse(res, 'Invalid request body. Expected a JSON object.', 400);
        }

        try {
            const userId = req.userId;
            const campId = req.campId;
            const requestData = req?.body?.data;

            if (!req?.body?.data) {
                historyEntry.responseStatus = 404;
                historyEntry.error = {
                    success: false,
                    message: 'Please provide data',
                    errors: [],
                };
                await new VendorApiLeadHistory(historyEntry).save();
                return sendErrorResponse(res, 'Please provide data', 404);
            }

            if (!campId) {
                historyEntry.responseStatus = 404;
                historyEntry.error = {
                    success: false,
                    message: 'Camp id not provided',
                    errors: [],
                };
                await new VendorApiLeadHistory(historyEntry).save();
                return sendErrorResponse(res, 'Camp id not provided', 404);
            }

            const dataMap = Object.fromEntries(defaultData?.map(item => [item.key, item.q_id]));

            const transformedResponses = requestData?.map(item => {
                const questionId = dataMap[item.key];
                return questionId ? { questionId, response: item.value } : null;
            }).filter(response => response !== null);

            // Validate lead data
            const { noIssues } = await validateLeadData(transformedResponses);

            if (noIssues) {
                historyEntry.responseStatus = 201;
                historyEntry.response = {};
                await new VendorApiLeadHistory(historyEntry).save();
                return sendSuccessResponse(res, {}, 'Thank you for your response. No issues detected.', 201);
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

            historyEntry.responseStatus = 201;
            historyEntry.response = savedLead;
            await new VendorApiLeadHistory(historyEntry).save();
            return sendSuccessResponse(res, savedLead, 'Lead created successfully', 201);
        } catch (error) {
            console.log('error ->', error);
            
            historyEntry.responseStatus = 400;
            historyEntry.error = JSON.stringify({
                success: false,
                message: error?.message || 'Something went wrong',
                errors: [],
            })

            await new VendorApiLeadHistory(historyEntry).save();
            return sendErrorResponse(res, error.message, 400);
        }
    })
);

module.exports = router;

