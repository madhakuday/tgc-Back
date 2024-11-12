const mongoose = require('mongoose');
// const seedFixedQuestions = require('../seed/mongo');

mongoose.connect(process.env.MONGO_DB_URL,
    { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        // seedFixedQuestions()
        console.log('MongoDB connected')
    })
    .catch(err => console.log(err));
