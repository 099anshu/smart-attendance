const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent'], default: 'absent' },
  rssi: { type: Number, default: null },
  markedAt: { type: Date, default: Date.now },
  manuallyModified: { type: Boolean, default: false },
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

attendanceRecordSchema.index({ student: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
