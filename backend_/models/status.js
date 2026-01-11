const mongoose = require('mongoose');
const statusSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentType: { type: String, enum: ['text', 'image', 'video'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    viewers : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
const Status = mongoose.model('Status', statusSchema);
module.exports = Status;