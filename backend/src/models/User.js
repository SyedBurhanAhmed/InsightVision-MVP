const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    region: { type: String, default: 'NORTH_CLUSTER_01' },
    accessLevel: { type: String, default: 'SECURE_LINK / ACTIVE' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
