const express = require('express');
const crypto = require('crypto');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Class = require('../models/Class');
const { protect, teacherOnly } = require('../middleware/auth');
const router = express.Router();

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Start attendance session (teacher only)
router.post('/start', protect, teacherOnly, async (req, res) => {
  try {
    const { classId, duration } = req.body;
    if (!classId) return res.status(400).json({ success: false, message: 'Class ID required' });
    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    if (cls.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not your class' });

    await AttendanceSession.updateMany({ class: classId, isActive: true }, { isActive: false, endTime: new Date() });

    const code = generateCode();
    const beaconId = crypto.randomBytes(8).toString('hex');
    const sessionDuration = duration || 40;
    const today = new Date().toISOString().split('T')[0];

    const session = await AttendanceSession.create({
      class: classId, teacher: req.user._id, code, beaconId, duration: sessionDuration, date: today
    });

    // Pre-create absent records for ALL enrolled students
    const students = cls.students;
    if (students.length > 0) {
      const records = students.map(studentId => ({
        student: studentId, class: classId, session: session._id, date: today, status: 'absent'
      }));
      await AttendanceRecord.insertMany(records, { ordered: false }).catch(() => {});
    }

    setTimeout(async () => {
      await AttendanceSession.findByIdAndUpdate(session._id, { isActive: false, endTime: new Date() });
    }, sessionDuration * 1000);

    res.status(201).json({ success: true, session: { id: session._id, code, beaconId, duration: sessionDuration, startTime: session.startTime } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get active session for a class
router.get('/active/:classId', protect, async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({ class: req.params.classId, isActive: true });
    if (!session) return res.json({ success: true, session: null });
    const elapsed = (new Date() - session.startTime) / 1000;
    if (elapsed > session.duration) {
      await AttendanceSession.findByIdAndUpdate(session._id, { isActive: false, endTime: new Date() });
      return res.json({ success: true, session: null });
    }
    const presentCount = await AttendanceRecord.countDocuments({ session: session._id, status: 'present' });
    res.json({ success: true, session: { id: session._id, code: session.code, beaconId: session.beaconId, duration: session.duration, startTime: session.startTime, timeRemaining: Math.max(0, session.duration - Math.floor(elapsed)), presentCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit attendance (student)
router.post('/submit', protect, async (req, res) => {
  try {
    const { sessionId, code, rssi, deviceId } = req.body;
    if (!sessionId || !code) return res.status(400).json({ success: false, message: 'Session ID and code required' });

    const session = await AttendanceSession.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (!session.isActive) return res.status(400).json({ success: false, message: 'Session has ended' });

    const elapsed = (new Date() - session.startTime) / 1000;
    if (elapsed > session.duration) {
      await AttendanceSession.findByIdAndUpdate(sessionId, { isActive: false });
      return res.status(400).json({ success: false, message: 'Session expired' });
    }
    if (session.code !== code) return res.status(400).json({ success: false, message: 'Wrong attendance code' });
    if (rssi !== undefined && rssi < -60) return res.status(400).json({ success: false, message: 'You are too far from the teacher. Move within 8 meters.' });

    if (req.user.deviceBound && deviceId) {
      const deviceHash = crypto.createHash('sha256').update(deviceId).digest('hex');
      if (req.user.deviceId !== deviceHash) return res.status(403).json({ success: false, message: 'Device mismatch. Use your registered device.' });
    }

    const cls = await Class.findById(session.class);
    if (!cls.students.includes(req.user._id)) return res.status(403).json({ success: false, message: 'You are not enrolled in this class' });

    const record = await AttendanceRecord.findOneAndUpdate(
      { student: req.user._id, session: sessionId },
      { status: 'present', rssi: rssi || -50, markedAt: new Date() },
      { upsert: true, new: true }
    );

    if (!session.presentStudents.includes(req.user._id)) {
      await AttendanceSession.findByIdAndUpdate(sessionId, { $push: { presentStudents: req.user._id } });
    }

    res.json({ success: true, message: 'Attendance marked successfully!', record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get session attendance (teacher)
router.get('/session/:sessionId', protect, async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const records = await AttendanceRecord.find({ session: req.params.sessionId }).populate('student', 'name email rollNumber');
    const present = records.filter(r => r.status === 'present');
    const absent = records.filter(r => r.status === 'absent');
    res.json({ success: true, session, records, summary: { present: present.length, absent: absent.length, total: records.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manual attendance edit (teacher)
router.patch('/record/:recordId', protect, teacherOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['present', 'absent'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const record = await AttendanceRecord.findByIdAndUpdate(req.params.recordId, { status, manuallyModified: true, modifiedBy: req.user._id }, { new: true }).populate('student', 'name email rollNumber');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// End session manually
router.patch('/end/:sessionId', protect, teacherOnly, async (req, res) => {
  try {
    const session = await AttendanceSession.findByIdAndUpdate(req.params.sessionId, { isActive: false, endTime: new Date() }, { new: true });
    res.json({ success: true, message: 'Session ended', session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get student's own attendance — cross-referenced against all sessions
router.get('/my-attendance/:classId', protect, async (req, res) => {
  try {
    // Get ALL sessions for this class
    const allSessions = await AttendanceSession.find({ class: req.params.classId }).sort({ startTime: -1 });
    const totalSessions = allSessions.length;

    // Get this student's records
    const records = await AttendanceRecord.find({ student: req.user._id, class: req.params.classId })
      .populate('session', 'date startTime')
      .sort({ createdAt: -1 });

    // For sessions where no record exists, treat as absent
    const recordSessionIds = new Set(records.map(r => r.session?._id?.toString()));
    const missingAbsent = allSessions
      .filter(s => !recordSessionIds.has(s._id.toString()))
      .map(s => ({
        _id: 'missing_' + s._id,
        student: req.user._id,
        class: req.params.classId,
        session: { _id: s._id, date: s.date, startTime: s.startTime },
        date: s.date,
        status: 'absent',
        markedAt: s.startTime
      }));

    const allRecords = [...records, ...missingAbsent].sort((a, b) =>
      new Date(b.session?.startTime || b.markedAt) - new Date(a.session?.startTime || a.markedAt)
    );

    const present = allRecords.filter(r => r.status === 'present').length;
    const total = totalSessions;
    const absent = total - present;

    res.json({
      success: true,
      records: allRecords,
      summary: {
        present,
        absent,
        total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
