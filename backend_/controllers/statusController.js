const Status = require('../models/status');
const { uploadFileToCloudinary } = require('../config/cloudinary');
const response = require('../utils/responseHandler');

// Create a status
exports.createStatus = async (req, res) => {
    try {
        const { contentType, content } = req.body;
        const file = req.file;
        
        let mediaUrl = null;
        let finalContentType = contentType || 'text';

        // Handle file upload
        if (file) {
            const uploadFile = await uploadFileToCloudinary(file);
            if (!uploadFile?.secure_url) {
                return response(res, 500, "Failed to upload media");
            }
            mediaUrl = uploadFile.secure_url;

            if (file.mimetype.startsWith('video')) {
                finalContentType = 'video';
            } else if (file.mimetype.startsWith('image')) {
                finalContentType = 'image';
            } else {
                return response(res, 400, "Unsupported file type");
            }
        } else if (content?.trim()) {
            finalContentType = 'text';
        } else {
            return response(res, 400, "Message content is required!");
        }

        // Create status with 24-hour expiry
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        const status = new Status({
            userId: req.user.userId,
            contentType: finalContentType,
            content: content || '',
            mediaUrl: mediaUrl,
            expiresAt
        });
        
        await status.save();

        // Populate user details and viewers
        const populatedStatus = await Status.findById(status._id)
            .populate('user', 'userName profilePicture')
            .populate('viewers', 'userName profilePicture');

        return response(res, 201, "Status created successfully", { status: populatedStatus });

    } catch (error) {
        console.error('Create status error:', error);
        return response(res, 500, "Internal Server Error");
    }
};

exports.getStatuses = async (req, res) => {
    try {
      
        
        // Find all non-expired statuses
        const statuses = await Status.find({
            expiresAt: { $gt: new Date() }
        })
            .populate('user', 'userName profilePicture')
            .populate('viewers', 'userName profilePicture')
            .sort({ createdAt: -1 });

        return response(res, 200, "Statuses fetched successfully", statuses);
    } catch (error) {
        console.error('Get statuses error:', error);
        return response(res, 500, "Internal Server Error");
    }
};
exports.viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId;

    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }

    // Add viewer only if not already viewed
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();
    } else {
      console.log("User already viewed the status");
    }

    // Populate user + viewers
    const updatedStatus = await Status.findById(statusId)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    return response(res, 200, "Status viewed successfully", updatedStatus);
    //Note we will handle to prevent viewers to see the veiwesr list in frontend

  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};
exports.deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId; 
    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }   
    // Only the owner can delete the status
    if (status.user.toString() !== userId.toString()) {
      return response(res, 403, "You can only delete your own status");
    }
    await Status.findByIdAndDelete(statusId);
    return response(res, 200, "Status deleted successfully");
  }
    catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }

};