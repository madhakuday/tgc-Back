const mongoose = require('mongoose');

const vendorApiLeadHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null,
    },
    accessToken: {
        type: String,
        default: 'No access token provided'
    },
    requestBody: {
        type: Object,
        required: true
    },
    responseStatus: {
        type: Number,
        required: 0
    },
    response: {
        type: Object
    },
    host: String,
    userAgent: String,
    origin: String,
    error: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const VendorApiLeadHistory = mongoose.model('VendorApiLeadHistory', vendorApiLeadHistorySchema);

module.exports = VendorApiLeadHistory;
