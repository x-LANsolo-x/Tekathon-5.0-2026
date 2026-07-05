const fetch = require('node-fetch');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbynC5sZmMjsZm_gAyG0kPGVATpgaIppz70SODSV5n6Bz0BxSiImBYablRqDmfYX7IlHyg/exec';

async function sendGAS(toEmail, subject, htmlBody) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
        subject: subject,
        html: htmlBody
      })
    });
    const data = await res.json();
    if(data.error) console.error('[GAS Error]', data.error);
  } catch (error) {
    console.error('[GAS Catch Error]', error);
  }
}

async function sendRegistrationEmail(toEmail, teamName, teamId) {
  await sendGAS(
    toEmail,
    'Tekathon 5.0 - Registration Successful',
    `<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #00d2ff; border-radius: 10px;">
      <h2 style="color: #00d2ff;">Welcome to Tekathon 5.0</h2>
      <p>Your team <strong>${teamName}</strong> has been successfully registered.</p>
      <p style="margin-top: 20px;">Use your registered email to log into the portal and manage your submission.</p>
    </div>`
  );
}

async function sendEvaluatorOTPEmail(email, code) {
  await sendGAS(
    email,
    'Tekathon 5.0 Evaluator - Login Code',
    `<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #00ff88; border-radius: 10px;">
      <h2 style="color: #00ff88;">Evaluator Portal</h2>
      <p>Your access code is:</p>
      <h1 style="letter-spacing: 5px; font-size: 36px; color: #00d2ff; background: rgba(0,210,255,0.1); padding: 10px; display: inline-block; border-radius: 8px;">${code}</h1>
    </div>`
  );
}

async function sendEvaluatorWelcomeEmail(email, name, password) {
  await sendGAS(
    email,
    'Welcome to Tekathon 5.0 Evaluator Panel',
    `<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; border: 2px solid #00ff88; border-radius: 10px;">
      <h2 style="color: #00ff88; text-align: center;">Welcome ${name}!</h2>
      <p>You have been added as an evaluator for Tekathon 5.0.</p>
      <p><strong>Login Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${password}</p>
      <p>Please log in and update your password.</p>
    </div>`
  );
}

async function sendResultsEmail(toEmail, teamName, score) {
  await sendGAS(
    toEmail,
    'Tekathon 5.0 - Your Results are Live!',
    `<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #ff003c; border-radius: 10px;">
      <h2 style="color: #ff003c;">Results Announced</h2>
      <p>Hello Team <strong>${teamName}</strong>,</p>
      <p>Your final evaluated score is:</p>
      <h1 style="font-size: 48px; color: #00d2ff;">${score}</h1>
      <p>Login to the portal to view detailed feedback.</p>
    </div>`
  );
}

async function sendCustomMassEmail(emailsArray, subject, htmlBody) {
  for(const email of emailsArray) {
      await sendGAS(email, subject, htmlBody);
  }
}

module.exports = {
  sendRegistrationEmail,
  sendEvaluatorOTPEmail,
  sendEvaluatorWelcomeEmail,
  sendResultsEmail,
  sendCustomMassEmail
};
