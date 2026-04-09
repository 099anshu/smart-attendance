const mongoose = require('mongoose');

const approvedStudentSchema = new mongoose.Schema({
  rollNumber: { type: String, trim: true, default: '' },
  email:      { type: String, trim: true, lowercase: true, default: '' },
  name:       { type: String, trim: true, default: '' },
  enrolled:   { type: Boolean, default: false },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const classSchema = new mongoose.Schema({
  subjectName:  { type: String, required: true, trim: true },
  subjectCode:  { type: String, required: true, trim: true },
  classCode:    { type: String, unique: true, default: () => Math.random().toString(36).substring(2, 8).toUpperCase() },
  teacher:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  approvedList: [approvedStudentSchema],
  semester:     { type: String, required: true },
  totalStudents:{ type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Class', classSchema);
