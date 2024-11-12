
const mongoose = require('mongoose');
const { isValidObjectId } = mongoose;
const express = require('express');
const Lead = require('../models/lead.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const LeadHistory = require('../models/lead-history.model');
const { upload, generateFileUrl } = require('../utils/fileUploadHelper');
const { createLeadValidation, parseResponses } = require('../validators/leads')
const validate = require('../middlewares/validationMiddleware');
const ApiLogs = require('../models/api-logs.model');
const Question = require('../models/question.model');

const router = express.Router();

router.get('/',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, status, userType, id, assigned } = req.query;
        const limitNum = parseInt(limit, 10);
        const pageNum = Math.max(1, parseInt(page, 10));
        const skip = (pageNum - 1) * limitNum;

        const userId = req.user.id;

        let searchQuery = { isActive: true };

        if (status) {
            searchQuery.status = status;
        }

        if (id) {
            searchQuery.userId = id;
        }

        if (userType === 'vendor' || userType === 'staff') {
            if (!userId) {
                return sendErrorResponse(res, 'Vendor ID is required', 400);
            }
            searchQuery.userId = userId;
        }

        if (userType === 'staff' && req?.user?.role.includes('verifier') && assigned === 'true') {
            searchQuery = {
                isActive: true,
                verifier: userId
            };
            if (status) {
                searchQuery.status = status;
            }
            delete searchQuery.userId;
        }

        // if (assigned === 'true') {
        // searchQuery.verifier = userId;
        // }

        const totalLeads = await Lead.countDocuments(searchQuery);

        const leads = await Lead.find(searchQuery)
            .populate('userId', 'name email userType')
            .populate('campaignId', 'title isActive userType')
            .populate('clientId', 'name email')
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 });

        const response = {
            totalLeads,
            totalPages: Math.ceil(totalLeads / limitNum),
            currentPage: pageNum,
            leads: leads.map(lead => ({
                id: lead.id,
                verifier: lead?.verifier,
                responses: lead.responses,
                campaign: lead.campaignId,
                remark: lead.remark,
                leadId: lead.leadId,
                clientId: lead.clientId,
                createdBy: {
                    userId: lead.userId._id,
                    name: lead.userId.name,
                    email: lead.userId.email,
                    userType: lead.userId.userType
                },
                status: lead.status,
                createdAt: lead.createdAt,
            }))
        };

        return sendSuccessResponse(res, response, 'Leads fetched successfully', 200);
    })
);

router.get('/:leadId',
    asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const userType = req.query.userType;

        let searchQuery = { leadId: leadId, isActive: true };

        const excludeType = ['staff', 'client']

        if (excludeType.includes(userType)) {
            return sendErrorResponse(res, `${userType} is not authorized to access this service....`, 400);
        }

        const lead = await Lead.findOne(searchQuery).populate('userId', 'name email configuration userType').populate({
            path: 'responses.questionId',
            model: 'Question',
            select: 'title type'
        });

        const apiLogs = await ApiLogs.find({ leadId: leadId })
            .select('requestBody response responseStatusCode createdAt updatedAt');

        if (!lead) {
            return sendErrorResponse(res, 'Lead not found', 404);
        }

        const response = {
            id: lead.leadId,
            remark: lead.remark,
            media: lead.media,
            leadId: lead.leadId,
            responses: lead.responses.map(resp => ({
                questionId: resp.questionId._id,
                questionTitle: resp.questionId.title,
                questionType: resp.questionId.type,
                response: resp.response
            })),
            createdBy: {
                userId: lead.userId._id,
                name: lead.userId.name,
                email: lead.userId.email,
                userType: lead.userId.userType
            },
            status: lead.status,
            createdAt: lead.createdAt,
            apiLogs: apiLogs
        };

        return sendSuccessResponse(res, response, 'Lead fetched successfully', 200);
    })
);

router.get('/getAssignedLead/:leadId',
    asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const userId = req.user.id;
        const userType = req.user.userType

        if (userType !== 'staff') {
            return sendErrorResponse(res, `${userType} is not authorized to access this service`, 400);
        }
        let searchQuery = { leadId: leadId, isActive: true };

        const lead = await Lead.findOne(searchQuery)
            .populate('userId', 'name email')
            .populate({
                path: 'responses.questionId',
                model: 'Question',
                select: 'title type'
            });

        if (!lead) {
            return sendErrorResponse(res, 'Lead not found', 404);
        }

        const response = {
            id: lead.leadId,
            responses: lead.responses.map(resp => ({
                questionId: resp.questionId._id,
                questionTitle: resp.questionId.title,
                questionType: resp.questionId.type,
                response: resp.response
            })),
            remark: lead.remark,
            leadId: lead.leadId,
            createdBy: {
                userId: lead.userId._id,
                name: lead.userId.name,
                email: lead.userId.email
            },
            status: lead.status,
            createdAt: lead.createdAt,
        };

        return sendSuccessResponse(res, response, 'Lead fetched successfully', 200);
    })
);

router.post('/',
    upload.fields([{ name: 'media', maxCount: 2 }]),
    parseResponses,
    validate(createLeadValidation),
    asyncHandler(async (req, res) => {
        try {
            const { responses, campaignId } = req.body;
            const userId = req.user.id;

            const [emailQuestion, phoneQuestion] = await Promise.all([
                Question.findOne({ fixedId: 'email' }),
                Question.findOne({ fixedId: 'contact_number' })
            ]);

            const emailQuestionId = emailQuestion ? emailQuestion._id.toString() : null;
            const phoneQuestionId = phoneQuestion ? phoneQuestion._id.toString() : null;

            const emailResponse = responses.find(response => response.questionId === emailQuestionId);
            const phoneResponse = responses.find(response => response.questionId === phoneQuestionId);

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailResponse && !emailRegex.test(emailResponse.response)) {
                return sendErrorResponse(res, 'Invalid email format', 400);
            }

            const existingLead = await Lead.findOne({
                $or: [
                    { 'responses.response': emailResponse?.response, 'responses.questionId': emailQuestionId },
                    { 'responses.response': phoneResponse?.response, 'responses.questionId': phoneQuestionId }
                ]
            });

            if (existingLead) {
                return sendErrorResponse(res, 'A lead with the same email or phone number already exists.', 400);
            }

            const lastLead = await Lead.findOne().sort({ leadId: -1 });
            const lastLeadNumber = lastLead ? parseInt(lastLead.leadId.split('-')[1]) : 0;
            const newLeadNumber = lastLeadNumber + 1;
            const leadId = `lead-${newLeadNumber}`;

            // Prepare media files
            const media = req.files.media ? req.files.media.map(file => ({
                type: file.mimetype.includes('application') ? 'doc' : 'recording',
                url: generateFileUrl(file),
            })) : [];

            const leadData = {
                leadId,
                userId,
                responses,
                campaignId,
                media,
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

router.put('/:leadId',
    asyncHandler(async (req, res) => {
        try {
            const { leadId } = req.params;
            const { status, remark, isActive, verifier } = req.body;

            let parsedResponses = [];
            if (req.body.responses) {
                try {
                    parsedResponses = req.body.responses.map((r) => JSON.parse(r));
                } catch (err) {
                    return res.status(400).json({ message: 'Invalid responses format' });
                }
            }

            const existingLead = await Lead.findOne({ leadId, isActive: true });
            if (!existingLead) {
                return res.status(404).json({ message: 'Lead not found' });
            }

            const updateFields = {
                ...(parsedResponses.length && { responses: parsedResponses }),
                ...(status && { status }),
                ...(remark && { remark }),
                ...(verifier && { verifier }),
                ...(isActive !== undefined && { isActive }),
            };

            const updatedLead = await Lead.findOneAndUpdate(
                { leadId, isActive: true },
                { $set: updateFields },
                { new: true, runValidators: true }
            );

            if (!updatedLead) {
                return res.status(400).json({ message: 'Failed to update lead' });
            }

            // Log history
            const historyData = {
                leadId,
                updatedBy: req.user.id,
                updateType: status ? 'statusChange' : 'dataUpdate',
                note: status
                    ? `Status changed from ${existingLead.status} to ${status}`
                    : 'Data updated',
                previousStatus: existingLead.status,
                currentStatus: status || existingLead.status,
            };

            await LeadHistory.create(historyData);

            return res.status(200).json({ success: true, data: updatedLead });
        } catch (error) {
            return res.status(500).json({ message: 'Something went wrong' });
        }
    })
);

router.delete('/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return sendErrorResponse(res, 'Invalid ID format', 400);
        }

        const lead = await Lead.findByIdAndUpdate(id, { isActive: false }, { new: true });

        if (!lead) {
            return sendErrorResponse(res, 'Lead not found', 404);
        }

        return sendSuccessResponse(res, lead, 'Lead deleted successfully', 200);
    })
);

module.exports = router;
