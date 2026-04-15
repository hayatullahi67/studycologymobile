/**
 * Environment Configuration
 * 
 * This file helps verify and manage all required environment variables
 * for the MyQuest API and Supabase integration.
 */

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  myQuest: {
    apiKey: string;
    baseUrl: string;
  };
  isConfigured: boolean;
  errors: string[];
}

/**
 * Get and validate environment configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const errors: string[] = [];

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const myQuestKey = process.env.EXPO_PUBLIC_MYQUEST_API_KEY;

  // Validate Supabase config
  if (!supabaseUrl) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL not set in .env');
  }
  if (!supabaseKey) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY not set in .env');
  }

  // Validate MyQuest API config
  if (!myQuestKey) {
    errors.push('EXPO_PUBLIC_MYQUEST_API_KEY not set in .env');
  }

  const config: EnvironmentConfig = {
    supabase: {
      url: supabaseUrl || '',
      anonKey: supabaseKey || '',
    },
    myQuest: {
      apiKey: myQuestKey || '',
      baseUrl: 'https://api.myquest.com.ng/api',
    },
    isConfigured: errors.length === 0,
    errors,
  };

  return config;
};

/**
 * Print configuration status to console
 * Useful for debugging setup issues
 */
export const logConfigStatus = () => {
  const config = getEnvironmentConfig();

  console.log('=================================');
  console.log('Environment Configuration Status');
  console.log('=================================');

  if (config.isConfigured) {
    console.log('✓ All configurations are set correctly');
    console.log('\nSupabase:');
    console.log(`  URL: ${config.supabase.url.substring(0, 30)}...`);
    console.log(`  Key: ${config.supabase.anonKey.substring(0, 20)}...`);
    console.log('\nMyQuest API:');
    console.log(`  Base URL: ${config.myQuest.baseUrl}`);
    console.log(`  API Key: ${config.myQuest.apiKey.substring(0, 20)}...`);
  } else {
    console.log('✗ Configuration errors found:');
    config.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  console.log('=================================\n');
};

/**
 * Template for .env file
 * Copy this to your .env file and fill in the values
 */
export const ENV_FILE_TEMPLATE = `
# Supabase Configuration
# Get these from: https://app.supabase.com/project/[project-id]/settings/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# MyQuest API Configuration
# Get this from: https://myquest.com.ng (contact for API access)
EXPO_PUBLIC_MYQUEST_API_KEY=your-myquest-api-key-here

# Optional: Development settings
# LOG_LEVEL=debug
# API_TIMEOUT=30000
`;

/**
 * Verify database connectivity
 * Call this from your app startup to ensure database is accessible
 */
export const verifyDatabaseConnection = async () => {
  try {
    const config = getEnvironmentConfig();

    if (!config.isConfigured) {
      console.error('Configuration incomplete:', config.errors);
      return false;
    }

    // Try to import and verify Supabase client
    const { supabase } = await import('./supabaseDatabase');

    // Test connection by fetching exams
    const { data, error } = await supabase
      .from('exams')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database connection failed:', error);
      return false;
    }

    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('Failed to verify database connection:', error);
    return false;
  }
};

/**
 * Verify API connectivity
 * Call this to ensure MyQuest API is accessible
 */
export const verifyApiConnection = async () => {
  try {
    const { checkApiHealth } = await import('./myQuestAPI');
    const health = await checkApiHealth();

    if (health.isAvailable) {
      console.log('✓ API connection successful:', health.message);
      return true;
    } else {
      console.warn('⚠ API health check warning:', health.message);
      return false;
    }
  } catch (error) {
    console.error('API connection verification failed:', error);
    return false;
  }
};

/**
 * Run full system verification
 * Call this during app initialization to check all systems
 */
export const verifyFullSystem = async () => {
  console.log('🔍 Starting system verification...\n');

  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables...');
  logConfigStatus();

  const config = getEnvironmentConfig();
  if (!config.isConfigured) {
    console.error('❌ Setup incomplete. Please configure environment variables.');
    return false;
  }

  // Step 2: Check database
  console.log('Step 2: Checking database connection...');
  const dbOk = await verifyDatabaseConnection();
  if (!dbOk) {
    console.error('❌ Database connection failed');
    return false;
  }

  // Step 3: Check API
  console.log('\nStep 3: Checking API connection...');
  const apiOk = await verifyApiConnection();
  if (!apiOk) {
    console.warn('⚠️ API unavailable, but system can still operate in manual mode');
  }

  console.log('\n✓ System verification complete!');
  return true;
};

export default getEnvironmentConfig;
