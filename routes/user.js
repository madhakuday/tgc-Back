const express = require('express');
const bcrypt = require('bcryptjs');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const User = require('../models/user.model');
const Lead = require('../models/lead.model');
const asyncHandler = require('../middlewares/asyncHandler');
const moment = require('moment');
const { questionIdMap, onlyAdminStatus } = require('../utils/constant');
const { default: mongoose } = require('mongoose');
const router = express.Router();

router.get(
  '/getClients',
  asyncHandler(async (req, res) => {

    const userType = req.user.userType;
    const userId = req.user.id; // Current user's ID

    let searchQuery = {
      userType: "client",
      isActive: true,
      "configuration.path": { $ne: "" },
      "configuration.method": { $ne: "" },
    };

    if (userType === 'subAdmin') {
      const currentUser = await User.findById(userId).select('AssignedClientsIds');

      if (!currentUser) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      const assignedClientIds = currentUser.AssignedClientsIds || [];

      if (assignedClientIds.length === 0) {
        return sendSuccessResponse(res, { clients: [] }, 'No assigned clients found', 200);
      }

      searchQuery._id = { $in: assignedClientIds };
    }

    const clients = await User.find(searchQuery);

    if (!clients.length) {
      return sendErrorResponse(res, 'No clients with configuration found', 404);
    }

    return sendSuccessResponse(res, { clients }, 'Clients retrieved successfully', 200);
  })
);

router.post(
  '/getClientConfiguration',
  asyncHandler(async (req, res) => {
    const { clientId, leadId } = req.body;

    const client = await User.findById(clientId);
    if (!client || client.userType !== 'client') {
      return sendErrorResponse(res, 'Client not found or invalid client type', 404);
    }

    const lead = await Lead.findOne({ leadId }).populate('responses.questionId');
    if (!lead) {
      return sendErrorResponse(res, 'Lead not found', 404);
    }

    const updatedRequestBody = client?.configuration?.requestBody?.map((configQuestion) => {
      const responseObj = lead.responses.find(
        (response) =>
          response.questionId && response.questionId._id.toString() === configQuestion.question_id
      );

      let formattedResponse = responseObj ? responseObj.response : null;

      if (configQuestion?.date_format) {
        const date = moment(new Date(responseObj.response));
        formattedResponse = date.isValid() ? date.format(configQuestion.date_format) : formattedResponse;
      }

      return {
        ...configQuestion,
        response: configQuestion?.default ? configQuestion.default : formattedResponse,
      };
    });



    return sendSuccessResponse(
      res,
      { clientId: client._id, configuration: { ...client.configuration, requestBody: updatedRequestBody } },
      'Client configuration with responses retrieved successfully',
      200
    );
  })
);

router.put(
  '/updateClient/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findById(id);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    if (user.userType !== 'client') {
      return sendErrorResponse(res, 'Only client data can be updated with this API', 403);
    }

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    return sendSuccessResponse(res, { user: updatedUser }, 'User updated successfully', 200);
  })
);

// Other API START
router.get('/getUserList', asyncHandler(async (req, res) => {
  const userType = req.query.userType

  const result = await User.find({
    userType: userType,
    isActive: true,
  })

  const data = result.map((d) => ({
    label: d.name,
    value: d?.id
  }))

  return sendSuccessResponse(res, data, 'Users retrieved successfully', 201);
}))
// Other API END

// sub-admin API START
router.get('/subAdmin',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, campId = '', id, assigned, role } = req.query;

    const userId = req.user.id;
    const userRole = req.user.userType;

    if (userRole !== 'subAdmin') {
      return sendErrorResponse(res, 'You are not authorized to access this service....')
    }
    const limitNum = parseInt(limit, 10);
    const pageNum = Math.max(1, parseInt(page, 10));
    const skip = (pageNum - 1) * limitNum;

    let searchQuery = { isActive: true };

    if (status) searchQuery.status = new mongoose.Types.ObjectId(status);

    if (id) searchQuery.userId = id;

    if (campId) searchQuery.campaignId = campId;

    if (role) {
      const usersWithRole = await User.find({ userType: role }).select('_id');
      const userIds = usersWithRole.map(user => user._id);
      searchQuery.userId = { $in: userIds };
    }

    if (userRole === 'subAdmin' && !id) {
      const currentUser = await User.findById(userId).select('AssignedVendorIds');
      if (!currentUser) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      const assignedVendorIds = currentUser.AssignedVendorIds || [];
      if (assignedVendorIds.length === 0) {
        return sendSuccessResponse(res, { leads: [], totalLeads: 0 }, 'No assigned vendors found', 200);
      }

      // Modify query to filter by assigned vendor IDs
      searchQuery.userId = { $in: assignedVendorIds };
    }

    // Specific handling for 'staff' with verifier role
    if (userRole === 'staff' && req?.user?.role.includes('verifier') && assigned === 'true') {
      searchQuery = {
        isActive: true,
        verifier: userId,
        status: { $nin: onlyAdminStatus },
      };

      if (status) {
        searchQuery.status = { ...searchQuery.status, $eq: status };
      }
    }

    // Count total leads
    const totalLeads = await Lead.countDocuments(searchQuery);

    // Fetch leads with pagination and sorting
    const leads = await Lead.find(searchQuery)
      .populate('userId', 'name email userType')
      .populate('campaignId', 'title isActive userType')
      .populate('status', 'name value isActive')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    // Prepare the response
    const response = {
      totalLeads,
      totalPages: Math.ceil(totalLeads / limitNum),
      currentPage: pageNum,
      leads: leads.map(lead => {
        const specificResponses = lead.responses
          .filter(response => questionIdMap[response.questionId.toString()])
          .map(response => ({
            question: questionIdMap[response.questionId.toString()],
            answer: response.response,
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
            userType: lead.userId.userType,
          },
          status: lead.status,
          createdAt: lead.createdAt,
        };
      }),
    };

    return sendSuccessResponse(res, response, 'Leads fetched successfully', 200);
  })
);

router.post('/subAdmin/create', asyncHandler(async (req, res) => {
  try {
    const { name, email, password, userType, clientIds = [], vendorIds = [] } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return sendErrorResponse(res, 'User already exists', 400);
    }

    const body = {
      name,
      email,
      password,
      userType,
      AssignedClientsIds: clientIds,
      AssignedVendorIds: vendorIds
    }
    user = new User(body);
    await user.save();

    return sendSuccessResponse(res, {}, 'User registered successfully', 201);
  } catch (error) {
    return sendErrorResponse(res, error?.message || 'Something went wrong', 400)
  }
}))
// sub-admin API END

module.exports = router;
