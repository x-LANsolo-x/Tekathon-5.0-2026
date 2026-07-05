const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { appendTeam, getTeams, createTeamLeader, getTeamLeaderByEmail, updateTeamLeaderPassword } = require('../services/supabase');
const { sendRegistrationEmail } = require('../services/emailService');
const { uploadToDrive, createFolder } = require('../services/googleDrive');

// Use Memory Storage so we can pipe the buffer directly to Google Drive
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdfMime && isPdfExt) cb(null, true);
    else cb(new Error('Only PDF format is allowed and file must have .pdf extension!'), false);
  }
});

// Auth Middleware
const requireParticipantAuth = (req, res, next) => {
  if (req.session && req.session.leaderId) {
    next();
  } else {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
};

// --- OTP Store (Temporary Memory) ---
const otpStore = new Map(); // email -> { code, leaderId, expiry }

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Real email function
async function sendOTPEmail(email, code) {
  try {
    const mailOptions = {
      from: `"Tekathon 5.0" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Tekathon 5.0 - Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #ff003c; border-radius: 10px;">
          <h2 style="color: #ff003c;">Tekathon 5.0</h2>
          <p>Your session initialization code is:</p>
          <h1 style="letter-spacing: 5px; font-size: 36px; color: #00d2ff; background: rgba(0,210,255,0.1); padding: 10px; display: inline-block; border-radius: 8px;">${code}</h1>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Successfully sent OTP to ${email}`);
  } catch (error) {
    console.error(`[SMTP Error] Failed to send OTP to ${email}:`, error);
    // Still log it for dev fallback in case SMTP isn't configured
    console.log(`\n\n--- FALLBACK OTP for ${email} is: ${code} ---\n\n`);
  }
}

// --- Authentication APIs ---

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email.endsWith('@cuchd.in')) {
      return res.status(400).json({ error: 'Only @cuchd.in email addresses are allowed.' });
    }

    const existing = await getTeamLeaderByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const leaderId = crypto.randomUUID();

    await createTeamLeader({ id: leaderId, email, password: hashedPassword });

    // Generate OTP instead of logging in
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code: otp, leaderId: leaderId, expiry: Date.now() + 10 * 60 * 1000, attempts: 0 });
    
    await sendOTPEmail(email, otp);

    res.status(201).json({ success: true, message: 'Account created successfully. OTP sent.', reqOtp: true, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const leader = await getTeamLeaderByEmail(email);
    if (!leader) return res.status(401).json({ error: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, leader.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    // Generate OTP instead of logging in
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code: otp, leaderId: leader.id, expiry: Date.now() + 10 * 60 * 1000, attempts: 0 });

    await sendOTPEmail(email, otp);
    
    res.json({ success: true, message: 'OTP sent to email', reqOtp: true, email: leader.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const stored = otpStore.get(email);

    if (!stored) return res.status(400).json({ error: 'No OTP requested for this email.' });
    if (Date.now() > stored.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP expired.' });
    }
    
    if (stored.code !== otp) {
      stored.attempts += 1;
      if (stored.attempts >= 3) {
        otpStore.delete(email);
        return res.status(401).json({ error: 'Maximum attempts exceeded. Please request a new OTP.' });
      }
      return res.status(401).json({ error: `Invalid OTP. ${3 - stored.attempts} attempts remaining.` });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session creation failed.' });
      req.session.leaderId = stored.leaderId;
      req.session.email = email;
      otpStore.delete(email);

      res.json({ success: true, message: 'Login verified.', user: { email } });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/password', requireParticipantAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const email = req.session.email;

    const leader = await getTeamLeaderByEmail(email);
    if (!leader) return res.status(404).json({ error: 'Participant not found.' });

    const isMatch = await bcrypt.compare(currentPassword, leader.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect current password.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateTeamLeaderPassword(email, hashedPassword);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully.' });
});

router.get('/dashboard', requireParticipantAuth, async (req, res) => {
  try {
    const allTeams = await getTeams();
    const myTeam = allTeams.find(t => t.members.some(m => m.email === req.session.email));
    
    if (myTeam) {
      res.json({ success: true, hasTeam: true, team: myTeam });
    } else {
      res.json({ success: true, hasTeam: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-member', requireParticipantAuth, async (req, res) => {
  try {
    const { email, uid, phone } = req.body;
    const { checkDuplicateMember } = require('../services/supabase');
    
    if (email && await checkDuplicateMember('email', email)) return res.json({ duplicate: true, field: 'email' });
    if (uid && await checkDuplicateMember('uid', uid)) return res.json({ duplicate: true, field: 'uid' });
    if (phone && await checkDuplicateMember('phone', phone)) return res.json({ duplicate: true, field: 'phone' });

    res.json({ duplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Registration APIs ---

// Wrapper for multer to handle errors gracefully
const uploadHandler = (req, res, next) => {
  upload.single('payload')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File exceeds maximum size of 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.post('/submit-team', requireParticipantAuth, uploadHandler, async (req, res) => {
  try {
    const { teamName, problemStatement, members } = req.body;
    const parsedMembers = JSON.parse(members); 

    // System Constraints Validation
    const allTeams = await getTeams();
    if (allTeams.length >= 2000) {
      return res.status(403).json({ error: 'System Capacity Reached: Maximum 2,000 teams allowed.' });
    }

    if (parsedMembers.length !== 6) {
      return res.status(400).json({ error: 'Team size must be exactly 6 members.' });
    }

    // Verify leader is in the members list
    const hasLeader = parsedMembers.some(m => m.email === req.session.email);
    if (!hasLeader) {
       return res.status(400).json({ error: 'Team Leader must be included in the team members.' });
    }

    const allValidEmails = parsedMembers.every(m => m.email.endsWith('@cuchd.in'));
    if (!allValidEmails) {
      return res.status(400).json({ error: 'Security Protocol: All team members must use an @cuchd.in email domain.' });
    }
    
    const hasFemale = parsedMembers.some(m => m.gender === 'Female');
    if (!hasFemale) {
      return res.status(400).json({ error: 'Diversity Protocol: At least one female member is required per team.' });
    }

    // STRICT UNIQUENESS CHECK
    const submittedEmails = parsedMembers.map(m => m.email);
    const submittedPhones = parsedMembers.map(m => m.phone);
    
    for (const team of allTeams) {
      for (const existingMember of team.members) {
        if (submittedEmails.includes(existingMember.email)) {
           return res.status(400).json({ error: `Security Alert: Email ${existingMember.email} is already registered with another team.` });
        }
        if (existingMember.phone && submittedPhones.includes(existingMember.phone)) {
           return res.status(400).json({ error: `Security Alert: Phone number ${existingMember.phone} is already registered with another team.` });
        }
      }
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Project PDF payload is required.' });
    }

    // Create Team Data Object
    const teamId = 'SIH26-' + Math.floor(100000 + Math.random() * 900000);
    const fileName = `${teamId}_${teamName.replace(/\s+/g, '_')}.pdf`;

    // 1. Create Team Folder inside master Google Drive Folder
    const masterFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const teamFolderName = `${teamId}_${teamName}`;
    const teamFolderId = await createFolder(teamFolderName, masterFolderId);

    // 2. Upload Buffer directly to the newly created Team Folder
    const driveUrl = await uploadToDrive(req.file.buffer, fileName, req.file.mimetype, teamFolderId);

    const newTeam = {
      teamId,
      teamName,
      problemStatement,
      members: parsedMembers,
      pdfUrl: driveUrl,
      status: 'pending',
      score: {},
      evaluatorId: null
    };

    // Save to Database
    await appendTeam(newTeam);

    // Send Real Email via NodeMailer Service
    await sendRegistrationEmail(req.session.email, teamName, teamId);

    res.status(201).json({ success: true, teamId, message: 'Team registration successful!' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
