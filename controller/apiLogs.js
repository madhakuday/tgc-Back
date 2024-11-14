const mongoose = require('mongoose');
const ApiLogs = require('../models/api-logs.model');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const logApiCall = async (clientId, leadId, requestBody, response, responseStatusCode) => {
  try {
    if (!isValidObjectId(clientId)) {
      throw new Error("Invalid clientId format");
    }

    const apiLog = new ApiLogs({
      clientId: new mongoose.Types.ObjectId(clientId),
      leadId,
      requestBody,
      response,
      responseStatusCode,
      isSuccess: responseStatusCode === 201 || responseStatusCode === 200
    });
    return await apiLog.save();
  } catch (error) {
    throw Error(error);
  }
};

module.exports = { logApiCall };
