const { getTeams } = require('./services/supabase');

async function testConnection() {
  console.log('Testing Supabase API connection...');
  try {
    const teams = await getTeams();
    console.log('✅ Connection successful!');
    console.log(`Found ${teams.length} teams in the database.`);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();
