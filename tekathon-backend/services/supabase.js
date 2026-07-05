const { createClient } = require('@supabase/supabase-js');
const NodeCache = require('node-cache');
require('dotenv').config();

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Teams Service Methods ---

async function appendTeam(teamData) {
  const { data, error } = await supabase
    .from('teams')
    .insert([{
      team_id: teamData.teamId,
      team_name: teamData.teamName,
      problem_statement: teamData.problemStatement,
      members: teamData.members, // JSONB
      pdf_url: teamData.pdfUrl,
      status: teamData.status || 'pending',
      score: teamData.score || {}, // JSONB
      evaluator_id: teamData.evaluatorId || null
    }]);
    
  if (error) {
    console.error('Error appending team:', error);
    throw new Error('Failed to save team to database.');
  }
  cache.del('teams');
  return data;
}

async function getTeams() {
  if (cache.has('teams')) {
    return cache.get('teams');
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*');

  if (error) {
    console.error('Error fetching teams:', error);
    return [];
  }

  return data.map(row => ({
    teamId: row.team_id,
    teamName: row.team_name,
    problemStatement: row.problem_statement,
    members: row.members,
    pdfUrl: row.pdf_url,
    status: row.status,
    score: row.score || {},
    evaluatorId: row.evaluator_id,
    is_flagged: row.is_flagged || false,
    flag_reason: row.flag_reason || null,
    theme: row.theme || null
  }));

  cache.set('teams', mappedData);
  return mappedData;
}

async function checkDuplicateMember(field, value, excludeTeamId = null) {
  if (!value) return false;
  const teams = await getTeams();
  for (const team of teams) {
    if (excludeTeamId && team.teamId === excludeTeamId) continue;
    if (team.members && Array.isArray(team.members)) {
      for (const member of team.members) {
        if (member[field] && member[field].toString().toLowerCase() === value.toString().toLowerCase()) {
          return true; // Duplicate found
        }
      }
    }
  }
  return false;
}

async function updateTeam(teamId, teamData) {
  const { data, error } = await supabase
    .from('teams')
    .update({
      team_name: teamData.teamName,
      problem_statement: teamData.problemStatement,
      members: teamData.members,
      pdf_url: teamData.pdfUrl,
      status: teamData.status,
      score: teamData.score,
      evaluator_id: teamData.evaluatorId,
      is_flagged: teamData.is_flagged,
      flag_reason: teamData.flag_reason,
      theme: teamData.theme
    })
    .eq('team_id', teamId);

  if (error) {
    console.error('Error updating team:', error);
    throw new Error('Failed to update team in database.');
  }
  cache.del('teams');
  return data;
}

async function deleteTeam(teamId) {
  const { data, error } = await supabase
    .from('teams')
    .delete()
    .eq('team_id', teamId);

  if (error) {
    console.error('Error deleting team:', error);
    throw new Error('Failed to delete team from database.');
  }
  cache.del('teams');
  return data;
}

// --- Evaluators Service Methods ---

async function getEvaluators() {
  if (cache.has('evaluators')) {
    return cache.get('evaluators');
  }

  const { data, error } = await supabase
    .from('evaluators')
    .select('*');

  if (error) {
    console.error('Error fetching evaluators:', error);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password, // Hashed password
    contact_number: row.contact_number,
    designation: row.designation,
    organisation: row.organisation,
    is_first_login: row.is_first_login !== undefined ? row.is_first_login : true,
    theme: row.theme || null
  }));

  cache.set('evaluators', mappedData);
  return mappedData;
}

async function appendEvaluator(evaluator) {
  const { data, error } = await supabase
    .from('evaluators')
    .insert([{
      id: evaluator.id,
      name: evaluator.name,
      email: evaluator.email,
      password: evaluator.password,
      contact_number: evaluator.contact_number || null,
      designation: evaluator.designation || null,
      organisation: evaluator.organisation || null,
      is_first_login: true,
      theme: evaluator.theme || null
    }]);

  if (error) {
    console.error('Error appending evaluator:', error);
    throw new Error('Failed to save evaluator to database.');
  }
  cache.del('evaluators');
  return data;
}

async function updateEvaluatorPassword(email, newHashedPassword) {
  const { data, error } = await supabase
    .from('evaluators')
    .update({
      password: newHashedPassword,
      is_first_login: false
    })
    .eq('email', email);

  if (error) {
    console.error('Error updating evaluator password:', error);
    throw new Error('Failed to update evaluator password.');
  }
  cache.del('evaluators');
  return data;
}

// --- Team Leaders Service Methods ---

async function createTeamLeader(leaderData) {
  const { data, error } = await supabase
    .from('team_leaders')
    .insert([{
      id: leaderData.id,
      email: leaderData.email,
      password: leaderData.password
    }]);

  if (error) {
    console.error('Error creating team leader:', error);
    throw new Error('Failed to create team leader account.');
  }
  return data;
}

async function getTeamLeaderByEmail(email) {
  const { data, error } = await supabase
    .from('team_leaders')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
    console.error('Error fetching team leader:', error);
    return null;
  }

  return data;
}

async function getSuperAdminPassword() {
  try {
    const { data, error } = await supabase
      .from('global_settings')
      .select('setting_value')
      .eq('setting_key', 'superadmin_password')
      .single();
      
    if (error || !data) {
      // Fallback to bcrypt hash of 'root' if table doesn't exist or not set
      return '$2b$10$FGe0ewXU43s6/iXtsXmrjOPQVt5mfCyN2wBBCyw3NvZMi1bZSGGyG'; 
    }
    return data.setting_value;
  } catch(err) {
    // Return hash of 'root'
    return '$2b$10$FGe0ewXU43s6/iXtsXmrjOPQVt5mfCyN2wBBCyw3NvZMi1bZSGGyG';
  }
}

async function updateSuperAdminPassword(newPassword) {
  const { data, error } = await supabase
    .from('global_settings')
    .upsert({ setting_key: 'superadmin_password', setting_value: newPassword }, { onConflict: 'setting_key' });
    
  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to update superadmin password.');
  }
  return data;
}

async function updateTeamLeaderPassword(email, newHashedPassword) {
  const { data, error } = await supabase
    .from('team_leaders')
    .update({ password: newHashedPassword })
    .eq('email', email);

  if (error) {
    console.error('Error updating participant password:', error);
    throw new Error('Failed to update participant password.');
  }
  return data;
}

module.exports = {
  appendTeam,
  getTeams,
  updateTeam,
  deleteTeam,
  getEvaluators,
  appendEvaluator,
  updateEvaluatorPassword,
  createTeamLeader,
  getTeamLeaderByEmail,
  updateTeamLeaderPassword,
  getSuperAdminPassword,
  updateSuperAdminPassword,
  checkDuplicateMember
};
