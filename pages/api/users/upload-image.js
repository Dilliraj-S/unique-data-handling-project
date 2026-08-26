import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Upload user image (profile or cover)
 * POST /api/users/upload-image
 * Body: FormData with 'file' field and optional 'type' field ('profile' or 'cover')
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'users');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxTotalFileSize: 10 * 1024 * 1024,
      filter: ({ mimetype }) => {
        // Only allow image files
        return mimetype && mimetype.startsWith('image/');
      },
    });

    const [fields, files] = await form.parse(req);
    
    if (!files.file || !files.file[0]) {
      return res.status(400).json({ 
        status: false,
        message: 'No file uploaded' 
      });
    }

    const file = files.file[0];
    const imageType = fields.type?.[0] || 'profile'; // 'profile' or 'cover'
    
    // Generate unique filename
    const fileExtension = path.extname(file.originalFilename || 'image.jpg');
    const uniqueFileName = `${imageType}_${uuidv4()}${fileExtension}`;
    const newFilePath = path.join(uploadDir, uniqueFileName);
    
    // Move file to new location with unique name
    fs.renameSync(file.filepath, newFilePath);
    
    // Return relative path from public directory (for serving via Next.js)
    const relativePath = `/uploads/users/${uniqueFileName}`;
    
    return res.status(200).json({
      status: true,
      message: 'Image uploaded successfully',
      path: relativePath,
      fullPath: newFilePath,
      type: imageType
    });

  } catch (error) {
    console.error('Image upload error:', error);
    
    // Handle file size error
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        status: false,
        message: 'File size exceeds 10MB limit' 
      });
    }
    
    // Handle invalid file type
    if (error.message && error.message.includes('mimetype')) {
      return res.status(400).json({ 
        status: false,
        message: 'Invalid file type. Only image files are allowed.' 
      });
    }
    
    return res.status(500).json({ 
      status: false,
      message: 'Upload failed',
      details: error.message 
    });
  }
}

