const transporter = require('../config/nodemailer');
const { development } = require('../config/config');
const { email } = development;

const sendEmail = async ({ to, subject, text, html }) => {
  const mailOptions = {
    from: email,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
