const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an enrollment email to a student.
 * @param {Object} student - The student user object.
 * @param {Object} test - The test object.
 */
const sendEnrollmentEmail = async (student, test) => {
  const portalUrl = process.env.STUDENT_PORTAL_URL || 'https://test-student-portal.netlify.app';
  const scheduledTime = test.scheduledDate 
    ? new Date(test.scheduledDate).toLocaleString('en-US', { 
        dateStyle: 'full', 
        timeStyle: 'short' 
      }) 
    : 'Flexible';

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: student.email,
    subject: `📝 Enrolled in Test: ${test.title}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #6366f1; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">New Test Enrollment</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hi <strong>${student.name}</strong>,</p>
          <p>You have been enrolled in a new test on TestZen. Here are the details:</p>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Test Title:</strong> ${test.title}</p>
            <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${test.subject || 'General'}</p>
            <p style="margin: 0 0 10px 0;"><strong>Scheduled For:</strong> ${scheduledTime}</p>
            <p style="margin: 0 0 10px 0;"><strong>Duration:</strong> ${test.duration} minutes</p>
            <p style="margin: 0;"><strong>Instructions:</strong> ${test.description || 'Follow standard test procedures.'}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${portalUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Portal</a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            If you have any issues, please contact the administrator.
          </p>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
          &copy; ${new Date().getFullYear()} TestZen Management Portal. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendEnrollmentEmail,
};
