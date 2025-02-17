const StatusModel = require("../models/status.model");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseHandler");
const { normalizeStatusName } = require("../utils/statusHandler");
const Lead = require('../models/lead.model');
const { default: mongoose } = require("mongoose");

const createStatus = async (body) => {
    const payload = {
        ...body,
        value: normalizeStatusName(body.name)
    }
    const status = new StatusModel(payload);
    await status.save();
    return status
}

const getStatusByUserRole = async (user, search = '', limit = -1, page = 1) => {
    const userType = user.userType;

    // Construct the search query
    const searchQuery = search
        ? { name: { $regex: search, $options: 'i' }, isActive: true, visibleTo: { '$in': [userType] } }
        : { isActive: true, visibleTo: { '$in': [userType] } };

    const totalStatuses = await StatusModel.countDocuments(searchQuery);
    
    const limitNum = !limit || limit == -1 ? totalStatuses : parseInt(limit, 10);
    const pageNum = Math.max(1, parseInt(page, 10));
    const skip = (pageNum - 1) * limitNum;

    const statuses = await StatusModel.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(limitNum === totalStatuses ? 0 : skip) // Skip only when limit is not "all"
        .limit(limitNum);

    return {
        totalStatuses,
        totalPages: limitNum === totalStatuses ? 1 : Math.ceil(totalStatuses / limitNum),
        currentPage: pageNum,
        statuses
    };
};

const deleteStatus = async (req, res) => {
 try {
    const id = new mongoose.Types.ObjectId(req.params.id)
    
    if (!id) { return sendErrorResponse(res, 'Please provide id') }

    const status = await StatusModel.findById(id)

    if (!status?.isActive) {
        return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const leads = await Lead.find({ status: status.id, isActive: true,  })

    if (leads?.length) {
        return sendErrorResponse(res, 'Status associated with lead cant remove it')
    }

    await StatusModel.findByIdAndUpdate(id, { isActive: false }, { new: true, runValidators: true })
    return sendSuccessResponse(res, status, 'Status deleted successfully', 200);
 } catch (error) {
    return sendErrorResponse(res, error?.message || 'Something went wrong', 400)
 }
}

module.exports = {
    createStatus,
    getStatusByUserRole,
    deleteStatus
}