const mongoose = require('mongoose');

const LeadHistorySchema = new mongoose.Schema({
    leadId: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    previousStatus: { type: String },
    currentStatus: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    updateType: { type: String, enum: ['statusChange', 'dataUpdate'], required: true },
    note: { type: String }
});

const LeadHistory = mongoose.model('LeadHistory', LeadHistorySchema);
module.exports = LeadHistory;
