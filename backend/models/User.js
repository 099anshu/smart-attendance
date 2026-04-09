const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'student'], required: true },
  rollNumber: { type: String, sparse: true },

  // Device binding — which device this student is locked to
  deviceId: { type: String, default: null },
  deviceModel: { type: String, default: null },
  deviceBound: { type: Boolean, default: false },

  // Device fingerprint — prevents multiple accounts on same device
  deviceFingerprint: { type: String, default: null, sparse: true },

  enrolledClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
