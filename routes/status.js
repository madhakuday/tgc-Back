const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const StatusModel = require('../models/status.model');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const validate = require('../middlewares/validationMiddleware');
const { createStatus, getStatusByUserRole, deleteStatus } = require('../controller/status');
const { createStatusValidation } = require('../validators/statusValidator');

router.post('/', validate(createStatusValidation), asyncHandler(async (req, res) => {
    try {
        const status = await createStatus(req.body, res)
        return sendSuccessResponse(res, status, 'Status created successfully', 201);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}));

router.get('/', asyncHandler(async (req, res) => {
    try {
        const user = req?.user;
        if (user) {
            const { search = '', rowsPerPage, rowPerPage, page = 1 } = req.query;
            const statuses = await getStatusByUserRole(user, search, rowsPerPage || rowPerPage, page);
            return sendSuccessResponse(res, statuses, 'Statuses fetched successfully', 200);
        } else {
            return sendErrorResponse(res, 'User not found.', 404);
        }
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}));

router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const status = await StatusModel.findById(req.params.id, { isActive: true });
        if (!status) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }
        return sendSuccessResponse(res, status, 'Status fetched successfully', 200);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}));

router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const status = await StatusModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!status) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }
        return sendSuccessResponse(res, status, 'Status updated successfully', 200);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}));

router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        await deleteStatus(req, res);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}));

module.exports = router;
