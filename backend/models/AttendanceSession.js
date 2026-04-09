const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  beaconId: { type: String, required: true },
  duration: { type: Number, default: 40 },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  isActive: { type: Boolean, default: true },
  presentStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
});

attendanceSessionSchema.methods.isExpired = function() {
  const now = new Date();
  const elapsed = (now - this.startTime) / 1000;
  return elapsed > this.duration;
};

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
