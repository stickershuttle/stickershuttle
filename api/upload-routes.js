const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendUserFileUpload } = require('./email-notifications');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// Configure multer for in-memory storage (for email attachments)
const memoryStorage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'application/postscript', // .ai, .eps
      'image/vnd.adobe.photoshop' // .psd
    ];
    
    const allowedExtensions = ['.ai', '.svg', '.eps', '.png', '.jpg', '.jpeg', '.psd'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload .ai, .svg, .eps, .png, .jpg, or .psd files'));
    }
  }
});

// Configure multer for email uploads with expanded file types
const uploadForEmail = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit for email attachments
  },
  fileFilter: (req, file, cb) => {
    // Expanded file types for email uploads
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'application/pdf',
      'application/postscript', // .ai, .eps
      'image/vnd.adobe.photoshop', // .psd
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.rar',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = [
      '.ai', '.svg', '.eps', '.png', '.jpg', '.jpeg', '.psd', '.gif', '.webp',
      '.pdf', '.zip', '.rar', '.txt', '.doc', '.docx'
    ];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload design files (.ai, .psd, .svg, .eps), images (.png, .jpg, .gif), documents (.pdf, .txt, .doc), or archives (.zip, .rar)'));
    }
  }
});

// File upload endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    console.log('📄 File upload request received');
    console.log('📄 File:', req.file);
    console.log('📄 Metadata:', req.body.metadata);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse metadata if provided
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (e) {
        console.log('Failed to parse metadata:', e);
      }
    }

    // Generate the URL for the uploaded file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Return response in Cloudinary-like format
    const response = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl,
      mimetype: req.file.mimetype,
      size: req.file.size,
      metadata: metadata
    };

    console.log('✅ File upload successful:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint for uploading files to send via email
router.post('/upload-to-email', uploadForEmail.single('file'), async (req, res) => {
  try {
    console.log('📧 File upload to email request received');
    console.log('📧 File:', req.file ? req.file.originalname : 'No file');
    console.log('📧 User data:', req.body.userData ? JSON.parse(req.body.userData) : 'No user data');

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse user data
    let userData = {};
    if (req.body.userData) {
      try {
        userData = JSON.parse(req.body.userData);
      } catch (e) {
        console.error('Failed to parse user data:', e);
        return res.status(400).json({ error: 'Invalid user data' });
      }
    }

    if (!userData.email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Get optional message
    const message = req.body.message || '';

    // Send file via email
    const emailResult = await sendUserFileUpload(
      userData,
      req.file.buffer,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      message
    );

    if (emailResult.success) {
      console.log('✅ File uploaded and sent via email successfully');
      res.json({
        success: true,
        message: 'File uploaded and sent successfully',
        emailId: emailResult.id,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });
    } else {
      console.error('❌ Failed to send file via email:', emailResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to send file via email',
        details: emailResult.error
      });
    }

  } catch (error) {
    console.error('❌ Upload to email error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Serve uploaded files statically
router.use('/uploads', express.static(uploadsDir));

module.exports = router; 