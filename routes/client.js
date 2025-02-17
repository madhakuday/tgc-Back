const express = require('express');
const axios = require('axios');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const User = require('../models/user.model');
const { logApiCall } = require('../controller/apiLogs')
const Lead = require('../models/lead.model');
const asyncHandler = require('../middlewares/asyncHandler');
const StatusModel = require('../models/status.model');
const router = express.Router();

const getApiData = (data, headers) => {
  const contentType = headers['Content-Type'] || headers['content-type'] || 'application/json'
  let body = {};
  const filteredHeaders = { ...headers };

  switch (contentType) {
    case 'application/json':
      body = data
      break;
    case 'application/x-www-form-urlencoded;charset=UTF-8':
      body = new URLSearchParams(data).toString();
      break;
    case 'application/x-www-form-urlencoded':
      body = new URLSearchParams(data).toString();
      break;
    default:
      throw new Error(`Unsupported Content-Type: ${contentType}`);
  }

  return { body, filtered_headers: filteredHeaders }
}

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
      const filtered_obj = configuration.requestBody.reduce((acc, item) => {
        acc[item.field_name] = item.response || "";
        return acc;
      }, {});

      const { body, filtered_headers } = getApiData(filtered_obj, headers)

      const response = await axios({
        url: path,
        method: method.toLowerCase(),
        headers: filtered_headers,
        data: body
      });

      const result = await logApiCall(clientId, leadId, filtered_obj, response?.data, response.status);

      if (result) {
        const existingLead = await Lead.findOne({ leadId, isActive: true });

        if (!existingLead) {
          return sendErrorResponse(res, 'Lead not found', 404);
        }

        const updatedClientIds = existingLead.clientId || [];
        if (!updatedClientIds.includes(clientId)) {
          updatedClientIds.push(clientId);
        }
        const submittedStatus = await StatusModel.findOne({ value: 'submitted_to_attorney' });

        await Lead.findByIdAndUpdate(existingLead?.id, { clientId: updatedClientIds, status: submittedStatus.id }, { new: true });
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

router.post('/sendToClient/bulk', asyncHandler(async (req, res) => {
  const { clientId, configuration } = req.body;
  const client = await User.findById(clientId);

  if (!client || client.userType !== 'client') {
    return sendErrorResponse(res, 'Invalid client or user type', 403);
  }

  const { path, method, headers } = client.configuration;
  if (!path || !method) {
    return sendErrorResponse(res, 'Invalid client configuration', 400);
  }

  let successes = [];
  let failures = [];

  for (const config of configuration.requestBody) {
    const { leadId, data } = config;

    const filtered_obj = data.reduce((acc, item) => {
      acc[item.field_name] = item.response || "";
      return acc;
    }, {});

    const { body, filtered_headers } = getApiData(filtered_obj, headers);

    try {
      const response = await axios({
        url: path,
        method: method.toLowerCase(),
        headers: filtered_headers,
        data: body
      });

      const result = await logApiCall(clientId, leadId, filtered_obj, response?.data, response.status);

      if (result) {
        const existingLead = await Lead.findOne({ leadId, isActive: true });

        if (!existingLead) {
          throw new Error('Lead not found');
        }

        const updatedClientIds = existingLead.clientId || [];
        if (!updatedClientIds.includes(clientId)) {
          updatedClientIds.push(clientId);
        }
        const submittedStatus = await StatusModel.findOne({ value: 'submitted_to_attorney' });

        await Lead.findByIdAndUpdate(existingLead?.id, { clientId: updatedClientIds, status: submittedStatus.id }, { new: true });
        successes.push({ leadId: leadId, status: 'Success', data: response.data });
      } else {
        throw new Error('API call failed');
      }
    } catch (error) {
      const statusCode = error.response ? error.response.status : 500;
      const errorData = error.response ? error.response.data : { message: error.message };

      await logApiCall(clientId, leadId, data, errorData, statusCode);
      failures.push({ leadId: leadId, status: 'Failed', error: errorData.message || 'Failed to reach client API', statusCode: statusCode });
    }
  }

  return res.json({
    successes,
    failures
  });
}));

router.get('/getById/:id', async (req, res) => {
  try {
    const clientId = req?.params?.id

    if (!clientId) {
      sendErrorResponse(res, 'Client id not provided')
    }

    const user = await User.findById(clientId)

    if (user?.userType === 'client') {
      sendSuccessResponse(res, user, 'Client fetched successfully', 200)
    } else {
      sendErrorResponse(res, 'Wrong client ID')
    }

  } catch (error) {
    sendErrorResponse(res, error?.message || 'Wrong client id')
  }
})

module.exports = router;
