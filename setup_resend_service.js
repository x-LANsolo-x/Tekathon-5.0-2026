const fs = require('fs');
let content = fs.readFileSync('/home/nocturn/OAA/Tekathon5.0/tekathon-backend/services/emailService.js', 'utf8');

// 1. Remove nodemailer and setup Resend
content = content.replace(
  "const nodemailer = require('nodemailer');",
  "const { Resend } = require('resend');\nconst resend = new Resend(process.env.RESEND_API_KEY);"
);

// Remove nodemailer transporter block entirely
content = content.replace(
  /const transporter = nodemailer\.createTransport\(\{\s*host:.*?\s*port:.*?\s*secure:.*?\s*auth: \{\s*user:.*?\s*pass:.*?\s*\},\s*\}\);/gs,
  ''
);

// We need to rewrite all functions in emailService to use Resend instead of nodemailer
// The functions are:
// - sendRegistrationEmail(toEmail, teamName, teamId)
// - sendEvaluatorOTPEmail(email, code)
// - sendEvaluatorWelcomeEmail(email, name, password)
// - sendResultsEmail(toEmail, teamName, score)
// - sendCustomMassEmail(emailsArray, subject, htmlBody)

const newContent = `
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Tekathon 5.0 <onboarding@resend.dev>'; // Resend free tier testing

async function sendRegistrationEmail(toEmail, teamName, teamId) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Tekathon 5.0 - Registration Successful',
      html: \`<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #00d2ff; border-radius: 10px;">
          <h2 style="color: #00d2ff;">Welcome to Tekathon 5.0</h2>
          <p>Your team <strong>\${teamName}</strong> has been successfully registered.</p>
          <p style="margin-top: 20px;">Use your registered email to log into the portal and manage your submission.</p>
        </div>\`
    });
  } catch (error) {
    console.error('[Resend Error]', error);
  }
}

async function sendEvaluatorOTPEmail(email, code) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Tekathon 5.0 Evaluator - Login Code',
      html: \`<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #00ff88; border-radius: 10px;">
          <h2 style="color: #00ff88;">Evaluator Portal</h2>
          <p>Your access code is:</p>
          <h1 style="letter-spacing: 5px; font-size: 36px; color: #00d2ff; background: rgba(0,210,255,0.1); padding: 10px; display: inline-block; border-radius: 8px;">\${code}</h1>
        </div>\`
    });
  } catch (error) {
    console.error('[Resend Error]', error);
  }
}

async function sendEvaluatorWelcomeEmail(email, name, password) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Tekathon 5.0 Evaluator Panel',
      html: \`<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; border: 2px solid #00ff88; border-radius: 10px;">
          <h2 style="color: #00ff88; text-align: center;">Welcome \${name}!</h2>
          <p>You have been added as an evaluator for Tekathon 5.0.</p>
          <p><strong>Login Email:</strong> \${email}</p>
          <p><strong>Temporary Password:</strong> \${password}</p>
          <p>Please log in and update your password.</p>
        </div>\`
    });
  } catch (error) {
    console.error('[Resend Error]', error);
  }
}

async function sendResultsEmail(toEmail, teamName, score) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Tekathon 5.0 - Your Results are Live!',
      html: \`<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #ff003c; border-radius: 10px;">
          <h2 style="color: #ff003c;">Results Announced</h2>
          <p>Hello Team <strong>\${teamName}</strong>,</p>
          <p>Your final evaluated score is:</p>
          <h1 style="font-size: 48px; color: #00d2ff;">\${score}</h1>
          <p>Login to the portal to view detailed feedback.</p>
        </div>\`
    });
  } catch (error) {
    console.error('[Resend Error]', error);
  }
}

async function sendCustomMassEmail(emailsArray, subject, htmlBody) {
  try {
    // Resend free tier only allows 1 to-email per API call if it's not a verified domain (or batch sending)
    // Actually, on the free tier they usually only allow sending to the verified email.
    // For now, we'll try to batch it (Resend allows up to 50 recipients per request usually, but we'll use Bcc if possible or send individually).
    for(const email of emailsArray) {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: subject,
            html: htmlBody
        });
    }
  } catch (error) {
    console.error('[Resend Mass Error]', error);
  }
}

module.exports = {
  sendRegistrationEmail,
  sendEvaluatorOTPEmail,
  sendEvaluatorWelcomeEmail,
  sendResultsEmail,
  sendCustomMassEmail
};
`;

fs.writeFileSync('/home/nocturn/OAA/Tekathon5.0/tekathon-backend/services/emailService.js', newContent);
console.log('EmailService rewritten for Resend!');
