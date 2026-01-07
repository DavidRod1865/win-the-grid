// Test Supabase connection and database setup
import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('Connection test failed:', connectionError);
      return {
        success: false,
        error: 'Database connection failed: ' + connectionError.message,
        tests: {
          connection: false,
          userProfiles: false,
          authSetup: false
        }
      };
    }
    
    console.log('✅ Database connection successful');
    console.log('User profiles table exists, count:', connectionTest);
    
    // Test 2: Check if we can read from auth.users (requires proper permissions)
    const { data: authTest, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth test result:', { authTest, authError });
    
    // Test 3: Check if RLS is causing issues
    try {
      const { data: rlsTest, error: rlsError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      console.log('RLS test:', { rlsTest, rlsError });
      
      return {
        success: true,
        message: 'All database tests passed',
        tests: {
          connection: true,
          userProfiles: !rlsError,
          authSetup: !authError
        },
        details: {
          userProfilesCount: connectionTest,
          rlsStatus: rlsError ? 'Enabled (may need policies)' : 'Working',
          authStatus: authError ? authError.message : 'Working'
        }
      };
      
    } catch (testError) {
      console.error('RLS test failed:', testError);
      return {
        success: false,
        error: 'RLS permissions issue',
        tests: {
          connection: true,
          userProfiles: false,
          authSetup: !authError
        }
      };
    }
    
  } catch (error) {
    console.error('Database test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tests: {
        connection: false,
        userProfiles: false,
        authSetup: false
      }
    };
  }
}

// Test user profile creation manually
export async function testUserProfileCreation(userId: string, name: string) {
  try {
    console.log('Testing user profile creation for:', userId);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: name,
        full_name: name
      })
      .select()
      .single();
    
    if (error) {
      console.error('Profile creation failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Profile created successfully:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Profile creation test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}