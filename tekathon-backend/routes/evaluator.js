const express = require('express');
const router = express.createElement ? express.Router : express.Router();
const bcrypt = require('bcrypt');
const { getEvaluators, updateEvaluatorPassword, getTeams, updateTeam } = require('../services/supabase');
const { sendEvaluatorOTPEmail } = require('../services/emailService');

// Auth Middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.evaluatorId) {
    next();
  } else {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
};

// --- OTP Store (Temporary Memory) ---
const otpStore = new Map(); // email -> { code, evaluatorId, expiry, isFirstLogin }

// --- Authentication APIs ---

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Fetch evaluators
    const evaluators = await getEvaluators();
    const evaluator = evaluators.find(e => e.email === email);
    
    if (!evaluator) return res.status(401).json({ error: 'Invalid credentials.' });

    // Verify Password
    const isMatch = await bcrypt.compare(password, evaluator.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    // Generate OTP instead of logging in
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { 
      code: otp, 
      evaluatorId: evaluator.id, 
      isFirstLogin: evaluator.is_first_login,
      expiry: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });

    await sendEvaluatorOTPEmail(email, otp);
    
    res.json({ success: true, message: 'OTP sent to email', reqOtp: true, email: evaluator.email });
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

    if (stored.isFirstLogin) {
      // Don't create session yet, just signal password reset
      return res.json({ success: true, requireReset: true, email });
    }

    // Create session securely
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session creation failed.' });
      req.session.evaluatorId = stored.evaluatorId;
      req.session.email = email;
      otpStore.delete(email);

      res.json({ success: true, message: 'Login verified.', user: { email } });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const stored = otpStore.get(email);

    if (!stored) {
      return res.status(401).json({ error: 'Invalid or expired OTP session.' });
    }
    
    if (stored.code !== otp) {
      stored.attempts += 1;
      if (stored.attempts >= 3) {
        otpStore.delete(email);
        return res.status(401).json({ error: 'Maximum attempts exceeded. Please request a new OTP.' });
      }
      return res.status(401).json({ error: `Invalid OTP. ${3 - stored.attempts} attempts remaining.` });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateEvaluatorPassword(email, hashedPassword);

    // Create session securely
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session creation failed.' });
      req.session.evaluatorId = stored.evaluatorId;
      req.session.email = email;
      otpStore.delete(email);

      res.json({ success: true, message: 'Password reset successfully. Logged in.' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const email = req.session.email;

    const evaluators = await getEvaluators();
    const evaluator = evaluators.find(e => e.email === email);
    
    if (!evaluator) return res.status(404).json({ error: 'Evaluator not found.' });

    const isMatch = await bcrypt.compare(currentPassword, evaluator.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect current password.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateEvaluatorPassword(email, hashedPassword);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully.' });
});

// --- Evaluation APIs ---

// Get teams assigned to logged-in evaluator
router.get('/teams', requireAuth, async (req, res) => {
  try {
    const allTeams = await getTeams();
    const assignedTeams = allTeams.filter(t => t.evaluatorId === req.session.evaluatorId)
      .map(t => ({
        teamId: t.teamId,
        teamName: t.teamName,
        problemStatement: t.problemStatement,
        pdfUrl: t.pdfUrl,
        status: t.status,
        score: t.score,
        is_flagged: t.is_flagged,
        flag_reason: t.flag_reason
      }));
      
    const evaluators = await getEvaluators();
    const evaluator = evaluators.find(e => e.id === req.session.evaluatorId);

    res.json({ success: true, teams: assignedTeams, evaluatorName: evaluator ? evaluator.name : 'Evaluator' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Flag Team
router.put('/teams/:id/flag', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const { id } = req.params;
    
    const teams = await getTeams();
    const team = teams.find(t => t.teamId === id);
    if (!team) return res.status(404).json({ error: 'Team not found.' });

    // Ensure the team belongs to the current evaluator
    if (team.evaluatorId !== req.session.evaluatorId) {
      return res.status(403).json({ error: 'Unauthorized to flag this team.' });
    }

    team.is_flagged = true;
    team.flag_reason = reason;
    
    await updateTeam(id, team);
    res.json({ success: true, message: 'Team flagged successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit score for a team
router.post('/score', requireAuth, async (req, res) => {
  try {
    const { teamId, problem, innovation, tech, presentation, impact } = req.body;
    
    // Validate inputs
    const p = Number(problem), i = Number(innovation), t = Number(tech), pre = Number(presentation), imp = Number(impact);
    if ([p, i, t, pre, imp].some(val => val < 0 || val > 20 || isNaN(val))) {
      return res.status(400).json({ error: 'Each score section must be between 0 and 20.' });
    }

    const total = p + i + t + pre + imp;

    // Fetch Teams from Sheet
    const teams = await getTeams();
    const team = teams.find(t => t.teamId === teamId && t.evaluatorId === req.session.evaluatorId);
    
    if (!team) return res.status(404).json({ error: 'Team not found or not assigned to you.' });
    
    if (team.status === 'completed') {
      return res.status(403).json({ error: 'Score is already locked and cannot be modified.' });
    }

    // Update data object
    team.score = { problem: p, innovation: i, tech: t, presentation: pre, impact: imp, total };
    team.status = 'completed';

    // Write back to database
    await updateTeam(team.teamId, team);

    res.json({ success: true, message: 'Score successfully locked.', total });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
