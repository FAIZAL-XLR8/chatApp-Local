/*Express cannot handle files directly in the request body because files are sent as binary data, and Express’s built-in body parsers only understand text-based formats like JSON or URL-encoded data.

Since JSON cannot represent binary file data, a different content type is used called multipart/form-data. This content type breaks the request into multiple parts, where each part can contain either text fields or binary file data.

Multer is middleware that parses multipart/form-data requests, extracts the binary file data and form fields, and converts them into a readable format for Express by attaching them to req.file, req.files, and req.body.*/

// logic is to first upload the file to server's temp storage using multer and then from there upload to cloudinary then delete the temp file from server after successful/unsccfl upload to cloudinary
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadFileToCloudinary = async (file) => {
  const options = {
    resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
  }

  try {
    const uploader = file.mimetype.startsWith('video') 
      ? cloudinary.uploader.upload_large 
      : cloudinary.uploader.upload;
    
    const result = await uploader(file.path, options);
    
    return result;
    
  } catch (error) {
    throw error;
    
  } finally {
    //delete the temporary video fromthe server
    fs.unlink(file.path, () => {});
  }
};
const multerMiddleware = multer({ dest: 'uploads/' }).single('media');
module.exports = { uploadFileToCloudinary, multerMiddleware };