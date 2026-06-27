const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    time: { type: String, required: true },
    source: { type: String, required: true },
    status: { type: String, enum: ['Flagged', 'Completed', 'Review'], required: true },
    trackedObjects: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Detection', detectionSchema);
