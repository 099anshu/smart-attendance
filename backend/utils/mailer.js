const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  }
});

const sendOTP = async (toEmail, otp, name) => {
  const mailOptions = {
    from: `"AttendX" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your AttendX Teacher Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0f; color: #f0f0fa; padding: 32px; border-radius: 16px;">
        <h1 style="font-size: 28px; margin-bottom: 4px;">Attend<span style="color: #8b83ff;">X</span></h1>
        <p style="color: #9090b0; margin-bottom: 32px; font-size: 14px;">Smart Attendance System</p>

        <p style="font-size: 16px; margin-bottom: 8px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #9090b0; font-size: 14px; margin-bottom: 28px;">
          Use the code below to verify your teacher registration. This code expires in <strong style="color: #f0f0fa;">10 minutes</strong>.
        </p>

        <div style="background: #1a1a24; border: 1px solid #2a2a38; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 28px;">
          <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #8b83ff;">${otp}</div>
          <div style="font-size: 12px; color: #5a5a78; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">Verification Code</div>
        </div>

        <p style="font-size: 12px; color: #5a5a78; line-height: 1.6;">
          If you did not request this code, someone may be trying to register as a teacher using your email. You can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #2a2a38; margin: 24px 0;" />
        <p style="font-size: 11px; color: #3a3a50;">© AttendX · Do not reply to this email</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTP };
