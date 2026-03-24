const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');
const { success, error } = require('../utils/response');

const router = express.Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : '';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${safeExt}`);
  },
});

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: hasCloudinary ? memoryStorage : storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  },
});

function uploadBufferToCloudinary(fileBuffer, mimetype) {
  return new Promise((resolve, reject) => {
    const folder = process.env.CLOUDINARY_FOLDER || 'inventory-yalidine/products';
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: mimetype === 'image/png' ? 'png' : undefined,
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
}

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return error(res, 'No file uploaded.', 400);
  }

  try {
    if (hasCloudinary) {
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
      return success(res, {
        path: result.secure_url,
        filename: result.public_id,
        storage: 'cloudinary',
      });
    }

    return success(res, {
      path: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      storage: 'local',
    });
  } catch (err) {
    return error(res, `Upload failed: ${err.message}`, 500);
  }
});

module.exports = router;