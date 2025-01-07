require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const multer = require('multer');
const app = express();

// DB
require('./db')

// cors
app.use(cors())
app.use(bodyParser.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
// app.use(express.json()); // Replaces app.use(bodyParser.json())

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_UNSUPPORTED_FILE_TYPE') {
        return res.status(400).json({
            message: `Unsupported file type for field: ${err.field}`,
            code: err.code,
        });
    }

    if (err) {
        return res.status(500).json({ message: err.message });
    }

    next();
});

app.use('/api/docs', express.static('public/docs'));
app.use('/api/media', express.static('public/media'));

// Routes
app.use('/api', routes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
