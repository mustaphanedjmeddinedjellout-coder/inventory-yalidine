const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ImageKit = require('imagekit');
const { success, error } = require('../utils/response');

const router = express.Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const hasImageKit = Boolean(
  process.env.IMAGEKIT_PUBLIC_KEY
  && process.env.IMAGEKIT_PRIVATE_KEY
  && process.env.IMAGEKIT_URL_ENDPOINT
);

const imageKit = hasImageKit
  ? new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  })
  : null;

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
  storage: hasImageKit ? memoryStorage : storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  },
});

async function uploadBufferToImageKit(fileBuffer, originalName) {
  if (!imageKit) throw new Error('ImageKit is not configured.');
  const folder = process.env.IMAGEKIT_FOLDER || '/inventory-yalidine/products';
  const ext = path.extname(originalName || '').toLowerCase();
  const safeExt = ext && ext.length <= 10 ? ext : '';
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
  return imageKit.upload({
    file: fileBuffer,
    fileName,
    folder,
    useUniqueFileName: true,
  });
}

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return error(res, 'No file uploaded.', 400);
  }

  try {
    if (hasImageKit) {
      const result = await uploadBufferToImageKit(req.file.buffer, req.file.originalname);
      return success(res, {
        path: result.url,
        filename: result.fileId,
        storage: 'imagekit',
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