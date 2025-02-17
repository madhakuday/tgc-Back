const mongoose = require('mongoose');
const Lead = require("../models/lead.model");
const User = require("../models/user.model");
const { monthNames } = require('../utils/constant');
const { getStatusByUserRole } = require('./status');
const StatusModel = require('../models/status.model');

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

const isStatusAssignedToUser = async (userRole, statusName) => {
    try {
        const status = await StatusModel.findOne({ name: statusName, isActive: true });

        if (!status) {
            console.error(`Status with name ${statusName} not found or is inactive.`);
            return false;
        }

        if (status.visibleTo.includes(userRole)) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error checking if status is assigned to user:", error);
        return false;
    }
};


const getUserData = async (req) => {
    try {
        const { timeline, startDate, endDate, id = "", role = "" } = req.query;
        const userType = req.user.userType;
        const currentUserId = req.user.id;

        const dateRange = buildDateRange(timeline, startDate, endDate);

        const matchConditions = await buildMatchConditions(
            userType,
            currentUserId,
            id,
            role,
            dateRange,
            { isActive: true }
        );

        const statusCounts = await Lead.aggregate([
            { $match: matchConditions },
            {
                $lookup: {
                    from: "status",
                    localField: "status",
                    foreignField: "_id",
                    as: "statusDetails"
                }
            },
            { $unwind: "$statusDetails" },
            {
                $group: {
                    _id: "$statusDetails.name",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const statusCategories = getStatusCategories();
        const result = statusCategories.map(category => ({
            title: category.name,
            value: 0,
            color: category.color
        }));

        for (const data of statusCounts) {
            const categoryIndex = result.findIndex(item => item.title === data._id);
            if (categoryIndex !== -1) {
                const isStatusAssigned = await isStatusAssignedToUser(userType, data._id);
                if (isStatusAssigned) {
                    result[categoryIndex].value = data.count;
                } else {
                    result[categoryIndex].value = 0;
                }
            }
        }

        return {
            isDataExist: result.length > 0,
            result,
        };
    } catch (error) {
        console.error(error);
        throw new Error("Error fetching pie chart data");
    }
};

const getStatusCategories = () => {
    return [
        { name: "New", color: "#FFDE00" },
        { name: "Pending", color: "#AB47BC" },
        { name: "Approve", color: "#008000" },
        { name: "Reject", color: "#DC3545" },
        { name: "Paid", color: "#50C878" },
        { name: "Billable", color: "#0000FF" }
    ];
};

const getBarChartData = async (req) => {
    try {
        const { timeline, startDate, endDate, id = "", role = "" } = req.query;
        const userType = req.user.userType;
        const currentUserId = req.user.id;

        const dateRange = buildDateRange(timeline, startDate, endDate);
        const matchConditions = await buildMatchConditions(userType, currentUserId, id, role, dateRange, { isActive: true });

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
        const statuses = await getStatusByUserRole(req?.user)
        

        const allowedStatuses = statuses?.statuses?.map((st) => new mongoose.Types.ObjectId(st.id)) || []
        const colorByStatus = statuses?.statuses?.reduce((acc, st) => {
            acc[st.id] = st.color;
            return acc;
        }, {}) || {};

        const labelByStatus = statuses?.statuses?.reduce((acc, st) => {
            acc[st.id] = st.name;
            return acc;
        }, {}) || {};

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

        const labels = statusCounts.map(data => labelByStatus[data._id] || '-');
        const data = statusCounts.map(data => data.count);
        const backgroundColor = statusCounts.map(data => colorByStatus[data._id.toString()] || "#CCCCCC");

        return {
            isDataExist: data.length,
            labels,
            datasets: [
                {
                    label: 'Status',
                    data,
                    backgroundColor,
                    hoverBackgroundColor: backgroundColor,
                    datalabels: {
                        color: 'white'
                    }
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
    buildDateRange
}