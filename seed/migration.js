const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const LeadModel = require('../models/lead.model');
const StatusModel = require('../models/status.model');

const JSON_FILE_PATH = path.join(__dirname, 'leadIds.json');

const fetchLeadsByStatus = async () => {
    try {
        const statusValue = 'Paid';

        // // Fetch the status ID
        // const status = await StatusModel.findOne({ name: statusValue });
        // const statusId = status?.id;
        // console.log('statusId:', statusId);

        // if (!statusId) {
        //     console.log('❌ Status not found.');
        //     return;
        // }

        // const allLeads = await LeadModel.find({ status: 'paid' })
        // const leadIdsMap = allLeads.map((lead) => lead.id);
        // console.log(leadIdsMap.length);

        // fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(leadIdsMap, null, 2));
        // console.log(`✅ Lead IDs stored in ${JSON_FILE_PATH}`);

        // const storedLeadIds = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf8'));

        // const updates = storedLeadIds.map((id) => {
        //     return LeadModel.updateOne({ _id: id }, { $set: { status: statusId } });
        // });

        // await Promise.all(updates);
        // console.log(`✅ Lead statuses updated successfully. Leads: ${storedLeadIds.length}`);

    } catch (error) {
        console.error(`❌ Error during status update:`, error);
    }
};

module.exports = {
    fetchLeadsByStatus
};
