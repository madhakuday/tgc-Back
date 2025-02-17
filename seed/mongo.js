const mongoose = require('mongoose');
const StatusModel = require('../models/status.model');
const { normalizeStatusName } = require('../utils/statusHandler');

const statusNames = [
    'New',
    'Under Verification',
    'Submitted to attorney',
    'Approve',
    'Reject',
    'Verified',
    'Billable',
    'Paid',
    'Pending'
];

const statusColors = {
    New: "#FFDE00",
    Pending: "#FFCE56",
    "Under Verification": "#AB47BC",
    "Submitted to attorney": "#29B6F6",
    Approve: "#008000",
    Reject: "#DC3545",
    Verified: "#FFCE56",
    Billable: "#0000FF",
    Paid: "#50C878"
};

const statuses = statusNames.map(name => ({
    name: name,
    value: normalizeStatusName(name),
    color: statusColors[name],
    visibleTo: ['admin', 'vendor'],
    isEditable: false
}));

const seedStatuses = async () => {
    try {
        for (const status of statuses) {
            await StatusModel.findOneAndUpdate(
                { name: status.name },
                status,
                { upsert: true, new: true }
            );
        }

        console.log('✅ Status seeding completed successfully.');
    } catch (error) {
        console.error('❌ Error seeding statuses:', error);
    }
};

// Run the function
module.exports = {
    seedStatuses
}