
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
const { onlyAdminStatus, questionIdMap } = require('../utils/constant');
const User = require('../models/user.model');
const { validateLeadData } = require('../utils/leadValidator');
const { buildDateRange } = require('../controller/dashboard');

const router = express.Router();

router.get('/',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, status, userType, campId = '', id = '', assigned, role, timeframe = '', startDate, endDate } = req.query;

        const limitNum = parseInt(limit, 10);
        const pageNum = Math.max(1, parseInt(page, 10));
        const skip = (pageNum - 1) * limitNum;

        const userId = req.user.id;

        let searchQuery = { isActive: true };

        if (status) {
            if (status === 'pending') {
                searchQuery.status = { $in: ["under_verification", "submitted_to_attorney"] };
            } else {
                searchQuery.status = status;
            }
        }

        if (timeframe) {
            const dateRange = buildDateRange(timeframe, startDate, endDate);
            searchQuery.createdAt = dateRange
        }

        if (id) {
            searchQuery.userId = id;
        }

        if (campId) {
            searchQuery.campaignId = campId;
        }

        if (role && !id) {
            const usersWithRole = await User.find({ userType: role }).select('_id');
            const userIds = usersWithRole.map(user => user._id);
            searchQuery.userId = { $in: userIds };
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
                verifier: userId,
                status: { $nin: onlyAdminStatus }
            };
            if (status) {
                searchQuery.status = { ...searchQuery.status, $eq: status };
            }
            delete searchQuery.userId;
        }
        console.log(searchQuery);

        const totalLeads = await Lead.countDocuments(searchQuery);

        const leads = await Lead.find(searchQuery)
            .populate('userId', 'name email userType')
            .populate('campaignId', 'title isActive userType')
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 });

        const response = {
            totalLeads,
            totalPages: Math.ceil(totalLeads / limitNum),
            currentPage: pageNum,
            leads: leads.map(lead => {
                const specificResponses = lead.responses
                    .filter(response => questionIdMap[response.questionId.toString()])
                    .map(response => ({
                        question: questionIdMap[response.questionId.toString()],
                        answer: response.response
                    }));

                return {
                    id: lead.id,
                    verifier: lead?.verifier,
                    responses: specificResponses,
                    campaign: lead.campaignId,
                    remark: lead.remark,
                    leadId: lead.leadId,
                    clientId: lead.clientId,
                    createdBy: {
                        userId: lead?.userId?._id,
                        name: lead?.userId?.name,
                        email: lead?.userId?.email,
                        userType: lead?.userId?.userType
                    },
                    status: lead.status,
                    createdAt: lead.createdAt,
                };
            })
        };

        return sendSuccessResponse(res, response, 'Leads fetched successfully', 200);
    })
);

router.get('/getAllLeads',
    asyncHandler(async (req, res) => {
        const userType = req.user.userType;
        const userId = req.user.id;
        let searchQuery = { isActive: true };

        if (userType === 'admin') {
        } else if (userType === 'vendor') {
            searchQuery.userId = userId;
        } else if (userType === 'staff') {
            searchQuery.verifier = userId;
        } else if (userType === 'subAdmin') {
            const subAdmin = await User.findById(userId).select('AssignedVendorIds');
            if (!subAdmin) {
                return sendErrorResponse(res, 'Unauthorized access', 403);
            }
            if (subAdmin.AssignedVendorIds.length > 0) {
                searchQuery.userId = { $in: subAdmin.AssignedVendorIds };
            } else {
                return sendErrorResponse(res, 'No assigned vendors found', 403);
            }
        } else {
            return sendErrorResponse(res, 'Unauthorized access', 403);
        }

        const leads = await Lead.find(searchQuery)
            .populate('userId', 'name email userType')
            .populate('campaignId', 'title isActive userType')
            .sort({ createdAt: -1 });

        const response = {
            leads: leads.map(lead => {
                const specificResponses = lead.responses
                    .filter(response => questionIdMap[response.questionId.toString()])
                    .map(response => ({
                        question: questionIdMap[response.questionId.toString()],
                        answer: response.response
                    }));

                return {
                    id: lead.id,
                    verifier: lead?.verifier,
                    responses: specificResponses,
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
                };
            })
        };

        // Return success response
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

        const lead = await Lead.findOne(searchQuery)
            .populate('userId', 'name email configuration userType')
            .populate({
                path: 'responses.questionId',
                model: 'Question',
                select: 'title type'
            });

        if (!lead) {
            return sendErrorResponse(res, 'Lead not found', 404);
        }

        const apiLogs = await ApiLogs.find({ leadId: leadId })
            .select('requestBody response responseStatusCode createdAt updatedAt');

        const leadHistory = await LeadHistory.find({ leadId: leadId })
            .populate('updatedBy', 'name email userType')
            .populate('sentTo', 'name email')
            .select('previousStatus currentStatus updatedBy updateType note createdAt sentTo changedBySupAdmin');

        const lastClientId = lead?.clientId?.slice(-1)[0];
        let lastClientData = null;

        if (lastClientId) {
            lastClientData = await User.findById(lastClientId).select('name email');
        }

        const response = {
            id: lead.leadId,
            remark: lead.remark,
            media: lead.media,
            leadId: lead.leadId,
            responses: lead?.responses?.map(resp => ({
                questionId: resp?.questionId?._id,
                questionTitle: resp.questionId?.title,
                questionType: resp.questionId?.type,
                response: resp?.response
            })),
            createdBy: {
                userId: lead?.userId?._id,
                name: lead?.userId?.name,
                email: lead?.userId?.email,
                userType: lead?.userId?.userType
            },
            status: lead.status,
            createdAt: lead.createdAt,
            apiLogs: apiLogs,
            timeZone: lead.timeZone,
            leadOutTime: lead.leadOutTime || '',
            lastClient: lastClientData ? {
                clientId: lastClientId,
                name: lastClientData.name,
                email: lastClientData.email
            } : null,
            leadHistory: leadHistory.map(history => ({
                previousStatus: history.previousStatus,
                currentStatus: history.currentStatus,
                updatedBy: history.updatedBy ? {
                    userId: history.updatedBy._id,
                    name: history.updatedBy.name,
                    email: history.updatedBy.email,
                    userType: history.updatedBy.userType
                } : null,
                updateType: history.updateType,
                note: history.note,
                createdAt: history.createdAt,
                sentTo: history.sentTo ? {
                    userId: history.sentTo._id,
                    name: history.sentTo.name,
                    email: history.sentTo.email
                } : null,
                changedBySupAdmin: history.changedBySupAdmin
            }))
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
            const { responses, campaignId, timeZone } = req.body;
            const userId = req.user.id;

            // Validate lead data
            const { noIssues } = await validateLeadData(responses);

            if (noIssues) {
                return sendSuccessResponse(res, {}, 'Thank you for your response. No issues detected.', 201);
            }

            let lastLeadNumber = 0;
            let newLeadNumber;
            let leadId;

            const lastLead = await Lead.findOne().sort({ createdAt: -1 });
            if (lastLead) {
                lastLeadNumber = parseInt(lastLead.leadId.split('-')[1]);
            }

            do {
                newLeadNumber = lastLeadNumber + 1;
                leadId = `lead-${newLeadNumber}`;

                const existingLead = await Lead.findOne({ leadId });

                if (existingLead) {
                    lastLeadNumber = newLeadNumber;
                } else {
                    break;
                }
            } while (true);


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
                timeZone
            };

            const lead = new Lead(leadData);
            const savedLead = await lead.save();

            return sendSuccessResponse(res, savedLead, 'Lead created successfully', 201);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    })
);

router.put('/:leadId',
    upload.fields([{ name: 'media', maxCount: 2 }]),
    parseResponses,
    asyncHandler(async (req, res) => {
        try {
            const { leadId } = req.params;
            const { status, remark, isActive, verifier, responses, clientId } = req.body;

            const existingLead = await Lead.findOne({ leadId, isActive: true });
            if (!existingLead) {
                return res.status(404).json({ message: 'Lead not found' });
            }

            let validatedResponses = [];
            if (responses) {
                try {
                    validatedResponses = responses.filter(r => r.response && r.questionId);
                } catch (validationError) {
                    return res.status(400).json({ message: 'Invalid responses format' });
                }

                if (validatedResponses.length !== responses.length) {
                    return res.status(400).json({
                        message: 'Some responses are invalid or incomplete',
                        invalidResponses: responses.filter(r => !r.response || !r.questionId)
                    });
                }
            }

            const updateFields = {
                ...(validatedResponses.length > 0 && { responses: validatedResponses }),
                ...(status && { status }),
                ...(remark && { remark }),
                ...(verifier && { verifier }),
                ...(isActive !== undefined && { isActive }),
                ...(status === 'submitted_to_attorney' && { leadOutTime: new Date() })
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
                ...(status === 'submitted_to_attorney' && { sentTo: clientId }),
                changedBySupAdmin: req.user.userType === 'subAdmin'
            };

            await LeadHistory.create(historyData);

            return sendSuccessResponse(res, updatedLead, 'Lead updated successfully', 200);
        } catch (error) {
            return sendErrorResponse(res, 'Something went wrong!', 400);
        }
    })
);

router.delete('/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userType = req.user.userType

        const allowdUser = ['admin', 'subAdmin']
        if (!allowdUser.includes(userType)) {
            return sendErrorResponse(res, `${userType} is not authorized to access this service....`, 400);
        }
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
