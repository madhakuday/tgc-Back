
const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const { getUserData, getBarChartData, getPieChartData } = require('../controller/dashboard');

const router = express.Router();

router.get('/user-details', asyncHandler(async (req, res) => {
    try {
        const data = await getUserData(req)
        
        return sendSuccessResponse(res, data, 'Data fetched successfully', 201);
    } catch (error) {
        sendErrorResponse(res, error?.message)
    }
}))

router.get('/bar-chart-data', asyncHandler(async (req, res) => {
    try {
        const data = await getBarChartData(req)
        
        return sendSuccessResponse(res, data, 'Data fetched successfully', 201);
    } catch (error) {
        sendErrorResponse(res, error?.message)
    }
}))

router.get('/pie-chart-data', asyncHandler(async (req, res) => {
    try {
        const data = await getPieChartData(req)
        
        return sendSuccessResponse(res, data, 'Data fetched successfully', 201);
    } catch (error) {
        sendErrorResponse(res, error?.message)
    }
}))

module.exports = router;
