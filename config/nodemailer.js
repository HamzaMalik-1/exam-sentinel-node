const nodemailer = require('nodemailer');
const { development } = require('./config');

const { sendGridUsername, sendGridApiKey } = development;

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: sendGridUsername,
    pass: sendGridApiKey,
  },
});

module.exports = transporter;
