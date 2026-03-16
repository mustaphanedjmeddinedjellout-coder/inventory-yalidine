const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/response');

const router = express.Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return error(res, 'No file uploaded.', 400);
  }

  return success(res, {
    path: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
  });
});

module.exports = router;