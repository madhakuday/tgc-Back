const express = require('express');
const bcrypt = require('bcryptjs');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const User = require('../models/user.model');
const Lead = require('../models/lead.model');
const asyncHandler = require('../middlewares/asyncHandler');
const moment = require('moment');
const router = express.Router();

router.get(
  '/getClients',
  asyncHandler(async (req, res) => {
    const clients = await User.find({
      userType: "client",
      isActive: true,
      "configuration.path": { $ne: "" },
      "configuration.method": { $ne: "" }
    });

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

module.exports = router;
