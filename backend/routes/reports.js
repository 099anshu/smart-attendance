const express = require('express');
const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceSession = require('../models/AttendanceSession');
const Class = require('../models/Class');
const { protect, teacherOnly } = require('../middleware/auth');
const router = express.Router();

// Full class report (teacher)
router.get('/class/:classId', protect, teacherOnly, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.classId).populate('students', 'name email rollNumber');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const sessions = await AttendanceSession.find({ class: req.params.classId }).sort({ startTime: -1 });
    const records = await AttendanceRecord.find({ class: req.params.classId }).populate('student', 'name email rollNumber');

    const totalSessions = sessions.length;

    // Per-student stats
    const studentStats = cls.students.map(student => {
      const studentRecords = records.filter(r =>
        r.student && r.student._id.toString() === student._id.toString()
      );
      const present = studentRecords.filter(r => r.status === 'present').length;
      return {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber
        },
        present,
        absent: totalSessions - present,
        total: totalSessions,
        percentage: totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0
      };
    });

    // Per-session breakdown
    const sessionBreakdown = sessions.map(session => {
      const sessionRecords = records.filter(r =>
        r.session && r.session.toString() === session._id.toString()
      );
      const presentCount = sessionRecords.filter(r => r.status === 'present').length;
      return {
        _id: session._id,
        date: session.date,
        startTime: session.startTime,
        isActive: session.isActive,
        presentCount,
        absentCount: cls.students.length - presentCount,
        total: cls.students.length
      };
    });

    res.json({
      success: true,
      class: cls,
      sessions: sessionBreakdown,
      totalSessions,
      studentStats
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Single session detail — each student's status for that session
router.get('/session/:sessionId', protect, async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.sessionId)
      .populate('class', 'subjectName');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const records = await AttendanceRecord.find({ session: req.params.sessionId })
      .populate('student', 'name email rollNumber');

    res.json({ success: true, session, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;