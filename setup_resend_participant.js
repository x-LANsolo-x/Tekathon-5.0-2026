const fs = require('fs');
let content = fs.readFileSync('/home/nocturn/OAA/Tekathon5.0/tekathon-backend/routes/participant.js', 'utf8');

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

// 2. Rewrite sendOTPEmail for Resend
const newSendOTPEmail = `
// Real email function via Resend API
async function sendOTPEmail(email, code) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Tekathon 5.0 <onboarding@resend.dev>',
      to: email,
      subject: 'Tekathon 5.0 - Login Verification Code',
      html: \`
        <div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #ff003c; border-radius: 10px;">
          <h2 style="color: #ff003c;">Tekathon 5.0</h2>
          <p>Your session initialization code is:</p>
          <h1 style="letter-spacing: 5px; font-size: 36px; color: #00d2ff; background: rgba(0,210,255,0.1); padding: 10px; display: inline-block; border-radius: 8px;">\${code}</h1>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
        </div>
      \`
    });
    if (error) {
      console.error('[Resend Error]', error);
    } else {
      console.log('Email sent via Resend:', data?.id);
    }
  } catch (err) {
    console.error('[SMTP Background Error]', err);
  }
}
`;

content = content.replace(
  /async function sendOTPEmail\(email, code\) \{.*?console\.error\('\[SMTP Error\] Failed to send OTP to \$\{email\}:', error\);\s*\}\s*\}/s,
  newSendOTPEmail
);

// Let's replace the whole function using a simpler string replacement since the regex might fail because of my custom edits in the previous commit.
// Actually I'll use a regex that matches from `async function sendOTPEmail` to the end of the function.
// Or just replace the content from the start of the function to the next empty line.
content = content.replace(/async function sendOTPEmail\(email, code\) \{[\s\S]*?\}\s*\}\n/s, newSendOTPEmail);

fs.writeFileSync('/home/nocturn/OAA/Tekathon5.0/tekathon-backend/routes/participant.js', content);
console.log('Participant routes updated with Resend API!');
