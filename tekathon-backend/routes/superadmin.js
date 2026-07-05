const express = require('express');
const router = express.createElement ? express.Router : express.Router();
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const { getEvaluators, appendEvaluator, getTeams, updateTeam, getSuperAdminPassword, updateSuperAdminPassword } = require('../services/supabase');
const { sendResultsEmail, sendCustomMassEmail } = require('../services/emailService');

// Auth Middleware for Super Admin
const requireSuperAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'superadmin') {
    next();
  } else {
    return res.status(401).json({ error: 'Unauthorized. Super Admin access required.' });
  }
};

// --- Authentication APIs ---
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const currentPasswordHash = await getSuperAdminPassword();
  
  const isMatch = await bcrypt.compare(password, currentPasswordHash);
  if (isMatch) {
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session creation failed.' });
      req.session.role = 'superadmin';
      res.json({ success: true, message: 'Super Admin access granted.' });
    });
  } else {
    res.status(401).json({ error: 'Invalid master key.' });
  }
});

router.put('/password', requireSuperAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const actualPasswordHash = await getSuperAdminPassword();

  const isMatch = await bcrypt.compare(currentPassword, actualPasswordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect current password.' });
  }

  try {
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await updateSuperAdminPassword(newHashedPassword);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully.' });
});

// --- Management APIs ---

// List all Evaluators
router.get('/evaluators', requireSuperAdmin, async (req, res) => {
  try {
    const evaluators = await getEvaluators();
    const teams = await getTeams();

    // Calculate workload
    const enrichedEvaluators = evaluators.map(eval => {
      const assignedTeams = teams.filter(t => t.evaluatorId === eval.id);
      return {
        id: eval.id,
        name: eval.name,
        email: eval.email,
        assignedTeams: assignedTeams.length,
        completedEvaluations: assignedTeams.filter(t => t.status === 'completed').length
      };
    });

    res.json({ success: true, evaluators: enrichedEvaluators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new Evaluator
router.post('/evaluators', requireSuperAdmin, async (req, res) => {
  try {
    const evaluators = await getEvaluators();
    if (evaluators.length >= 50) {
      return res.status(403).json({ error: 'System Capacity Reached: Maximum 50 evaluators allowed.' });
    }

    const { name, email, contact_number, designation, organisation, theme } = req.body;
    
    // Check if email already exists
    if (evaluators.some(e => e.email === email)) {
      return res.status(400).json({ error: 'An evaluator with this email already exists.' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const evaluatorId = 'EV-' + Math.floor(1000 + Math.random() * 9000);
    
    await appendEvaluator({
      id: evaluatorId,
      name,
      email,
      password: hashedPassword,
      contact_number,
      designation,
      organisation,
      theme
    });

    // Send Welcome Email with temporary credentials
    const { sendEvaluatorWelcomeEmail } = require('../services/emailService');
    await sendEvaluatorWelcomeEmail(email, name, tempPassword);

    res.status(201).json({ success: true, message: 'Evaluator added successfully.', evaluatorId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all Teams
router.get('/teams', requireSuperAdmin, async (req, res) => {
  try {
    const teams = await getTeams();
    const evaluators = await getEvaluators();

    // Populate evaluator details manually
    const populatedTeams = teams.map(team => {
      const ev = evaluators.find(e => e.id === team.evaluatorId);
      return {
        ...team,
        evaluatorDetails: ev ? { name: ev.name, email: ev.email } : null
      };
    });

    res.json({ success: true, teams: populatedTeams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Team manually by Super Admin
router.post('/teams', requireSuperAdmin, async (req, res) => {
  try {
    const { teamName, problemStatement, theme, members } = req.body;
    const teamId = 'SIH26-' + Math.floor(100000 + Math.random() * 900000);

    const teamData = {
      teamId,
      teamName,
      problemStatement,
      theme,
      members: members || [],
      status: 'pending',
      score: { problem: 0, innovation: 0, tech: 0, presentation: 0, impact: 0, total: 0 }
    };

    const { appendTeam } = require('../services/supabase');
    await appendTeam(teamData);

    res.status(201).json({ success: true, message: 'Team created successfully', team: teamData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-member', requireSuperAdmin, async (req, res) => {
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

// Assign Teams to Evaluator
router.post('/assign', requireSuperAdmin, async (req, res) => {
  try {
    const { evaluatorId, teamIds } = req.body;
    
    const evaluators = await getEvaluators();
    const evaluator = evaluators.find(e => e.id === evaluatorId);
    if (!evaluator) return res.status(404).json({ error: 'Evaluator not found.' });

    const teams = await getTeams();
    
    for (const teamId of teamIds) {
      const team = teams.find(t => t.teamId === teamId);
      if (team) {
        // Enforce strict theme matching if evaluator has a theme
        if (evaluator.theme && team.theme && evaluator.theme !== team.theme) {
          continue; // Skip this team due to theme mismatch
        }
        team.evaluatorId = evaluatorId;
        await updateTeam(team.teamId, team);
      }
    }

    res.json({ success: true, message: `Successfully assigned teams to ${evaluator.name}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Team (Edit)
router.put('/teams/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { teamName, problemStatement } = req.body;
    const { id } = req.params;
    
    const teams = await getTeams();
    const team = teams.find(t => t.teamId === id);
    if (!team) return res.status(404).json({ error: 'Team not found.' });

    team.teamName = teamName;
    team.problemStatement = problemStatement;
    
    await updateTeam(id, team);
    res.json({ success: true, message: 'Team updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Flag Team
router.put('/teams/:id/flag', requireSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const { id } = req.params;
    
    const teams = await getTeams();
    const team = teams.find(t => t.teamId === id);
    if (!team) return res.status(404).json({ error: 'Team not found.' });

    team.is_flagged = true;
    team.flag_reason = reason;
    
    await updateTeam(id, team);
    res.json({ success: true, message: 'Team flagged successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Team
router.delete('/teams/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteTeam } = require('../services/supabase');
    
    await deleteTeam(id);
    res.json({ success: true, message: 'Team deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Results & Release APIs ---

// Get Leaderboard
router.get('/leaderboard', requireSuperAdmin, async (req, res) => {
  try {
    const teams = await getTeams();
    const evaluators = await getEvaluators();

    const leaderboard = teams
      .filter(t => t.status === 'completed')
      .sort((a, b) => (b.score.total || 0) - (a.score.total || 0))
      .map(team => {
        const ev = evaluators.find(e => e.id === team.evaluatorId);
        return {
          teamId: team.teamId,
          teamName: team.teamName,
          problemStatement: team.problemStatement,
          score: team.score,
          evaluatorName: ev ? ev.name : 'Unknown'
        };
      });

    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spot-check Unlock (Force unlock a score)
router.post('/spotcheck-unlock', requireSuperAdmin, async (req, res) => {
  try {
    const { teamId } = req.body;
    const teams = await getTeams();
    const team = teams.find(t => t.teamId === teamId);
    
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    
    team.status = 'pending';
    await updateTeam(team.teamId, team);

    res.json({ success: true, message: `Team ${teamId} evaluation status reset to pending in Google Sheets.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish Results
router.post('/publish', requireSuperAdmin, async (req, res) => {
  try {
    const teams = await getTeams();
    const completedTeams = teams.filter(t => t.status === 'completed');

    if (completedTeams.length === 0) {
      return res.status(400).json({ error: 'No completed teams to publish.' });
    }

    // Dispatch emails to all completed teams asynchronously
    for (const team of completedTeams) {
      // Find leader email
      const leaderEmail = team.members && team.members.length > 0 ? team.members[0].email : null;
      if (leaderEmail) {
        await sendResultsEmail(leaderEmail, team.teamName, team.score.total || 0);
      }
    }

    res.json({ success: true, message: `Results published successfully. Dispatched ${completedTeams.length} emails.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export Tools: Generate Excel Report
router.get('/export', requireSuperAdmin, async (req, res) => {
  try {
    const { type } = req.query; // all, leaderboard, teams, evaluators, anomalies
    const teams = await getTeams();
    const evaluators = await getEvaluators();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tekathon 5.0 Super Admin';

    // 1. Leaderboard Sheet
    if (!type || type === 'all' || type === 'leaderboard') {
      const leaderboardSheet = workbook.addWorksheet('Leaderboard');
      leaderboardSheet.columns = [
        { header: 'Rank', key: 'rank', width: 10 },
        { header: 'Team ID', key: 'teamId', width: 15 },
        { header: 'Team Name', key: 'teamName', width: 25 },
        { header: 'Theme', key: 'theme', width: 20 },
        { header: 'Problem Statement', key: 'ps', width: 40 },
        { header: 'Total Score', key: 'score', width: 15 },
        { header: 'Evaluated By', key: 'evaluator', width: 25 }
      ];

      const rankedTeams = teams
        .filter(t => t.status === 'completed')
        .sort((a, b) => (b.score.total || 0) - (a.score.total || 0));

      rankedTeams.forEach((team, index) => {
        const ev = evaluators.find(e => e.id === team.evaluatorId);
        leaderboardSheet.addRow({
          rank: index + 1,
          teamId: team.teamId,
          teamName: team.teamName,
          theme: team.theme || 'N/A',
          ps: team.problemStatement,
          score: team.score.total,
          evaluator: ev ? ev.name : 'Unknown'
        });
      });
    }

    // 2. All Teams Sheet
    if (!type || type === 'all' || type === 'teams') {
      const allTeamsSheet = workbook.addWorksheet('All Teams');
      
      const columns = [
        { header: 'Team ID', key: 'teamId', width: 15 },
        { header: 'Team Name', key: 'teamName', width: 25 },
        { header: 'Theme', key: 'theme', width: 20 },
        { header: 'Domain', key: 'domain', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'PDF Link', key: 'pdf', width: 40 }
      ];

      // Add 6 members' columns
      for (let i = 1; i <= 6; i++) {
        const prefix = i === 1 ? 'Leader' : `M${i}`;
        columns.push({ header: `${prefix} Name`, key: `m${i}_name`, width: 20 });
        columns.push({ header: `${prefix} Email`, key: `m${i}_email`, width: 25 });
        columns.push({ header: `${prefix} UID`, key: `m${i}_uid`, width: 15 });
        columns.push({ header: `${prefix} Phone`, key: `m${i}_phone`, width: 15 });
        columns.push({ header: `${prefix} Dept`, key: `m${i}_dept`, width: 15 });
        columns.push({ header: `${prefix} Gender`, key: `m${i}_gender`, width: 10 });
      }
      
      allTeamsSheet.columns = columns;

      teams.forEach(team => {
        const rowData = {
          teamId: team.teamId,
          teamName: team.teamName,
          theme: team.theme || 'N/A',
          domain: team.problemStatement,
          status: team.status.toUpperCase(),
          pdf: team.pdfUrl || 'None'
        };

        const members = team.members || [];
        for (let i = 0; i < 6; i++) {
          const m = members[i] || {};
          const j = i + 1;
          rowData[`m${j}_name`] = m.name || '';
          rowData[`m${j}_email`] = m.email || '';
          rowData[`m${j}_uid`] = m.uid || '';
          rowData[`m${j}_phone`] = m.phone || '';
          rowData[`m${j}_dept`] = m.department || '';
          rowData[`m${j}_gender`] = m.gender || '';
        }

        allTeamsSheet.addRow(rowData);
      });
    }

    // 3. Evaluator Workload Sheet
    if (!type || type === 'all' || type === 'evaluators') {
      const evalSheet = workbook.addWorksheet('Evaluator Workload');
      evalSheet.columns = [
        { header: 'Evaluator ID', key: 'id', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Theme', key: 'theme', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Designation', key: 'desig', width: 30 },
        { header: 'Assigned Teams', key: 'assigned', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 }
      ];

      evaluators.forEach(ev => {
        const assigned = teams.filter(t => t.evaluatorId === ev.id);
        const completed = assigned.filter(t => t.status === 'completed');
        evalSheet.addRow({
          id: ev.id,
          name: ev.name,
          theme: ev.theme || 'N/A',
          email: ev.email,
          phone: ev.contact_number || '',
          desig: ev.designation ? `${ev.designation} @ ${ev.organisation}` : '',
          assigned: assigned.length,
          completed: completed.length
        });
      });
    }

    // 4. Anomalies Sheet
    if (!type || type === 'all' || type === 'anomalies') {
      const anomalySheet = workbook.addWorksheet('System Anomalies');
      anomalySheet.columns = [
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Team ID', key: 'teamId', width: 15 },
        { header: 'Team Name', key: 'teamName', width: 25 },
        { header: 'Reason', key: 'reason', width: 50 },
        { header: 'Score', key: 'score', width: 10 }
      ];

      teams.forEach(team => {
        if (team.is_flagged) {
          anomalySheet.addRow({
            type: 'MANUAL FLAG',
            teamId: team.teamId,
            teamName: team.teamName,
            reason: team.flag_reason || 'Flagged by Super Admin',
            score: team.status === 'completed' ? team.score?.total : 'N/A'
          });
        }
        if (team.status === 'completed' && team.score?.total === 100) {
          anomalySheet.addRow({
            type: 'AUTO FLAG',
            teamId: team.teamId,
            teamName: team.teamName,
            reason: 'Perfect score of 100 detected. Potential anomaly.',
            score: 100
          });
        }
      });
    }

    // Format headers
    workbook.eachSheet((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FFD3D3D3' } };
    });

    let filename = "Tekathon_5.0_Report.xlsx";
    if (type === 'leaderboard') filename = "Leaderboard.xlsx";
    if (type === 'teams') filename = "All_Teams.xlsx";
    if (type === 'evaluators') filename = "Evaluators.xlsx";
    if (type === 'anomalies') filename = "System_Anomalies.xlsx";

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Mass Mailing Route
router.post('/send-mass-email', requireSuperAdmin, async (req, res) => {
  try {
    const { emails, subject, body } = req.body;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'No valid recipient emails provided.' });
    }
    
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required.' });
    }

    await sendCustomMassEmail(emails, subject, body);
    
    res.json({ success: true, message: `Successfully queued ${emails.length} emails for dispatch.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send mass email: ' + err.message });
  }
});

module.exports = router;
