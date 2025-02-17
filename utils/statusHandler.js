const StatusModel = require("../models/status.model");

function normalizeStatusName(name) {
    return name
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '_');
}

const getStatusById = async (id) => {
    try {
        const status = await StatusModel.findById(id)
        return status
    } catch (error) {
        return {}
    }
}

module.exports = {
    normalizeStatusName,
    getStatusById
}