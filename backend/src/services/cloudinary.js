const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dj92mesew',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Delete an image from Cloudinary
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

// Extract public ID from Cloudinary URL
function getPublicIdFromUrl(url) {
  try {
    // URL format: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/public-id.ext
    const parts = url.split('/');
    const filename = parts.pop(); // Get the filename with extension
    const folder = parts.pop(); // Get the folder name
    const publicId = `${folder}/${filename.split('.')[0]}`; // Combine folder and filename without extension
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
}

module.exports = {
  deleteImage,
  getPublicIdFromUrl
};