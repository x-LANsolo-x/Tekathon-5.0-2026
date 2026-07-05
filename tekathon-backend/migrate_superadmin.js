const bcrypt = require('bcrypt');
const { getSuperAdminPassword, updateSuperAdminPassword } = require('./services/supabase');

async function migrate() {
    try {
        console.log('Fetching current password...');
        const currentPassword = await getSuperAdminPassword();
        
        if (currentPassword.startsWith('$2b$')) {
            console.log('Password is already hashed (starts with $2b$). Aborting migration.');
            return;
        }

        console.log(`Current password: ${currentPassword}`);
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(currentPassword, 10);
        
        console.log('Updating password in database...');
        await updateSuperAdminPassword(hashedPassword);
        
        console.log('Successfully migrated Super Admin password to bcrypt hash.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
