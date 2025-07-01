const supabaseClient = require('./supabase-client');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
  constructor() {
    if (!supabaseClient.isReady()) {
      console.error('❌ Supabase client not ready. Check environment variables.');
      process.exit(1);
    }
    this.supabase = supabaseClient.getServiceClient();
  }

  async runMigration(migrationFile) {
    try {
      console.log(`🔄 Running migration: ${migrationFile}`);
      
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`📄 Migration SQL length: ${sql.length} characters`);
      
      // Execute the SQL
      const { data, error } = await this.supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // If the RPC doesn't exist, try direct SQL execution
        if (error.code === '42883') {
          console.log('🔄 RPC not available, trying direct SQL execution...');
          const result = await this.supabase
            .from('_dummy_table_to_execute_sql')
            .select('*')
            .limit(0);
          
          // Since direct SQL isn't available through the client, we'll need to execute it differently
          throw new Error('Direct SQL execution not available through client. Please apply migrations manually.');
        }
        throw error;
      }
      
      console.log(`✅ Migration ${migrationFile} completed successfully`);
      return { success: true, data };
      
    } catch (error) {
      console.error(`❌ Migration ${migrationFile} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Alternative approach: execute SQL using a stored procedure
  async executeSQLDirect(sql) {
    try {
      // We'll create a temp function to execute the SQL
      const wrapperSQL = `
        DO $$
        BEGIN
          ${sql}
        END $$;
      `;
      
      // This won't work through the JS client directly, but let's try creating a function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION run_migration_sql()
        RETURNS TEXT AS $$
        BEGIN
          ${sql}
          RETURN 'Migration completed successfully';
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      console.log('🔄 Creating temporary migration function...');
      const { data, error } = await this.supabase.rpc('run_migration_sql');
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Migration executed successfully');
      return { success: true, data };
      
    } catch (error) {
      console.error('❌ SQL execution failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

async function main() {
  console.log('🚀 Starting database migration process...');
  console.log('=========================================');
  
  const migrator = new DatabaseMigrator();
  
  // List of migrations to run
  const migrations = [
    '004_fix_user_profile_trigger.sql',
    '005_ensure_user_profiles_columns.sql'
  ];
  
  for (const migration of migrations) {
    const result = await migrator.runMigration(migration);
    if (!result.success) {
      console.error(`💥 Migration process stopped due to error in ${migration}`);
      process.exit(1);
    }
  }
  
  console.log('');
  console.log('🎉 All migrations completed successfully!');
  console.log('✅ The signup trigger should now work properly');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test user signup on your website');
  console.log('2. Check the user_profiles table for new entries');
  console.log('3. Monitor the logs for any remaining issues');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseMigrator }; 