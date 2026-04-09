const express = require('express');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const User    = require('../models/User');
const Class   = require('../models/Class');
const { protect } = require('../middleware/auth');
const router  = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });

// ── Register ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, deviceId, deviceModel, deviceFingerprint, teacherCode } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Teacher invite code
    if (role === 'teacher') {
      const validCode = process.env.TEACHER_CODE || 'TEACH2025';
      if (!teacherCode)
        return res.status(400).json({ success: false, message: 'Teacher invite code is required' });
      if (teacherCode.trim().toUpperCase() !== validCode.trim().toUpperCase())
        return res.status(400).json({ success: false, message: 'Invalid invite code. Ask your admin for the correct code.' });
    }

    // One account per device for students
    if (role === 'student' && deviceFingerprint) {
      const fpHash = crypto.createHash('sha256').update(deviceFingerprint).digest('hex');
      const taken  = await User.findOne({ deviceFingerprint: fpHash, role: 'student' });
      if (taken)
        return res.status(400).json({ success: false, deviceTaken: true, message: 'A student account already exists on this device.' });
    }

    const userData = { name, email, password, role, rollNumber };

    if (role === 'student' && deviceId) {
      userData.deviceId          = crypto.createHash('sha256').update(deviceId).digest('hex');
      userData.deviceModel       = deviceModel || 'Unknown Device';
      userData.deviceBound       = true;
      if (deviceFingerprint)
        userData.deviceFingerprint = crypto.createHash('sha256').update(deviceFingerprint).digest('hex');
    }

    const user = await User.create(userData);

    // ── Auto-enroll student into classes where they appear in approvedList ──
    if (role === 'student') {
      const query = [];
      if (rollNumber) query.push({ 'approvedList.rollNumber': rollNumber });
      if (email)      query.push({ 'approvedList.email': email.toLowerCase() });

      if (query.length) {
        const matchingClasses = await Class.find({ $or: query });
        for (const cls of matchingClasses) {
          if (!cls.students.includes(user._id)) {
            cls.students.push(user._id);
            user.enrolledClasses.push(cls._id);

            // Mark entry as enrolled
            const idx = cls.approvedList.findIndex(
              e => e.rollNumber === rollNumber || e.email === email?.toLowerCase()
            );
            if (idx !== -1) { cls.approvedList[idx].enrolled = true; cls.approvedList[idx].userId = user._id; }
            cls.totalStudents = cls.students.length;
            await cls.save();
          }
        }
        await user.save();
      }
    }

    const token = generateToken(user._id);
    res.status(201).json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, deviceBound: user.deviceBound }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId, deviceModel } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.role === 'student') {
      if (!deviceId) return res.status(403).json({ success: false, message: 'Device ID required' });
      const deviceHash = crypto.createHash('sha256').update(deviceId).digest('hex');
      if (user.deviceBound) {
        if (user.deviceId !== deviceHash)
          return res.status(403).json({ success: false, deviceBlocked: true, message: 'Account linked to a different device. Contact your teacher to reset.' });
      } else {
        user.deviceId = deviceHash; user.deviceModel = deviceModel || 'Unknown'; user.deviceBound = true;
        await user.save();
      }
    }

    const token = generateToken(user._id);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, rollNumber: user.rollNumber, deviceBound: user.deviceBound } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get current user ──────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── Reset device (teacher) ────────────────────────────────────────────────
router.patch('/reset-device/:userId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'teacher')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    const user = await User.findByIdAndUpdate(req.params.userId,
      { deviceId: null, deviceModel: null, deviceBound: false, deviceFingerprint: null },
      { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Device binding reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
