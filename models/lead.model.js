const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    leadId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    clientId: {
        type: [String],
        default: [],
        validate: {
            validator: function (value) {
                return Array.isArray(value) && value.every((item) => typeof item === 'string');
            },
            message: 'clientId must be an array of strings.',
        },
    },
    responses: [
        {
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
            response: { type: String, required: true }
        }
    ],
    verifier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    status: {
        type: String,
        enum: [
            'new',
            'under_verification',
            'submitted_to_attorney',
            'approve',
            'reject',
            'return',
            'replace',
            'verified',
            'answering_machine',
            'callback',
            'vm',
            'billable',
            'paid',
            'am',
            'voicemail'
        ],
        required: true,
        default: 'new'
    },
    remark: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    media: [
        {
            type: { type: String, enum: ['doc', 'recording'], required: true },
            url: { type: String, required: true }
        }
    ],
    generated_by_api: {
        type: Boolean,
        default: false
    },
    timeZone: {
        type: String,
        default: ""
    },
    leadOutTime: {
        type: Date,
    },
}, { timestamps: true });

const Lead = mongoose.model('Lead', leadSchema);
module.exports = Lead;
