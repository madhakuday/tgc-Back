const mongoose = require('mongoose');
const Lead = require("../models/lead.model");
const User = require("../models/user.model");
const { monthNames } = require('../utils/constant');

const buildDateRange = (timeline, startDate, endDate) => {
    const now = new Date();
    let dateRange = {};

    switch (timeline) {
        case 'this-year':
            dateRange = {
                $gte: new Date(now.getFullYear(), 0, 1), // Start of the year
                $lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999), // End of the year
            };
            break;
        case 'this-month':
            dateRange = {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lte: now,
            };
            break;
        case 'this-week':
            const currentDate = new Date();
            const dayOfWeek = currentDate.getDay();
            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - diffToMonday);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            dateRange = { $gte: startOfWeek, $lte: endOfWeek };
            break;

        case 'today':
            dateRange = {
                $gte: new Date(now.setHours(0, 0, 0, 0)),
                $lte: new Date(now.setHours(23, 59, 59, 999))
            };
            break;
        case 'custom':
            if (startDate && endDate) {
                dateRange = {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                };
            }
            break;
    }

    return dateRange;
};

const buildMatchConditions = async (userType, currentUserId, id, role, dateRange, additionalFilters = {}) => {
    let matchConditions = { createdAt: dateRange, ...additionalFilters };

    if (userType === 'admin') {
        if (role) {
            const usersByRole = await User.find({ userType: role }, { _id: 1 });
            const roleIds = usersByRole.map(user => user._id);
            matchConditions.userId = { $in: roleIds };
        }
        if (id) {
            matchConditions.userId = new mongoose.Types.ObjectId(id);
        }
    } else if (userType === 'staff' || userType === 'vendor') {
        matchConditions.userId = new mongoose.Types.ObjectId(currentUserId);
    } else if (userType === 'subAdmin') {
        const subAdmin = await User.findById(currentUserId).populate('AssignedVendorIds', '_id');
        const vendorIds = subAdmin.AssignedVendorIds.map(id => new mongoose.Types.ObjectId(id));
        matchConditions.userId = { $in: vendorIds };
    }

    return matchConditions;
};

const statusMap = {
    answering_machine: "Answering Machine",
    callback: "Callback",
    verified: "Verified",
    vm: "Vm",
    new: "New",
    under_verification: "Under Verification",
    submitted_to_attorney: "Submitted To Attorney",
    approve: "Approve",
    reject: "Reject",
    return: "Return",
    replace: "Replace",
    billable: "Billable",
    paid: "Paid",
};

const statusColors = {
    answering_machine: "#FF6384",
    callback: "#36A2EB",
    verified: "#FFCE56",
    vm: "#66BB6A",
    new: "#FFA726",
    under_verification: "#AB47BC",
    submitted_to_attorney: "#29B6F6",
    approve: "#EF5350",
    reject: "#FF7043",
    return: "#26A69A",
    replace: "#9CCC65",
    billable: "#5C6BC0",
    paid: "#42A5F5",
};

const getUserData = async (req) => {
    try {
        const { timeline, startDate, endDate, id = "", role = "" } = req.query;
        const userType = req.user.userType;
        const currentUserId = req.user.id;

        // Define date range
        const dateRange = buildDateRange(timeline, startDate, endDate);

        // Define status categories
        const statusCategories = {
            new: "New Leads",
            pending: "Pending Leads",
            approved: "Approved Leads",
            rejected: "Rejected Leads",
            paid: "Paid Leads",
            billable: "Billable Leads",
        };

        const statusMapping = {
            new: ["new"],
            pending: ["under_verification", "submitted_to_attorney"], // Handled separately
            approved: ["approve", "verified"],
            rejected: ["reject"],
            paid: ["paid"],
            billable: ["billable"],
        };

        let allowedCategories = [];
        if (userType === 'admin') {
            allowedCategories = Object.keys(statusMapping);
        } else if (userType === 'staff') {
            allowedCategories = ["pending", "approved", 'new']; // Restrict to allowed categories for staff
        } else if (userType === 'vendor') {
            allowedCategories = ["new", "pending", "approved"]; // Restrict for vendor
        } else {
            return { isDataExist: false, result: [] }; // No access for other user types
        }

        // Build match conditions
        const matchConditions = await buildMatchConditions(
            userType,
            currentUserId,
            id,
            role,
            dateRange,
            { isActive: true }
        );

        // Aggregate data and group by categories
        const statusCounts = await Lead.aggregate([
            { $match: matchConditions },
            // Lookup userType from User collection
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            // Unwind userDetails to access userType
            { $unwind: "$userDetails" },
            // Group data by categories
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$status", "new"] }, then: "new" },
                                {
                                    case: {
                                        $and: [
                                            { $in: ["$status", ["under_verification", "submitted_to_attorney"]] },
                                            { $eq: ["$userDetails.userType", "staff"] }, // Ensure created by staff
                                        ],
                                    },
                                    then: "pending",
                                },
                                { case: { $in: ["$status", ["approve", "verified"]] }, then: "approved" },
                                { case: { $eq: ["$status", "reject"] }, then: "rejected" },
                                { case: { $eq: ["$status", "paid"] }, then: "paid" },
                                { case: { $eq: ["$status", "billable"] }, then: "billable" },
                            ],
                            default: "other",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $match: { _id: { $in: allowedCategories } } }, // Filter out irrelevant categories
            { $sort: { _id: 1 } },
        ]);

        const result = allowedCategories.map(category => ({
            title: statusCategories[category],
            value: 0,
        }));

        statusCounts.forEach(data => {
            const categoryIndex = result.findIndex(item => item.title === statusCategories[data._id]);
            if (categoryIndex !== -1) {
                result[categoryIndex].value = data.count;
            }
        });

        return {
            isDataExist: true,
            result,
        };
    } catch (error) {
        console.error(error);
        throw new Error("Error fetching pie chart data");
    }
};


const getBarChartData = async (req) => {
    try {
        const { timeline, startDate, endDate, id = "", role = "" } = req.query;
        const userType = req.user.userType;
        const currentUserId = req.user.id;

        const dateRange = buildDateRange(timeline, startDate, endDate);
        const matchConditions = await buildMatchConditions(userType, currentUserId, id, role, dateRange);

        let groupField, labelsFormatter;

        if (timeline === 'this-month') {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            groupField = { $subtract: [{ $week: '$createdAt' }, { $week: startOfMonth }] };
            labelsFormatter = (relativeWeek) => `Week ${relativeWeek + 1}`;
        } else if (timeline === 'this-week') {
            groupField = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
            labelsFormatter = (date) => date;
        } else if (timeline === 'today') {
            groupField = { $dateToString: { format: '%H:00', date: '$createdAt' } };
            labelsFormatter = (hour) => `${hour} - ${parseInt(hour) + 1}:00`; // Format hours range
        } else if (timeline === 'this-year') {
            groupField = { $month: '$createdAt' }; // Group by month within the year
            labelsFormatter = (monthNumber) => {
                return monthNames[monthNumber - 1]; // Convert month number to name
            };
        } else if (timeline === 'custom' && startDate && endDate) {
            const customRange = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
            if (customRange > 30) {
                groupField = { $month: '$createdAt' };
                labelsFormatter = (monthNumber) => `Month ${monthNumber}`;
            } else {
                groupField = { $week: '$createdAt' };
                labelsFormatter = (weekNumber) => `Week ${weekNumber}`;
            }
        } else {
            throw new Error('Invalid timeline value');
        }

        const barChartData = await Lead.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: groupField,
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const labels = barChartData.map(data => labelsFormatter(data._id));
        const data = barChartData.map(data => data.count);

        return { isDataExist: data.length, labels, data };
    } catch (error) {
        console.error(error);
        throw new Error('Error fetching bar chart data');
    }
};

const getPieChartData = async (req) => {
    try {
        const { timeline, startDate, endDate, id = "", role = "" } = req.query;
        const userType = req.user.userType;
        const currentUserId = req.user.id;

        const dateRange = buildDateRange(timeline, startDate, endDate);
        const allowedStatuses = userType === 'staff'
            ? ['answering_machine', 'callback', 'verified', 'vm', 'new']
            : userType === 'vendor'
                ? ['verified', 'new', 'under_verification', 'submitted_to_attorney']
                : Object.keys(statusMap);

        const matchConditions = await buildMatchConditions(userType, currentUserId, id, role, dateRange, { status: { $in: allowedStatuses }, isActive: true });

        const statusCounts = await Lead.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                },
            },
            { $sort: { _id: 1 } }
        ]);

        const labels = statusCounts.map(data => statusMap[data._id] || data._id);
        const data = statusCounts.map(data => data.count);
        const backgroundColor = statusCounts.map(data => statusColors[data._id] || "#CCCCCC");

        return {
            isDataExist: data.length,
            labels,
            datasets: [
                {
                    label: 'Status',
                    data,
                    backgroundColor,
                    hoverBackgroundColor: backgroundColor,
                },
            ],
        };
    } catch (error) {
        console.error(error);
        throw new Error('Error fetching pie chart data');
    }
};

module.exports = {
    getUserData,
    getBarChartData,
    getPieChartData,
}