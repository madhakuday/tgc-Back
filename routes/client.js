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

    const { path, method } = client.configuration;
    if (!path || !method) {
      return sendErrorResponse(res, 'Invalid client configuration', 400);
    }

    try {
      const response = await axios({
        url: path,
        method: method.toLowerCase(),
        data: { statusFlag: "SUCCESS", requestBody: configuration.requestBody }
      });

      const result = await logApiCall(clientId, leadId, configuration.requestBody, response.data, response.status);

      if (result) {

        console.log('result', result)
        const existingLead = await Lead.findOne({ leadId, isActive: true });
        console.log('existingLead', existingLead)

        const lead = await Lead.findByIdAndUpdate(existingLead.id, { clientId }, { new: true });
        console.log('lead', lead);

        return sendSuccessResponse(res, response.data, 'Request sent and logged successfully', response.status);
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
