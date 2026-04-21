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
 * @param {Object|Array} tests - A single test or an array of test objects student is enrolled in.
 */
const sendEnrollmentEmail = async (student, tests) => {
  const portalUrl = process.env.STUDENT_PORTAL_URL || 'https://test-student-portal.netlify.app';
  const testList = Array.isArray(tests) ? tests : [tests];
  
  const testRowsHtml = testList.map(test => {
    const scheduledTime = test.scheduledDate 
      ? new Date(test.scheduledDate).toLocaleString('en-US', { 
          dateStyle: 'medium', 
          timeStyle: 'short' 
        }) 
      : 'Flexible';
    
    return `
      <div style="border-left: 4px solid #6366f1; background-color: #f8fafc; padding: 15px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
        <h3 style="margin: 0 0 5px 0; color: #1e293b; font-size: 16px;">${test.title}</h3>
        <p style="margin: 0; color: #64748b; font-size: 13px;">
          <strong>Subject:</strong> ${test.subject || 'General'} | 
          <strong>Duration:</strong> ${test.duration}m | 
          <strong>Scheduled:</strong> ${scheduledTime}
        </p>
      </div>
    `;
  }).join('');

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: student.email,
    subject: testList.length > 1 
      ? `📚 Enrolled in ${testList.length} New Tests` 
      : `📝 Enrolled in Test: ${testList[0].title}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 20px; text-align: center; color: white;">
          <div style="background-color: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
             <span style="font-size: 30px;">🎓</span>
          </div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Test Enrollment</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Success! You have been assigned new examinations.</p>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 18px; color: #1e293b;">Hi <strong>${student.name}</strong>,</p>
          <p>Great news! You have been enrolled in the following test(s) on the <strong>TestZen</strong> platform:</p>
          
          <div style="margin: 25px 0;">
            ${testRowsHtml}
          </div>

          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">How to Login</h3>
            <div style="margin-bottom: 15px;">
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Portal URL</p>
              <a href="${portalUrl}" style="color: #6366f1; text-decoration: none; font-weight: 600;">${portalUrl}</a>
            </div>
            <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Login Email</p>
                <p style="margin: 0; color: #1e293b; font-weight: 600;">${student.email}</p>
              </div>
              <div style="margin-top: 10px;">
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Password</p>
                <p style="margin: 0; color: #1e293b; font-weight: 600;">Use your registered password <br/><span style="font-size: 11px; font-weight: normal; color: #94a3b8;">(Default: Student@123 if set by admin)</span></p>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0 20px 0;">
            <a href="${portalUrl}" style="background-color: #6366f1; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);">Access Student Portal</a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 40px; padding-top: 20px;">
             <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1e293b;">Instructions:</p>
             <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
               <li>Ensure you have a stable internet connection.</li>
               <li>Log in at least 10 minutes before the scheduled time.</li>
               <li>Do not refresh the page during the examination.</li>
             </ul>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 25px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} TestZen Management Portal. All rights reserved.</p>
          <p style="margin: 0;">If you have any issues, please contact your administrator.</p>
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
