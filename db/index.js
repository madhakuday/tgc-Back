const mongoose = require('mongoose');
const {seedStatuses } = require('../seed/mongo');
const { fetchLeadsByStatus } = require('../seed/migration');

mongoose.connect(process.env.MONGO_DB_URL,
    { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        seedStatuses()
        fetchLeadsByStatus()
        console.log('MongoDB connected')
    })
    .catch(err => console.log(err));
