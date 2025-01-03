const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else {
		cb(new Error('Only images are allowed'), false);
	}
};

const limits = {
	fileSize: 5 * 1024 * 1024, // 5MB in bytes
	files: 1, // Only allow 1 file per request
};

const upload = multer({
	storage,
	fileFilter,
	limits,
});

module.exports = upload;
