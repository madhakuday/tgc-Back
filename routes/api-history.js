const express = require('express');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const router = express.Router();
const vendorApiLeadHistorySchema = require('../models/vendor-api-lead.model');
const { default: mongoose } = require('mongoose');

router.get(
    '/',
    asyncHandler(async (req, res) => {
        try {

            const { page = 1, limit = 10, campId = '', userId = '' } = req.query;
            const limitNum = parseInt(limit, 10);

            const pageNum = Math.max(1, parseInt(page, 10));
            const skip = (pageNum - 1) * limitNum;

            let searchQuery = {};

            if (campId && mongoose.isValidObjectId(campId)) {
                searchQuery.campaignId = campId;
            }
            if (userId && mongoose.isValidObjectId(userId)) {
                searchQuery.userId = userId;
            }

            const totalData = await vendorApiLeadHistorySchema.countDocuments(searchQuery);

            const data = await vendorApiLeadHistorySchema.find(searchQuery)
                .populate('userId')
                .populate('campaignId')
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 });

            const response = {
                totalData,
                totalPages: Math.ceil(totalData / limitNum),
                currentPage: pageNum,
                data
            }

            return sendSuccessResponse(res, response, 'Data retrieved successfully', 200);
        } catch (error) {
            return sendErrorResponse(res, error.message, 500);
        }
    })
);

router.get('/users', asyncHandler(async (req, res) => {
    try {
        const users = await vendorApiLeadHistorySchema.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData' // Unwind the array if you're sure it always contains one document
            },
            {
                $group: {
                    _id: "$userId",
                    name: { $first: "$userData.name" } // Access the userName from userData
                }
            },
            {
                $project: {
                    value: "$_id",
                    label: "$name"
                }
            },
            {
                $sort: { label: 1 }
            }
        ]);

        return sendSuccessResponse(res, users, 'Users retrieved successfully', 200);
    } catch (error) {
        return sendErrorResponse(res, error.message, 500);
    }
}));

router.get('/campaigns', asyncHandler(async (req, res) => {
    try {
        const campaigns = await vendorApiLeadHistorySchema.aggregate([
            {
                $lookup: {
                    from: 'campaigns', // This should be the name of the collection MongoDB uses
                    localField: 'campaignId',
                    foreignField: '_id',
                    as: 'campaignData'
                }
            },
            {
                $unwind: {
                    path: "$campaignData",
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $group: {
                    _id: "$campaignData._id", // Ensure this points to campaignData._id
                    name: { $first: "$campaignData.title" } // Ensure this matches the field in the Campaign document
                }
            },
            {
                $project: {
                    value: "$_id",
                    label: "$name"
                }
            },
            {
                $sort: { label: 1 } // Sort by the campaign name
            }
        ]);

        return sendSuccessResponse(res, campaigns, 'Campaigns retrieved successfully', 200);
    } catch (error) {
        console.error('Error retrieving campaigns:', error);
        return sendErrorResponse(res, error.message, 500);
    }
}));

module.exports = router;
