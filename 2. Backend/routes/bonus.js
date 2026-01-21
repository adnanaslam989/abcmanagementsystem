// routes/bonus.js
const express = require('express');
const dbModule = require('../config/db');
const router = express.Router();

const db = dbModule.pool;

// Get all awarded/penalized hours with employee and officer details
router.get('/awarded-hours', async (req, res) => {
  try {
    console.log('🔍 Fetching all hours records');
    
    const [records] = await db.execute(
      `SELECT 
        b.BONUS_ID,
        b.BONUS_TO,
        c.EMPLOYEE_NAME as civilian_name,
        b.BONUS_HOURS,
        b.BONUS_DATE,
        b.AWARDED_BY,
        m.RANK,
        m.EMPLOYEE_NAME as officer_name,
        b.REASON,
        CASE 
          WHEN b.BONUS_HOURS >= 0 THEN 'award'
          ELSE 'penalty'
        END as action_type
       FROM bonus_hours b
       LEFT JOIN civ_manpower c ON b.BONUS_TO = c.PAK
       LEFT JOIN manpower m ON b.AWARDED_BY LIKE CONCAT(m.PAK, '%')
       WHERE YEAR(b.BONUS_DATE) = YEAR(CURDATE())
       ORDER BY b.BONUS_DATE DESC, b.BONUS_ID DESC`
    );

    console.log(`✅ Found ${records.length} hours records`);
    
    const formattedRecords = records.map(record => ({
      bonus_id: record.BONUS_ID,
      bonus_to: record.BONUS_TO,
      employee_name: record.civilian_name || 'N/A',
      bonus_hours: record.BONUS_HOURS,
      bonus_days: (Math.abs(record.BONUS_HOURS) / 8).toFixed(2),
      bonus_date: record.BONUS_DATE,
      awarded_by: record.AWARDED_BY,
      rank: record.RANK || 'N/A',
      awarded_by_name: record.officer_name || 'N/A',
      reason: record.REASON || 'N/A',
      action_type: record.action_type,
      is_positive: record.BONUS_HOURS >= 0
    }));

    res.json({
      success: true,
      records: formattedRecords
    });

  } catch (error) {
    console.error('❌ Error fetching hours records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get military officers for "Authorized By" field (Officers only) - FIXED VERSION
router.get('/military-officers', async (req, res) => {
  try {
    console.log('🔍 Fetching military officers');
    
    // Check the actual column names in your manpower table
    const [officers] = await db.execute(
      `SELECT PAK, CATEGORY, EMPLOYEE_NAME 
       FROM manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
         AND (CATEGORY = 'Officer' OR 'RANK' LIKE '%Officer%')
       ORDER BY 
         EMPLOYEE_NAME`
    );

    console.log('📊 Officers fetched:', officers);


    // Format the officers data
    const formattedOfficers = officers.map(officer => {
      // Make sure all fields exist
      const pak = officer.PAK || 'N/A';
      const rank = officer.RANK || 'Officer';
      const name = officer.EMPLOYEE_NAME || 'Unknown';
      
      return `${pak} : ${rank} : ${name}`;
    });

    console.log(`✅ Found ${formattedOfficers.length} military officers`);
    console.log('📋 Officers list:', formattedOfficers);
    
    res.json({
      success: true,
      officers: formattedOfficers
    });

    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      
      // Return a hardcoded test officer for debugging
      const testOfficers = ['TEST001 : Major : Test Officer'];
      
      res.json({
        success: true,
        officers: testOfficers,
        message: 'Using test data - check database connection'
      });
    }
});

// Get civilian employees for hours management
router.get('/civilian-employees', async (req, res) => {
  try {
    console.log('🔍 Fetching civilian employees');
    
    const [employees] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME 
       FROM civ_manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
       ORDER BY EMPLOYEE_NAME`
    );

    console.log('📊 Raw civilian employees data:', employees);

    const formattedEmployees = employees.map(employee => {
      const pak = employee.PAK || 'N/A';
      const name = employee.EMPLOYEE_NAME || 'Unknown';
      return `${pak} : ${name}`;
    });

    console.log(`✅ Found ${formattedEmployees.length} civilian employees`);
    
    res.json({
      success: true,
      employees: formattedEmployees
    });
  } catch (error) {
    console.error('❌ Error fetching civilian employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Save hours (award or penalty)
router.post('/save', async (req, res) => {
  try {
    const { pak, hours, bonus_date, awarded_by, reason, action_type } = req.body;
    
    console.log('💾 Saving hours record:', {
      pak, hours, bonus_date, awarded_by, reason, action_type
    });

    // Parse hours to decimal with 2 decimal places
    const parsedHours = parseFloat(hours);
    
    // Determine sign based on action_type
    let finalHours = parsedHours;
    if (action_type === 'penalize') {
      // Ensure it's negative for penalize
      finalHours = -Math.abs(parsedHours);
    } else {
      // Ensure it's positive for award
      finalHours = Math.abs(parsedHours);
    }

    // Generate a new BONUS_ID
    const bonusId = Date.now();

    const [result] = await db.execute(
      `INSERT INTO bonus_hours (BONUS_ID, BONUS_TO, BONUS_HOURS, BONUS_DATE, AWARDED_BY, REASON) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bonusId, pak, finalHours, bonus_date, awarded_by, reason]
    );

    console.log(`✅ Hours saved successfully. ID: ${bonusId}, Hours: ${finalHours}, Type: ${action_type}`);

    res.json({
      success: true,
      message: action_type === 'award' 
        ? `Awarded ${Math.abs(finalHours)} hours successfully!` 
        : `Penalized ${Math.abs(finalHours)} hours successfully!`,
      bonusId: bonusId,
      hours: finalHours,
      action_type: action_type
    });

  } catch (error) {
    console.error('❌ Error saving hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save hours data'
    });
  }
});


// Get hours history for an employee
router.get('/history/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    console.log(`🔍 Fetching hours history for PAK: ${pak}`);

    const [records] = await db.execute(
      `SELECT 
        BONUS_ID,
        BONUS_TO,
        BONUS_HOURS,
        BONUS_DATE,
        AWARDED_BY,
        REASON,
        (ABS(BONUS_HOURS) / 8) as DAYS_EQUIVALENT,
        CASE 
          WHEN BONUS_HOURS >= 0 THEN 'award'
          ELSE 'penalty'
        END as ACTION_TYPE
       FROM bonus_hours 
       WHERE BONUS_TO = ?
       ORDER BY BONUS_DATE DESC`,
      [pak]
    );

    console.log(`✅ Found ${records.length} records for PAK: ${pak}`);
    
    res.json({
      success: true,
      records: records
    });

  } catch (error) {
    console.error('❌ Error fetching hours history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employee hours balance
router.get('/balance/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    console.log(`🔍 Calculating hours balance for PAK: ${pak}`);

    const [result] = await db.execute(
      `SELECT 
        SUM(BONUS_HOURS) as total_hours,
        COUNT(CASE WHEN BONUS_HOURS >= 0 THEN 1 END) as award_count,
        COUNT(CASE WHEN BONUS_HOURS < 0 THEN 1 END) as penalty_count
       FROM bonus_hours 
       WHERE BONUS_TO = ?`,
      [pak]
    );

    const balance = result[0] || { total_hours: 0, award_count: 0, penalty_count: 0 };
    
    console.log(`✅ Balance calculated: ${balance.total_hours} hours`);

    res.json({
      success: true,
      balance: {
        total_hours: balance.total_hours || 0,
        total_days: ((balance.total_hours || 0) / 8).toFixed(2),
        award_count: balance.award_count || 0,
        penalty_count: balance.penalty_count || 0
      }
    });

  } catch (error) {
    console.error('❌ Error calculating balance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Test database connection and table structure
router.get('/test-db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection and structure');
    
    // Check manpower table structure
    const [manpowerStructure] = await db.execute(
      `SHOW COLUMNS FROM manpower`
    );
    
    console.log('📊 Manpower table columns:', manpowerStructure);
    
    // Check sample data from manpower
    const [sampleOfficers] = await db.execute(
      `SELECT PAK, RANK, EMPLOYEE_NAME, CATEGORY, POSTOUT_DATE 
       FROM manpower 
       WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
       LIMIT 10`
    );
    
    console.log('📊 Sample manpower data:', sampleOfficers);
    
    // Count officers
    const [officerCount] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
         AND (CATEGORY = 'Officer' OR RANK LIKE '%Officer%')`
    );
    
    console.log('📊 Officer count:', officerCount[0].count);
    
    res.json({
      success: true,
      manpower_columns: manpowerStructure,
      sample_officers: sampleOfficers,
      officer_count: officerCount[0].count,
      message: 'Database test completed successfully'
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      message: `Database test failed: ${error.message}`,
      error: error.message
    });
  }
});

// Test route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hours Management API is working!',
    endpoints: {
      'GET /api/bonus/civilian-employees': 'Get civilian employees',
      'GET /api/bonus/military-officers': 'Get military officers',
      'POST /api/bonus/save': 'Save hours (award/penalty)',
      'GET /api/bonus/history/:pak': 'Get hours history for employee',
      'GET /api/bonus/balance/:pak': 'Get employee hours balance',
      'GET /api/bonus/awarded-hours': 'Get all hours records',
      'GET /api/bonus/test-db': 'Test database connection'
    }
  });
});

module.exports = router;