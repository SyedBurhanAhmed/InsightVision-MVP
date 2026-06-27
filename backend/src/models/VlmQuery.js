const mongoose = require('mongoose');

const vlmQuerySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prompt: { type: String, required: true },
    result: { type: String, required: true },
    time: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VlmQuery', vlmQuerySchema);
