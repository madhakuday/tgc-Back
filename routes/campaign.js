const express = require('express');
const Campaign = require('../models/campaign.model');
const mongoose = require('mongoose'); // Ensure this is imported if not already
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const User = require('../models/user.model');
const Lead = require('../models/lead.model');
const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, questions = [] } = req.body;

    const questionObjects = questions.map((q) => ({
      questionId: q.questionId,
      isRequired: q.isRequired,
    }));

    const campaign = new Campaign({ title, questions: questionObjects });
    try {
      await campaign.save();

      return sendSuccessResponse(res, campaign, 'Campaign created successfully', 201);
    } catch (error) {
      sendErrorResponse(res, error?.message)
    }
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const limitNum = parseInt(limit, 10);
    const pageNum = Math.max(1, parseInt(page, 10));
    const skip = (pageNum - 1) * limitNum;

    let searchQuery = { isActive: true };
    if (search) {
      searchQuery.title = { $regex: search, $options: 'i' };
    }

    const totalCampaigns = await Campaign.countDocuments(searchQuery);
    let campaigns;

    if (limitNum === -1) {
      campaigns = await Campaign.find(searchQuery);
    } else {
      const skip = (pageNum - 1) * limitNum;
      campaigns = await Campaign.find(searchQuery)
        .skip(skip)
        .limit(limitNum)
    }

    const response = {
      totalCampaigns,
      totalPages: Math.ceil(totalCampaigns / limitNum),
      currentPage: pageNum,
      campaigns,
    };

    return sendSuccessResponse(res, response, 'Campaigns fetched successfully', 200);
  })
);

router.get(
  '/getWithDetails',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Retrieve the user's assigned campaign IDs
    const user = await User.findById(userId);
    if (!user || !user.campIds || user.campIds.length === 0) {
      return sendSuccessResponse(res, { campaigns: [] }, 'No campaigns assigned to this user', 200);
    }

    // Find only the campaigns that match the assigned campaign IDs
    const campaigns = await Campaign.find({ _id: { $in: user.campIds }, isActive: true });

    const campaignsWithLeadCounts = await Promise.all(
      campaigns.map(async (campaign) => {
        // Count leads associated with this campaign and user
        const leadCount = await Lead.countDocuments({ campaignId: campaign._id, userId, isActive: true });
        return {
          campId: campaign.id,
          title: campaign.title,
          leadCount,
        };
      })
    );

    const response = {
      campaigns: campaignsWithLeadCounts,
    };

    return sendSuccessResponse(res, response, 'Campaigns fetched successfully', 200);
  })
);

router.get(
  '/getById',
  asyncHandler(async (req, res) => {
    const campIds = req?.user?.campIds || [];

    const objectIds = campIds?.map(id => new mongoose.Types.ObjectId(id));
    const campaigns = await Campaign.find({ _id: { $in: objectIds } });

    if (!campaigns || campaigns.length === 0) {
      return sendErrorResponse(res, 'No campaigns found', 404);
    }

    return sendSuccessResponse(res, campaigns, 'Campaigns fetched successfully', 200);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, questions = [] } = req.body;

    const questionObjects = questions.map((q) => ({
      questionId: q.questionId,
      isRequired: q.isRequired,
    }));

    const updateData = { title, questions: questionObjects };
    const campaign = await Campaign.findByIdAndUpdate(id, updateData, { new: true });

    if (!campaign) {
      return sendErrorResponse(res, 'Campaign not found', 404);
    }

    return sendSuccessResponse(res, campaign, 'Campaign updated successfully', 200);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return sendErrorResponse(res, 'Campaign not found', 404);
    }

    campaign.isActive = false;
    await campaign.save();

    return sendSuccessResponse(res, {}, 'Campaign deleted successfully', 200);
  })
);

module.exports = router;
