const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: String,
        required: true,
        unique: true
    },
    color: {
        type: String,
        required: true
    },
    visibleTo: {
        type: [String],
        enum: ['admin', 'vendor', 'staff', 'subAdmin'],
        required: true,
        default: ['admin']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEditable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

statusSchema.pre("save", function (next) {
    this.visibleTo.push("admin");

    next();
});


const StatusModel = mongoose.model('status', statusSchema);
module.exports = StatusModel;
