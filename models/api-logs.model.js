    const mongoose = require('mongoose');

    const apiLogsSchema = new mongoose.Schema({
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        leadId: {
            type: String,
            ref: 'Lead',
            required: true
        },
        isSuccess: {
            type: Boolean,
            default: false
        },
        requestBody: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        response: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        responseStatusCode: {
            type: Number,
            default: 200
        }
    }, { timestamps: true });

    const ApiLogs = mongoose.model('ApiLog', apiLogsSchema);
    module.exports = ApiLogs;
