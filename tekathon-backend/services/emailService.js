const nodemailer = require('nodemailer');

// Configure NodeMailer transporter using environment variables
// It is recommended to use an SMTP service like Brevo/SendGrid, or a Gmail account with an "App Password".
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // e.g., your_email@gmail.com
    pass: process.env.SMTP_PASS, // e.g., your_gmail_app_password
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ SMTP Connection Error: Please configure your .env file for the email service to work.');
  } else {
    console.log('✅ SMTP Server is ready to take our messages');
  }
});

const sendRegistrationEmail = async (toEmail, teamName, teamId) => {
  try {
    const mailOptions = {
      from: `"Tekathon 5.0 Core" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Registration Successful: ${teamName} (${teamId})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #050508; color: #f0f4f8;">
          <h2 style="color: #00f0ff;">System Initialization Complete</h2>
          <p>Welcome, Team <strong>${teamName}</strong>.</p>
          <p>Your payload has been successfully uploaded to the Tekathon 5.0 mainframe. Your assigned Registration ID is:</p>
          <h3 style="background: #111; padding: 10px; border: 1px solid #00f0ff; display: inline-block; color: #fff;">${teamId}</h3>
          <p>Please retain this ID for all future communications and evaluation queues.</p>
          <hr style="border: 1px solid #333;" />
          <p style="font-size: 12px; color: #888;">This is an automated transmission from the Tekathon Nexus.</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Registration confirmation sent to ${toEmail}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send registration email to ${toEmail}: `, err.message);
  }
};

const sendResultsEmail = async (toEmail, teamName, scoreTotal) => {
  try {
    const mailOptions = {
      from: `"Tekathon 5.0 Nexus" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Tekathon 5.0 - Final Evaluation Status: ${teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #050508; color: #f0f4f8;">
          <h2 style="color: #10b981;">Evaluation Protocol Terminated</h2>
          <p>Greetings, Team <strong>${teamName}</strong>.</p>
          <p>The Super Admin has officially published the final results for Tekathon 5.0. Your team's validated score is:</p>
          <h1 style="color: #10b981;">${scoreTotal} / 100</h1>
          <p>Check the live leaderboard dashboard for your global ranking.</p>
          <hr style="border: 1px solid #333;" />
          <p style="font-size: 12px; color: #888;">This is an automated transmission from the Tekathon Nexus.</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Results published to ${toEmail}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send results email to ${toEmail}: `, err.message);
  }
};

const sendEvaluatorWelcomeEmail = async (toEmail, name, tempPassword) => {
  try {
    const mailOptions = {
      from: `"Tekathon 5.0 Nexus" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Tekathon 5.0 - Evaluator Registration`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #050508; color: #f0f4f8; border: 1px solid #ff003c; border-radius: 8px;">
          <h2 style="color: #ff003c;">Evaluator Protocol Initiated</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Congratulations, you have been registered as an Evaluator for the Tekathon 5.0 Hackathon.</p>
          <p>Your first-time temporary login details are as follows:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Login ID:</strong> ${toEmail}</li>
            <li><strong>Temporary Password:</strong> <code style="background: rgba(255,0,60,0.2); padding: 5px; color: #ff003c;">${tempPassword}</code></li>
          </ul>
          <p>You will be required to verify your login via OTP and reset your password on your first session.</p>
          <hr style="border: 1px solid #333;" />
          <p style="font-size: 12px; color: #888;">This is an automated transmission from the Tekathon Nexus.</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Evaluator Welcome sent to ${toEmail}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send evaluator welcome email to ${toEmail}: `, err.message);
  }
};

const sendEvaluatorOTPEmail = async (email, code) => {
  try {
    const mailOptions = {
      from: `"Tekathon 5.0" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Tekathon 5.0 - Evaluator Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #00e5ff; border-radius: 10px;">
          <h2 style="color: #00e5ff;">Tekathon 5.0 - Evaluator Access</h2>
          <p>Your session initialization code is:</p>
          <h1 style="letter-spacing: 5px; font-size: 36px; color: #00e5ff; background: rgba(0,229,255,0.1); padding: 10px; display: inline-block; border-radius: 8px;">${code}</h1>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Successfully sent Evaluator OTP to ${email}`);
  } catch (error) {
    console.error(`[SMTP Error] Failed to send Evaluator OTP to ${email}:`, error);
    console.log(`\n\n--- FALLBACK Evaluator OTP for ${email} is: ${code} ---\n\n`);
  }
};

const sendCustomMassEmail = async (emailsArray, subject, bodyHtml) => {
  try {
    if (!emailsArray || emailsArray.length === 0) return;
    
    // We use BCC to send to multiple recipients without exposing their emails to each other
    const mailOptions = {
      from: `"Tekathon 5.0 Comm" <${process.env.SMTP_USER}>`,
      bcc: emailsArray.join(','), 
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #050508; color: #f0f4f8; border: 1px solid #3b82f6; border-radius: 8px;">
          ${bodyHtml}
          <hr style="border: 1px solid #333; margin-top: 30px;" />
          <p style="font-size: 12px; color: #888;">This is an official communication from the Tekathon Nexus Administration.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Successfully sent mass email to ${emailsArray.length} recipients. Subject: ${subject}`);
  } catch (error) {
    console.error(`[SMTP Error] Failed to send mass email:`, error);
    throw error;
  }
};

module.exports = {
  sendRegistrationEmail,
  sendResultsEmail,
  sendEvaluatorWelcomeEmail,
  sendEvaluatorOTPEmail,
  sendCustomMassEmail
};
