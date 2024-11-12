require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const multer = require('multer');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const app = express();

// DB
require('./db')

// cors
app.use(cors())
app.use(bodyParser.json());
app.use(express.json()); // Replaces app.use(bodyParser.json())

app.use('/api/docs', express.static('public/docs'));
app.use('/api/media', express.static('public/media'));

// Routes
app.use('/api', routes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
