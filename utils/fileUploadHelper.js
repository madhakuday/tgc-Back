const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Define storage paths and configurations for files under 'media'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder;
        
        if (file.mimetype.includes('application') || file.originalname.includes('doc')) {
            folder = 'public/docs';
        } else if (file.mimetype.includes('audio') || file.mimetype.includes('video') || file.originalname.includes('recording')) {
            folder = 'public/media';
        } else {
            return cb(new MulterError('LIMIT_UNSUPPORTED_FILE_TYPE', file.fieldname));
        }

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.fieldname}${ext}`);
    }
});

const upload = multer({ storage });

const generateFileUrl = (file) => {
    const baseUrl = process.env.BACKEND_URL;
    if (file.mimetype.includes('application') || file.originalname.includes('doc')) {
        return `${baseUrl}/api/docs/${file.filename}`;
    } else if (file.mimetype.includes('audio') || file.mimetype.includes('video') || file.originalname.includes('recording')) {
        return `${baseUrl}/api/media/${file.filename}`;
    }
    return null;
};

module.exports = { upload, generateFileUrl };
