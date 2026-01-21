// routes/auth.js - COMPLETE CORRECTED VERSION
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const dbModule = require('../config/db');
const router = express.Router();

const db = dbModule.db;

console.log('✅ Auth routes loaded');

// ==================== GET ROUTE ====================
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    availableEndpoints: [
      'POST /api/auth/login',
      'POST /api/auth/verify',
      'POST /api/auth/logout',
      'POST /api/auth/change-password',
      'POST /api/auth/check-password-format',
      'POST /api/auth/reset-password'
    ]
  });
});

// PBKDF2 implementation matching your Java code EXACTLY
function validatePassword(originalPassword, storedPassword) {
  try {
    console.log('🔑 Validating password...');
    console.log('Stored password format:', storedPassword ? 'Exists' : 'NULL');
    
    if (!storedPassword || !originalPassword) {
      console.log('❌ Missing password');
      return false;
    }

    // Check if password is plain text (for testing) or PBKDF2 format
    if (!storedPassword.includes(':')) {
      console.log('📝 Plain text password detected');
      // For plain text passwords (temporary)
      return storedPassword === originalPassword;
    }

    // Split stored password: iterations:salt:hash
    const passwordParts = storedPassword.split(':');
    
    if (passwordParts.length !== 3) {
      console.log('❌ Invalid password format');
      return false;
    }

    const iterations = parseInt(passwordParts[0]);
    const saltHex = passwordParts[1];
    const storedHash = passwordParts[2];

    console.log('Iterations:', iterations);
    console.log('Salt hex length:', saltHex.length);
    console.log('Stored hash length:', storedHash.length);

    // Convert hex salt to buffer
    const salt = Buffer.from(saltHex, 'hex');
    
    // Generate hash using PBKDF2 with SHA-1 (matching Java)
    const derivedKey = crypto.pbkdf2Sync(
      originalPassword,
      salt,
      iterations,
      64, // Key length in bytes (64*8 = 512 bits) - MATCHING JAVA
      'sha1'
    );

    const derivedHash = derivedKey.toString('hex');
    
    console.log('Derived hash length:', derivedHash.length);
    console.log('Stored hash:', storedHash.substring(0, 32) + '...');
    console.log('Derived hash:', derivedHash.substring(0, 32) + '...');
    
    // Compare hashes
    const isValid = crypto.timingSafeEqual(
      Buffer.from(derivedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
    
    console.log('Password valid:', isValid);
    return isValid;
    
  } catch (error) {
    console.error('❌ Password validation error:', error);
    return false;
  }
}

// Helper function to check password format
function getPasswordFormat(password) {
  if (!password) return 'NULL';
  if (password.includes(':')) {
    const parts = password.split(':');
    return `PBKDF2 (${parts.length} parts)`;
  }
  return 'PLAIN_TEXT';
}

// ==================== ENHANCED LOGIN ENDPOINT ====================
// Checks both civ_manpower and manpower tables
router.post('/login', async (req, res) => {
  try {
    const { pak, password } = req.body;

    console.log('\n🔐 ========== LOGIN ATTEMPT ==========');
    console.log('PAK:', pak);
    console.log('Password provided:', password ? 'Yes' : 'No');

    // Validate input
    if (!pak || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'PAK number and password are required'
      });
    }

    let user = null;
    let userType = null; // 'civilian' or 'uniformed'
    let userTable = null; // 'civ_manpower' or 'manpower'

    // Step 1: Check in civilian table first
    console.log('🔍 Checking in civ_manpower table...');
    const [civilianUsers] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME, PASSWORD, APPOINTMENT as \`appointment\`, SECTION, DEPLOYMENT, 
              PASS_NO, CNIC, EMAIL, PHONE, MOBILE, 'civilian' as user_type
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (civilianUsers.length > 0) {
      console.log('✅ Found in civ_manpower table');
      user = civilianUsers[0];
      userType = 'civilian';
      userTable = 'civ_manpower';
    } else {
      // Step 2: Check in uniformed personnel table
      console.log('🔍 Checking in manpower table...');
      const [uniformedUsers] = await db.execute(
        `SELECT PAK, EMPLOYEE_NAME, PASSWORD, \`RANK\` as \`appointment\`, SECTION, DEPLOYMENT,
                NULL as PASS_NO, NULL as CNIC, EMAIL, PHONE_OFFICE as PHONE, MOBILE,
                CATEGORY, \`RANK\`, BRANCHTRADE, 'uniformed' as user_type
         FROM manpower 
         WHERE PAK = ?`,
        [pak]
      );

      if (uniformedUsers.length > 0) {
        console.log('✅ Found in manpower table');
        user = uniformedUsers[0];
        userType = 'uniformed';
        userTable = 'manpower';
      }
    }

    console.log('👥 User found:', user ? 'Yes' : 'No');
    console.log('User type:', userType);
    
    if (!user) {
      console.log('❌ User not found in any table');
      return res.status(401).json({
        success: false,
        message: 'Invalid PAK number or password'
      });
    }

    console.log('👤 User details:', {
      name: user.EMPLOYEE_NAME,
      type: userType,
      table: userTable
    });

    console.log('Password format:', getPasswordFormat(user.PASSWORD));
    console.log('Password value:', user.PASSWORD ? user.PASSWORD.substring(0, 50) + '...' : 'NULL');

    // Check if password exists in database
    if (!user.PASSWORD) {
      console.log('❌ No password set');
      return res.status(401).json({
        success: false,
        message: 'Password not set. Please use "Forgot Password" or contact administrator.'
      });
    }

    // Validate password
    const isPasswordValid = validatePassword(password, user.PASSWORD);

    if (!isPasswordValid) {
      console.log('❌ Password validation failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid PAK number or password'
      });
    }

    console.log('✅ Password validation successful');

    // Prepare user data for JWT token
    let userData = {
      pak: user.PAK,
      name: user.EMPLOYEE_NAME,
      appointment: user.appointment,
      section: user.SECTION,
      deployment: user.DEPLOYMENT,
      userType: userType,
      userTable: userTable
    };

    // Add type-specific fields
    if (userType === 'civilian') {
      userData.passNo = user.PASS_NO;
      userData.cnic = user.CNIC;
      userData.phone = user.PHONE;
      userData.mobile = user.MOBILE;
      userData.email = user.EMAIL;
    } else if (userType === 'uniformed') {
      userData.category = user.CATEGORY;
      userData.rank = user.RANK;
      userData.branchTrade = user.BRANCHTRADE;
      userData.phone = user.PHONE;
      userData.mobile = user.MOBILE;
      userData.email = user.EMAIL;
    }

    // Create JWT token
    const token = jwt.sign(
      userData,
      process.env.JWT_SECRET || 'your_fallback_secret_key_here',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', user.EMPLOYEE_NAME);
    console.log('User type:', userType);
    console.log('====================================\n');

    // Return user data and token
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== ENHANCED RESET PASSWORD ====================
// Handles both civilian and uniformed personnel
router.post('/reset-password', async (req, res) => {
  try {
    const { pak, newPassword } = req.body;

    console.log('\n🔐 ========== PASSWORD RESET REQUEST ==========');
    console.log('PAK:', pak);
    console.log('New password length:', newPassword ? newPassword.length : 'Not provided');

    // Validate input
    if (!pak || !newPassword) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'PAK number and new password are required'
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Check which table the user exists in
    let user = null;
    let userType = null;
    let userTable = null;

    // Check civilian table first
    const [civilianUsers] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME FROM civ_manpower WHERE PAK = ?',
      [pak]
    );

    if (civilianUsers.length > 0) {
      user = civilianUsers[0];
      userType = 'civilian';
      userTable = 'civ_manpower';
    } else {
      // Check uniformed personnel table
      const [uniformedUsers] = await db.execute(
        'SELECT PAK, EMPLOYEE_NAME FROM manpower WHERE PAK = ?',
        [pak]
      );

      if (uniformedUsers.length > 0) {
        user = uniformedUsers[0];
        userType = 'uniformed';
        userTable = 'manpower';
      }
    }

    console.log('👥 Users found for reset:', user ? 'Yes' : 'No');
    console.log('User type:', userType);
    
    if (!user) {
      console.log('❌ User not found for password reset');
      return res.status(404).json({
        success: false,
        message: 'PAK number not found. Please contact administrator.'
      });
    }

    console.log('👤 User found for reset:', user.EMPLOYEE_NAME);
    console.log('User table:', userTable);

    // Generate new password hash using PBKDF2
    const newPasswordHash = generatePasswordHash(newPassword);
    console.log('🔑 New password hash generated (PBKDF2 format)');

    // Update password in the correct table
    let updateQuery = '';
    if (userTable === 'civ_manpower') {
      updateQuery = 'UPDATE civ_manpower SET PASSWORD = ? WHERE PAK = ?';
    } else if (userTable === 'manpower') {
      updateQuery = 'UPDATE manpower SET PASSWORD = ? WHERE PAK = ?';
    }

    if (updateQuery) {
      await db.execute(updateQuery, [newPasswordHash, pak]);
      console.log(`✅ Password successfully reset for PAK: ${pak} in ${userTable}`);
    } else {
      throw new Error('Could not determine user table for password update');
    }

    console.log('====================================\n');

    res.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.',
      user: {
        pak: user.PAK,
        name: user.EMPLOYEE_NAME,
        type: userType
      }
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please contact administrator.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== CHECK USER EXISTS ====================
router.post('/check-user', async (req, res) => {
  try {
    const { pak } = req.body;
    
    if (!pak) {
      return res.status(400).json({
        success: false,
        message: 'PAK number is required'
      });
    }

    // Check in both tables
    const [civilianUsers] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME FROM civ_manpower WHERE PAK = ?',
      [pak]
    );

    const [uniformedUsers] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME FROM manpower WHERE PAK = ?',
      [pak]
    );

    const userExists = civilianUsers.length > 0 || uniformedUsers.length > 0;
    
    res.json({
      success: true,
      exists: userExists,
      in_civilian: civilianUsers.length > 0,
      in_uniformed: uniformedUsers.length > 0,
      civilian_count: civilianUsers.length,
      uniformed_count: uniformedUsers.length
    });
    
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ success: false, message: 'Error checking user' });
  }
});

// ==================== CHANGE PASSWORD ENDPOINT (ENHANCED) ====================
router.post('/change-password', async (req, res) => {
  try {
    const { pak, currentPassword, newPassword, confirmPassword } = req.body;
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret_key_here');

    // Check if user is changing their own password
    if (decoded.pak !== pak) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change this password'
      });
    }

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user type from token
    const userType = decoded.userType;
    const tableName = userType === 'civilian' ? 'civ_manpower' : 'manpower';

    // Get current password from database
    const [users] = await db.execute(
      `SELECT PASSWORD FROM ${tableName} WHERE PAK = ?`,
      [pak]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentStoredPassword = users[0].PASSWORD;

    // Verify current password
    if (!validatePassword(currentPassword, currentStoredPassword)) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Generate new password hash using PBKDF2 (matching Java implementation)
    const newPasswordHash = generatePasswordHash(newPassword);

    // Update password in the correct table
    await db.execute(
      `UPDATE ${tableName} SET PASSWORD = ? WHERE PAK = ?`,
      [newPasswordHash, pak]
    );

    console.log(`✅ Password changed for PAK: ${pak} in ${tableName}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== VERIFY TOKEN ====================
router.post('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret_key_here');
    
    res.json({
      success: true,
      user: decoded
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// ==================== LOGOUT ====================
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// ==================== GET USER INFO ====================
router.get('/user-info/:pak', async (req, res) => {
  try {
    const { pak } = req.params;

    console.log(`📋 Fetching user info for PAK: ${pak}`);

    // Check both tables
    let user = null;
    let userType = null;

    // Check civilian table first
    const [civilianUsers] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME, APPOINTMENT as \`appointment\`, SECTION, DEPLOYMENT,
              PASS_NO, CNIC, EMAIL, PHONE, MOBILE
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (civilianUsers.length > 0) {
      user = civilianUsers[0];
      userType = 'civilian';
    } else {
      // Check uniformed personnel table
      const [uniformedUsers] = await db.execute(
        `SELECT PAK, EMPLOYEE_NAME, \`RANK\` as \`appointment\`, SECTION, DEPLOYMENT,
                CATEGORY, \`RANK\`, BRANCHTRADE, EMAIL, PHONE_OFFICE as PHONE, MOBILE
         FROM manpower 
         WHERE PAK = ?`,
        [pak]
      );

      if (uniformedUsers.length > 0) {
        user = uniformedUsers[0];
        userType = 'uniformed';
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user type to response
    const userInfo = {
      ...user,
      userType: userType
    };

    res.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==================== TEST DATABASE ====================
router.get('/test-db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test civ_manpower table
    const [civilianCount] = await db.execute('SELECT COUNT(*) as count FROM civ_manpower');
    const [uniformedCount] = await db.execute('SELECT COUNT(*) as count FROM manpower');
    
    // Get sample PAKs
    const [civilianPAKs] = await db.execute('SELECT PAK FROM civ_manpower LIMIT 5');
    const [uniformedPAKs] = await db.execute('SELECT PAK FROM manpower LIMIT 5');
    
    console.log('Database test results:', {
      civilianCount: civilianCount[0].count,
      uniformedCount: uniformedCount[0].count,
      sampleCivilianPAKs: civilianPAKs.map(p => p.PAK),
      sampleUniformedPAKs: uniformedPAKs.map(p => p.PAK)
    });
    
    res.json({
      success: true,
      message: 'Database test successful',
      data: {
        civilian_count: civilianCount[0].count,
        uniformed_count: uniformedCount[0].count,
        sample_civilian_paks: civilianPAKs.map(p => p.PAK),
        sample_uniformed_paks: uniformedPAKs.map(p => p.PAK)
      }
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// ==================== DEBUG PAK ====================
router.get('/debug-pak/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    console.log(`🔍 Debugging PAK: ${pak}`);
    
    // Check in both tables
    const [civilianUsers] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME FROM civ_manpower WHERE PAK = ?',
      [pak]
    );
    
    const [uniformedUsers] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME FROM manpower WHERE PAK = ?',
      [pak]
    );
    
    // Check if PAK exists in manpower_roles
    const [roles] = await db.execute(
      'SELECT * FROM manpower_roles WHERE PAK = ?',
      [pak]
    );
    
    console.log('Debug results:', {
      in_civilian: civilianUsers.length > 0,
      in_uniformed: uniformedUsers.length > 0,
      civilian_data: civilianUsers[0],
      uniformed_data: uniformedUsers[0],
      roles_count: roles.length
    });
    
    res.json({
      success: true,
      pak: pak,
      in_civilian: civilianUsers.length > 0,
      in_uniformed: uniformedUsers.length > 0,
      civilian_data: civilianUsers[0],
      uniformed_data: uniformedUsers[0],
      roles: roles
    });
    
  } catch (error) {
    console.error('Error debugging PAK:', error);
    res.status(500).json({
      success: false,
      message: 'Error debugging PAK'
    });
  }
});

// ==================== HELPER FUNCTIONS ====================
function generatePasswordHash(password) {
  const iterations = 1000;
  const salt = crypto.randomBytes(16);
  
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    64, // 512 bits
    'sha1'
  );

  return `${iterations}:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}



// Add this endpoint to routes/auth.js
router.post('/exact-comparison', async (req, res) => {
  try {
    const { pak1, pak2 } = req.body;
    
    console.log('\n🔬 ========== EXACT BYTE COMPARISON ==========');
    
    // Get both passwords as buffers
    const [pak1Result] = await db.execute(
      'SELECT PAK, PASSWORD, HEX(PASSWORD) as pass_hex FROM civ_manpower WHERE PAK = ?',
      [pak1]
    );
    
    const [pak2Result] = await db.execute(
      'SELECT PAK, PASSWORD, HEX(PASSWORD) as pass_hex FROM manpower WHERE PAK = ?',
      [pak2]
    );
    
    if (pak1Result.length === 0 || pak2Result.length === 0) {
      return res.json({
        success: false,
        message: 'One or both users not found'
      });
    }
    
    const pak1Data = pak1Result[0];
    const pak2Data = pak2Result[0];
    
    // Convert hex back to compare
    const pak1Hex = pak1Data.pass_hex;
    const pak2Hex = pak2Data.pass_hex;
    
    console.log('PAK001 Password:', pak1Data.PASSWORD);
    console.log('100001 Password:', pak2Data.PASSWORD);
    console.log('PAK001 Hex:', pak1Hex.substring(0, 100) + '...');
    console.log('100001 Hex:', pak2Hex.substring(0, 100) + '...');
    console.log('PAK001 Length (string):', pak1Data.PASSWORD.length);
    console.log('100001 Length (string):', pak2Data.PASSWORD.length);
    console.log('PAK001 Length (hex):', pak1Hex.length);
    console.log('100001 Length (hex):', pak2Hex.length);
    
    // Character by character comparison of hex
    const minLength = Math.min(pak1Hex.length, pak2Hex.length);
    let differences = [];
    
    for (let i = 0; i < minLength; i += 2) {
      const pak1Byte = pak1Hex.substring(i, i + 2);
      const pak2Byte = pak2Hex.substring(i, i + 2);
      
      if (pak1Byte !== pak2Byte) {
        differences.push({
          position: i / 2,
          hex_position: i,
          pak1_byte: pak1Byte,
          pak2_byte: pak2Byte,
          ascii1: String.fromCharCode(parseInt(pak1Byte, 16)),
          ascii2: String.fromCharCode(parseInt(pak2Byte, 16))
        });
        if (differences.length >= 5) break;
      }
    }
    
    // Test the hash validation directly
    console.log('\n🔑 TESTING HASH VALIDATION DIRECTLY');
    console.log('Testing with password: "789789"');
    
    const testPassword = "789789";
    
    // Test PAK001
    const pak1Parts = pak1Data.PASSWORD.split(':');
    const pak1Valid = testPBKDF2(testPassword, pak1Parts[1], parseInt(pak1Parts[0]), pak1Parts[2]);
    
    // Test 100001
    const pak2Parts = pak2Data.PASSWORD.split(':');
    const pak2Valid = testPBKDF2(testPassword, pak2Parts[1], parseInt(pak2Parts[0]), pak2Parts[2]);
    
    res.json({
      success: true,
      comparison: {
        identical_strings: pak1Data.PASSWORD === pak2Data.PASSWORD,
        identical_hex: pak1Hex === pak2Hex,
        length_string_match: pak1Data.PASSWORD.length === pak2Data.PASSWORD.length,
        length_hex_match: pak1Hex.length === pak2Hex.length,
        differences_count: differences.length,
        differences: differences
      },
      validation: {
        pak001: {
          valid: pak1Valid.valid,
          hash_match: pak1Valid.hashMatch,
          hash_comparison: pak1Valid.hashComparison
        },
        '100001': {
          valid: pak2Valid.valid,
          hash_match: pak2Valid.hashMatch,
          hash_comparison: pak2Valid.hashComparison
        }
      },
      raw_data: {
        pak001: {
          password: pak1Data.PASSWORD,
          hex: pak1Hex,
          parts: pak1Parts
        },
        '100001': {
          password: pak2Data.PASSWORD,
          hex: pak2Hex,
          parts: pak2Parts
        }
      }
    });
    
  } catch (error) {
    console.error('Exact comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in exact comparison'
    });
  }
});

function testPBKDF2(password, saltHex, iterations, storedHash) {
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha1');
    const derivedHash = derivedKey.toString('hex');
    
    const hashMatch = storedHash === derivedHash;
    
    return {
      valid: hashMatch,
      hashMatch: hashMatch,
      hashComparison: {
        stored_first_32: storedHash.substring(0, 32),
        derived_first_32: derivedHash.substring(0, 32),
        length_match: storedHash.length === derivedHash.length,
        stored_length: storedHash.length,
        derived_length: derivedHash.length
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

// Add this endpoint to routes/auth.js
router.post('/copy-correct-hash', async (req, res) => {
  try {
    const { targetPak, password } = req.body;
    
    console.log('\n🔧 ========== COPY CORRECT HASH ==========');
    console.log('Target PAK:', targetPak);
    console.log('Password to use:', password);
    
    if (!targetPak || !password) {
      return res.status(400).json({
        success: false,
        message: 'Target PAK and password are required'
      });
    }
    
    // Get the working hash from PAK001 to copy its format
    const [sourceResult] = await db.execute(
      'SELECT PASSWORD FROM civ_manpower WHERE PAK = "PAK001"'
    );
    
    if (sourceResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PAK001 not found in civ_manpower'
      });
    }
    
    const sourceHash = sourceResult[0].PASSWORD;
    console.log('Source hash from PAK001:', sourceHash.substring(0, 50) + '...');
    
    // Extract the iterations (should be 1000)
    const sourceParts = sourceHash.split(':');
    const iterations = parseInt(sourceParts[0]);
    console.log('Iterations to use:', iterations);
    
    // Generate a NEW salt for the target user (security best practice)
    const newSalt = crypto.randomBytes(16).toString('hex');
    console.log('Generated new salt:', newSalt);
    
    // Generate hash with the password
    const saltBuffer = Buffer.from(newSalt, 'hex');
    const derivedKey = crypto.pbkdf2Sync(password, saltBuffer, iterations, 64, 'sha1');
    const derivedHash = derivedKey.toString('hex');
    
    const newHash = `${iterations}:${newSalt}:${derivedHash}`;
    console.log('Generated new hash:', newHash.substring(0, 50) + '...');
    
    // Update 100001 with the new correct hash
    const [updateResult] = await db.execute(
      'UPDATE manpower SET PASSWORD = ? WHERE PAK = ?',
      [newHash, targetPak]
    );
    
    console.log('Update result:', updateResult.affectedRows, 'rows affected');
    
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found in manpower table'
      });
    }
    
    // Verify by trying to validate
    const [verifyResult] = await db.execute(
      'SELECT PASSWORD FROM manpower WHERE PAK = ?',
      [targetPak]
    );
    
    const storedHash = verifyResult[0].PASSWORD;
    const verifyParts = storedHash.split(':');
    
    // Test validation
    const testSalt = Buffer.from(verifyParts[1], 'hex');
    const testKey = crypto.pbkdf2Sync(password, testSalt, parseInt(verifyParts[0]), 64, 'sha1');
    const testHash = testKey.toString('hex');
    
    const isValid = verifyParts[2] === testHash;
    
    console.log('Verification - Stored hash:', storedHash.substring(0, 50) + '...');
    console.log('Verification - Hash match:', isValid);
    
    res.json({
      success: true,
      message: 'Correct hash generated and applied',
      details: {
        target_pak: targetPak,
        password: password,
        iterations: iterations,
        salt: newSalt,
        hash_preview: derivedHash.substring(0, 32) + '...',
        validation_successful: isValid,
        note: 'User can now login with the specified password'
      }
    });
    
  } catch (error) {
    console.error('Copy correct hash error:', error);
    res.status(500).json({
      success: false,
      message: 'Error copying correct hash'
    });
  }
});


module.exports = router;