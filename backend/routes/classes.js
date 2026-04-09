const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const Class   = require('../models/Class');
const User    = require('../models/User');
const { protect, teacherOnly } = require('../middleware/auth');

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Helper: normalize a row from CSV/Excel ────────────────────────────────
function normalizeRow(row) {
  // Accept various column name formats
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
      if (found && row[found] !== undefined && row[found] !== '') return String(row[found]).trim();
    }
    return '';
  };
  return {
    rollNumber: get('roll_number', 'rollnumber', 'roll no', 'rollno', 'roll', 'prn'),
    email:      get('email', 'email id', 'emailid', 'e-mail').toLowerCase(),
    name:       get('name', 'student name', 'studentname', 'full name', 'fullname'),
  };
}

// ── Create class (teacher only) ───────────────────────────────────────────
router.post('/create', protect, teacherOnly, async (req, res) => {
  try {
    const { subjectName, subjectCode, semester } = req.body;
    if (!subjectName || !subjectCode || !semester)
      return res.status(400).json({ success: false, message: 'All fields required' });
    const cls = await Class.create({ subjectName, subjectCode, semester, teacher: req.user._id });
    res.status(201).json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Upload CSV/Excel roster ───────────────────────────────────────────────
router.post('/:id/upload-roster', protect, teacherOnly, upload.single('file'), async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    if (cls.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your class' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Parse Excel or CSV
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length)
      return res.status(400).json({ success: false, message: 'File is empty or has no data rows' });

    const newEntries = rows.map(normalizeRow).filter(r => r.rollNumber || r.email);

    if (!newEntries.length)
      return res.status(400).json({ success: false, message: 'No valid rows found. Columns needed: name, roll_number, email' });

    // Merge with existing list — avoid duplicates
    const existing = cls.approvedList || [];
    const existingKeys = new Set(existing.map(e => [e.rollNumber, e.email].join('|')));

    const toAdd = newEntries.filter(e => !existingKeys.has([e.rollNumber, e.email].join('|')));
    cls.approvedList.push(...toAdd);

    // Auto-enroll any already-registered users matching roll or email
    for (const entry of toAdd) {
      const query = [];
      if (entry.rollNumber) query.push({ rollNumber: entry.rollNumber });
      if (entry.email)      query.push({ email: entry.email });
      if (!query.length) continue;

      const user = await User.findOne({ role: 'student', $or: query });
      if (user && !cls.students.includes(user._id)) {
        cls.students.push(user._id);
        const idx = cls.approvedList.findIndex(
          e => e.rollNumber === entry.rollNumber || e.email === entry.email
        );
        if (idx !== -1) { cls.approvedList[idx].enrolled = true; cls.approvedList[idx].userId = user._id; }
        await User.findByIdAndUpdate(user._id, { $addToSet: { enrolledClasses: cls._id } });
      }
    }

    cls.totalStudents = cls.students.length;
    await cls.save();

    res.json({ success: true, added: toAdd.length, total: cls.approvedList.length, message: `${toAdd.length} students added to roster` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Add single student to approved list ──────────────────────────────────
router.post('/:id/add-student', protect, teacherOnly, async (req, res) => {
  try {
    const { rollNumber, email, name } = req.body;
    if (!rollNumber && !email)
      return res.status(400).json({ success: false, message: 'Roll number or email required' });

    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    if (cls.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your class' });

    // Check duplicate
    const dup = cls.approvedList.find(e =>
      (rollNumber && e.rollNumber === rollNumber) || (email && e.email === email?.toLowerCase())
    );
    if (dup) return res.status(400).json({ success: false, message: 'Student already in roster' });

    const entry = { rollNumber: rollNumber || '', email: (email || '').toLowerCase(), name: name || '' };

    // Auto-enroll if already registered
    const query = [];
    if (rollNumber) query.push({ rollNumber });
    if (email)      query.push({ email: email.toLowerCase() });
    const user = query.length ? await User.findOne({ role: 'student', $or: query }) : null;
    if (user && !cls.students.includes(user._id)) {
      cls.students.push(user._id);
      entry.enrolled = true;
      entry.userId = user._id;
      await User.findByIdAndUpdate(user._id, { $addToSet: { enrolledClasses: cls._id } });
    }

    cls.approvedList.push(entry);
    cls.totalStudents = cls.students.length;
    await cls.save();

    res.json({ success: true, message: 'Student added to roster', enrolled: !!user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Remove student from approved list ────────────────────────────────────
router.delete('/:id/remove-student', protect, teacherOnly, async (req, res) => {
  try {
    const { rollNumber, email } = req.body;
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

    const entry = cls.approvedList.find(e =>
      (rollNumber && e.rollNumber === rollNumber) || (email && e.email === email)
    );
    if (!entry) return res.status(404).json({ success: false, message: 'Student not in roster' });

    // Remove from students array too
    if (entry.userId) {
      cls.students = cls.students.filter(s => s.toString() !== entry.userId.toString());
      await User.findByIdAndUpdate(entry.userId, { $pull: { enrolledClasses: cls._id } });
    }
    cls.approvedList = cls.approvedList.filter(e =>
      !(rollNumber && e.rollNumber === rollNumber) && !(email && e.email === email)
    );
    cls.totalStudents = cls.students.length;
    await cls.save();

    res.json({ success: true, message: 'Student removed from roster' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get teacher's classes ─────────────────────────────────────────────────
router.get('/my-classes', protect, async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'teacher') {
      classes = await Class.find({ teacher: req.user._id }).populate('students', 'name email rollNumber');
    } else {
      classes = await Class.find({ students: req.user._id }).populate('teacher', 'name email');
    }
    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get class by ID ───────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate('students', 'name email rollNumber deviceBound')
      .populate('teacher', 'name email');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get students in class (teacher) ──────────────────────────────────────
router.get('/:id/students', protect, teacherOnly, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate('students', 'name email rollNumber deviceBound deviceModel');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, students: cls.students, approvedList: cls.approvedList });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
