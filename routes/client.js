const express = require('express');
const axios = require('axios');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const User = require('../models/user.model');
const { logApiCall } = require('../controller/apiLogs')
const Lead = require('../models/lead.model');
const asyncHandler = require('../middlewares/asyncHandler');
const router = express.Router();

router.post(
  '/sendToClient',
  asyncHandler(async (req, res) => {
    const { clientId, leadId, configuration } = req.body;

    const client = await User.findById(clientId);
    if (!client || client.userType !== 'client') {
      return sendErrorResponse(res, 'Invalid client or user type', 403);
    }

    const { path, method, headers } = client.configuration;
    if (!path || !method) {
      return sendErrorResponse(res, 'Invalid client configuration', 400);
    }

    try {
      const filtered_obj =  configuration.requestBody.reduce((acc, item) => {
        acc[item.field_name] = item.response || "";
        return acc;
      }, {});

      const response = await axios({
        url: path,
        method: method.toLowerCase(),
        headers: headers || {},
        data: filtered_obj
      });

      const result = await logApiCall(clientId, leadId, filtered_obj, response?.data, response.status);

      if (result) {
        const existingLead = await Lead.findOne({ leadId, isActive: true });
        await Lead.findByIdAndUpdate(existingLead?.id, { clientId }, { new: true });
        return sendSuccessResponse(res, response.data, 'Request sent successfully', response.status);
      } else {
        throw new Error()
      }
    } catch (error) {
      const statusCode = error.response ? error.response.status : 500;
      const errorData = error.response ? error.response.data : { message: error.message };

      await logApiCall(clientId, leadId, configuration.requestBody, errorData, statusCode);
      return sendErrorResponse(res, errorData.message || 'Failed to reach client API', statusCode, errorData);
    }
  })
);

module.exports = router;
