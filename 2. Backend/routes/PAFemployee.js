// routes/PAFemployee.js
const express = require('express');
const dbModule = require('../config/db');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// FIX: Access the pool property from dbModule
const db = dbModule.pool; // Changed from dbModule.db to dbModule.pool

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/employee-photos/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: PAK + timestamp + extension
    const pak = req.params.pak;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, pak + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all employees (Total Strength)
router.get('/total-strength', async (req, res) => {
  console.log('📋 Fetching total strength...');
  
  try {
    const sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY 
          CASE 
            WHEN CATEGORY = 'Officer' THEN 1
            WHEN CATEGORY = 'JCO' THEN 2
            WHEN CATEGORY = 'Civilian' THEN 3
            ELSE 4
          END,
          PAK
        ) as row_number,
        PAK,
        COALESCE(CATEGORY, 'Not Specified') as category,
        COALESCE(\`RANK\`, 'Not Specified') as \`rank\`,  -- Fixed: Backticks around RANK
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(BRANCHTRADE, 'Not Specified') as branch_trade,
        COALESCE(PHONE_OFFICE, 'N/A') as phone_office,
        COALESCE(INTERCOM, 'N/A') as intercom,
        COALESCE(PHONE_RES, 'N/A') as phone_res,
        COALESCE(DEFCOM_OFFICE, 'N/A') as defcom_office,
        COALESCE(DEFCOM_RES, 'N/A') as defcom_res,
        COALESCE(MOBILE, 'N/A') as mobile,
        COALESCE(ADDRESS, 'Address not available') as address,
        COALESCE(EMAIL, 'N/A') as email,
        DATE_FORMAT(POSTIN_DATE, '%d-%b-%y') as postin_date,
        COALESCE(SECTION, 'Not Assigned') as section,
        COALESCE(DEPLOYMENT, 'Not Assigned') as deployment
      FROM manpower
      WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
      ORDER BY 
        CASE 
          WHEN CATEGORY = 'Officer' THEN 1
          WHEN CATEGORY = 'JCO' THEN 2
          WHEN CATEGORY = 'Civilian' THEN 3
          ELSE 4
        END,
        PAK
    `;
    
    const [results] = await db.query(sql);
    console.log(`✅ Fetched ${results.length} employees`);
    
    res.json(results);
  } catch (error) {
    console.error('❌ Database error fetching employees:', error.message);
    console.error('SQL Error Code:', error.code);
    console.error('SQL State:', error.sqlState);
    
    // Try a simpler query as fallback
    try {
      console.log('🔄 Trying simpler query...');
      const simpleSql = `
        SELECT 
          PAK,
          COALESCE(CATEGORY, 'Not Specified') as category,
          COALESCE(\`RANK\`, 'Not Specified') as \`RANK\`,
          COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
          COALESCE(BRANCHTRADE, 'Not Specified') as branch_trade,
          COALESCE(PHONE_OFFICE, 'N/A') as phone_office,
          COALESCE(INTERCOM, 'N/A') as intercom,
          COALESCE(PHONE_RES, 'N/A') as phone_res,
          COALESCE(DEFCOM_OFFICE, 'N/A') as defcom_office,
          COALESCE(DEFCOM_RES, 'N/A') as defcom_res,
          COALESCE(MOBILE, 'N/A') as mobile,
          COALESCE(ADDRESS, 'Address not available') as address,
          COALESCE(EMAIL, 'N/A') as email,
          DATE_FORMAT(POSTIN_DATE, '%d-%b-%y') as postin_date,
          COALESCE(SECTION, 'Not Assigned') as section,
          COALESCE(DEPLOYMENT, 'Not Assigned') as deployment
        FROM manpower
        WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
        ORDER BY 
          CASE 
            WHEN CATEGORY = 'Officer' THEN 1
            WHEN CATEGORY = 'JCO' THEN 2
            WHEN CATEGORY = 'Civilian' THEN 3
            ELSE 4
          END,
          PAK
      `;
      
      const [simpleResults] = await db.query(simpleSql);
      console.log(`✅ Simple query returned ${simpleResults.length} records`);
      
      // Add row numbers manually
      const resultsWithRowNumbers = simpleResults.map((emp, index) => ({
        row_number: index + 1,
        ...emp
      }));
      
      res.json(resultsWithRowNumbers);
    } catch (simpleError) {
      console.error('❌ Simple query also failed:', simpleError.message);
      
      // Try even simpler query
      try {
        console.log('🔄 Trying basic query...');
        const [basicResults] = await db.query(
          'SELECT PAK, CATEGORY, `RANK`, EMPLOYEE_NAME FROM manpower LIMIT 50'
        );
        console.log(`✅ Basic query returned ${basicResults.length} records`);
        res.json(basicResults.map((emp, index) => ({
          row_number: index + 1,
          PAK: emp.PAK,
          category: emp.CATEGORY,
          rank: emp.RANK,
          employee_name: emp.EMPLOYEE_NAME
        })));
      } catch (basicError) {
        console.error('❌ All queries failed:', basicError.message);
        res.status(500).json({ 
          error: 'Database error',
          message: 'Failed to fetch employee data',
          details: error.message,
          suggestion: 'Check if manpower table exists and has proper columns'
        });
      }
    }
  }
});

// Search employees
router.get('/search', async (req, res) => {
  const searchTerm = req.query.term || '';
  console.log(`🔍 Searching for: "${searchTerm}"`);
  
  try {
    if (!searchTerm.trim()) {
      // If search term is empty, redirect to total-strength
      const [results] = await db.query(`
        SELECT * FROM manpower 
        WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
        LIMIT 100
      `);
      return res.json(results);
    }
    
    const sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY PAK) as row_number,
        PAK,
        COALESCE(CATEGORY, 'Not Specified') as category,
        COALESCE(\`RANK\`, 'Not Specified') as \`rank\`,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(BRANCHTRADE, 'Not Specified') as branch_trade,
        COALESCE(PHONE_OFFICE, 'N/A') as phone_office,
        COALESCE(INTERCOM, 'N/A') as intercom,
        COALESCE(PHONE_RES, 'N/A') as phone_res,
        COALESCE(DEFCOM_OFFICE, 'N/A') as defcom_office,
        COALESCE(DEFCOM_RES, 'N/A') as defcom_res,
        COALESCE(MOBILE, 'N/A') as mobile,
        COALESCE(ADDRESS, 'Address not available') as address,
        COALESCE(EMAIL, 'N/A') as email,
        DATE_FORMAT(POSTIN_DATE, '%d-%b-%y') as postin_date,
        COALESCE(SECTION, 'Not Assigned') as section,
        COALESCE(DEPLOYMENT, 'Not Assigned') as deployment
      FROM manpower
      WHERE (
        UPPER(EMPLOYEE_NAME) LIKE UPPER(?) OR
        UPPER(PAK) LIKE UPPER(?) OR
        UPPER(\`RANK\`) LIKE UPPER(?) OR
        UPPER(SECTION) LIKE UPPER(?) OR
        UPPER(CATEGORY) LIKE UPPER(?) OR
        UPPER(BRANCHTRADE) LIKE UPPER(?)
      )
      AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
      ORDER BY PAK
      LIMIT 100
    `;
    
    const searchPattern = `%${searchTerm}%`;
    
    const [results] = await db.query(sql, [
      searchPattern, searchPattern, searchPattern, 
      searchPattern, searchPattern, searchPattern
    ]);
    
    console.log(`✅ Found ${results.length} results for "${searchTerm}"`);
    res.json(results);
  } catch (error) {
    console.error('❌ Database search error:', error.message);
    res.status(500).json({ 
      error: 'Database error',
      message: error.message,
      details: 'Failed to search employee data'
    });
  }
});

// Get employee statistics
router.get('/statistics', async (req, res) => {
  console.log('📊 Fetching statistics...');
  
  try {
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM manpower WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()) as total,
        (SELECT COUNT(*) FROM manpower WHERE CATEGORY = 'Officer' AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())) as officers,
        (SELECT COUNT(*) FROM manpower WHERE CATEGORY = 'JCO' AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())) as jcos,
        (SELECT COUNT(*) FROM manpower WHERE CATEGORY = 'Airmen' AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())) as airmen,
        (SELECT COUNT(*) FROM manpower WHERE CATEGORY = 'Civilian' AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())) as civilians
      FROM DUAL
    `;
    
    const [results] = await db.query(sql);
    console.log('✅ Statistics fetched:', results[0]);
    res.json(results[0]);
  } catch (error) {
    console.error('❌ Database error fetching statistics:', error.message);
    res.status(500).json({ 
      error: 'Database error',
      message: error.message,
      details: 'Failed to fetch statistics'
    });
  }
});

// Get simple employee list (for debugging)
router.get('/simple-list', async (req, res) => {
  console.log('📝 Fetching simple employee list...');
  
  try {
    const sql = `
      SELECT 
        PAK,
        CATEGORY,
        \`RANK\`,
        EMPLOYEE_NAME,
        SECTION
      FROM manpower
      WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
      LIMIT 50
    `;
    
    const [results] = await db.query(sql);
    console.log(`✅ Fetched ${results.length} employee records`);
    res.json(results);
  } catch (error) {
    console.error('❌ Error fetching simple list:', error.message);
    res.status(500).json({ 
      error: 'Database error',
      message: error.message
    });
  }
});

// Test endpoint for manual testing
router.get('/test-data', (req, res) => {
  console.log('🧪 Serving test data...');
  
  const testData = [
    {
      row_number: 1,
      PAK: 'TEST001',
      category: 'Officer',
      rank: 'Captain',
      employee_name: 'Test Officer',
      branch_trade: 'Technical',
      phone_office: '051-1234567',
      intercom: '101',
      phone_res: '051-7654321',
      defcom_office: 'DEF-001',
      defcom_res: 'DEF-002',
      mobile: '0300-1234567',
      address: 'Test Address, Islamabad',
      email: 'test@example.com',
      postin_date: '15-Jan-20',
      section: 'IT Department',
      deployment: 'Research & Analysis'
    },
    {
      row_number: 2,
      PAK: 'TEST002',
      category: 'Civilian',
      rank: 'Assistant',
      employee_name: 'Test Civilian',
      branch_trade: 'Administration',
      phone_office: '051-2345678',
      intercom: '102',
      phone_res: '051-8765432',
      defcom_office: 'DEF-003',
      defcom_res: 'DEF-004',
      mobile: '0300-2345678',
      address: 'Another Test Address, Islamabad',
      email: 'civilian@example.com',
      postin_date: '20-Mar-19',
      section: 'HR Department',
      deployment: 'Administration'
    },
    {
      row_number: 3,
      PAK: 'TEST003',
      category: 'JCO',
      rank: 'Subedar',
      employee_name: 'Test JCO',
      branch_trade: 'Technical',
      phone_office: '051-3456789',
      intercom: '103',
      phone_res: '051-9876543',
      defcom_office: 'DEF-005',
      defcom_res: 'DEF-006',
      mobile: '0300-3456789',
      address: 'JCO Address, Rawalpindi',
      email: 'jco@example.com',
      postin_date: '10-Jul-21',
      section: 'Maintenance',
      deployment: 'Support'
    }
  ];
  
  console.log(`✅ Serving ${testData.length} test records`);
  res.json(testData);
});

// Health check for manpower table
router.get('/health', async (req, res) => {
  try {
    const [result] = await db.query('SELECT COUNT(*) as count FROM manpower');
    const count = result[0].count;
    
    res.json({
      status: 'healthy',
      table: 'manpower',
      record_count: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get employee details by PAK
router.get('/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    console.log(`🔍 Fetching PAF employee data for PAK: ${pak}`);

    const query = "SELECT PAK, CATEGORY, `RANK`, EMPLOYEE_NAME, BRANCHTRADE, PHONE_OFFICE, INTERCOM, PHONE_RES, DEFCOM_OFFICE, DEFCOM_RES, MOBILE, ADDRESS, EMAIL, POSTIN_DATE, POSTOUT_DATE, SECTION, DEPLOYMENT, CUSTODIAN FROM manpower WHERE PAK = ?";

    const [employees] = await db.execute(query, [pak]);

    if (employees.length === 0) {
      console.log(`❌ PAF Employee not found: ${pak}`);
      return res.status(404).json({
        success: false,
        message: 'PAF Employee not found'
      });
    }

    const employee = employees[0];
    
    // Format dates for frontend
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toISOString().split('T')[0];
    };

    const formattedEmployee = {
      pak: employee.PAK,
      category: employee.CATEGORY,
      rank: employee.RANK,
      employee_name: employee.EMPLOYEE_NAME,
      branch_trade: employee.BRANCHTRADE,
      phone_office: employee.PHONE_OFFICE,
      intercom: employee.INTERCOM,
      phone_res: employee.PHONE_RES,
      defcom_office: employee.DEFCOM_OFFICE,
      defcom_res: employee.DEFCOM_RES,
      mobile: employee.MOBILE,
      address: employee.ADDRESS,
      email: employee.EMAIL,
      postin_date: formatDate(employee.POSTIN_DATE),
      postout_date: formatDate(employee.POSTOUT_DATE),
      section: employee.SECTION,
      deployment: employee.DEPLOYMENT,
      custodian: employee.CUSTODIAN
    };

    console.log(`✅ PAF Employee data fetched successfully: ${employee.EMPLOYEE_NAME}`);
    
    res.json({
      success: true,
      employee: formattedEmployee
    });

  } catch (error) {
    console.error('❌ Error fetching PAF employee data:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update employee picture - Store only in database as BLOB
router.put('/:pak/picture', upload.single('picture'), async (req, res) => {
  try {
    const { pak } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No picture file provided'
      });
    }

    console.log(`🖼️ Updating picture for PAK: ${pak}`);

    // Read the image file and convert to buffer for database storage
    const imageBuffer = fs.readFileSync(req.file.path);

    // Update PICTURE column in database (store as BLOB)
    const [result] = await db.execute(
      'UPDATE manpower SET PICTURE = ? WHERE PAK = ?',
      [imageBuffer, pak]
    );

    // Delete the temporary file after storing in database
    fs.unlinkSync(req.file.path);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log(`✅ Picture updated successfully for ${pak}`);

    res.json({
      success: true,
      message: 'Picture updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating picture:', error);
    
    // Delete the uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating picture: ' + error.message
    });
  }
});

// Get employee picture - Read from BLOB in database
router.get('/:pak/picture', async (req, res) => {
  try {
    const { pak } = req.params;

    // Get picture from PICTURE column (BLOB)
    const [employees] = await db.execute(
      'SELECT PICTURE FROM manpower WHERE PAK = ?',
      [pak]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const employee = employees[0];

    // Check if picture exists in database
    if (!employee.PICTURE) {
      // Return default avatar if no picture
      const defaultAvatarPath = path.join(__dirname, '../uploads/default-avatar.jpg');
      if (fs.existsSync(defaultAvatarPath)) {
        return res.sendFile(defaultAvatarPath);
      } else {
        return res.status(404).json({
          success: false,
          message: 'No picture found'
        });
      }
    }

    // Convert BLOB to image
    const imageBuffer = employee.PICTURE;
    
    // Detect image type (you might want to store image type in another column)
    // For now, we'll assume JPEG
    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);

  } catch (error) {
    console.error('❌ Error fetching picture:', error);
    
    // Try to return default avatar on error
    const defaultAvatarPath = path.join(__dirname, '../uploads/default-avatar.jpg');
    if (fs.existsSync(defaultAvatarPath)) {
      return res.sendFile(defaultAvatarPath);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching picture'
    });
  }
});

// Delete employee picture
router.delete('/:pak/picture', async (req, res) => {
  try {
    const { pak } = req.params;

    // Clear PICTURE data from database (set to NULL)
    const [result] = await db.execute(
      'UPDATE manpower SET PICTURE = NULL WHERE PAK = ?',
      [pak]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Picture deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting picture'
    });
  }
});

// Check if employee has picture
router.get('/:pak/has-picture', async (req, res) => {
  try {
    const { pak } = req.params;

    const [employees] = await db.execute(
      'SELECT PICTURE FROM manpower WHERE PAK = ?',
      [pak]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const hasPicture = employees[0].PICTURE !== null;

    res.json({
      success: true,
      hasPicture: hasPicture
    });

  } catch (error) {
    console.error('❌ Error checking picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking picture'
    });
  }
});

// Update PAF employee details
router.put('/:pak', async (req, res) => {
  let connection;
  try {
    const { pak } = req.params;
    const updateData = req.body;

    console.log(`🔄 Updating PAF employee data for PAK: ${pak}`);
    console.log('Update data:', updateData);

    // Check if employee exists
    const [existing] = await db.execute(
      'SELECT PAK FROM manpower WHERE PAK = ?',
      [pak]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PAF Employee not found'
      });
    }

    // Prepare update fields
    const updateFields = [];
    const updateValues = [];

    // Field mapping for PAF employees
    const fieldMapping = {
      category: 'CATEGORY',
      rank: '`RANK`',
      employee_name: 'EMPLOYEE_NAME',
      branch_trade: 'BRANCHTRADE',
      phone_office: 'PHONE_OFFICE',
      intercom: 'INTERCOM',
      phone_res: 'PHONE_RES',
      defcom_office: 'DEFCOM_OFFICE',
      defcom_res: 'DEFCOM_RES',
      mobile: 'MOBILE',
      address: 'ADDRESS',
      email: 'EMAIL',
      postin_date: 'POSTIN_DATE',
      postout_date: 'POSTOUT_DATE',
      section: 'SECTION',
      deployment: 'DEPLOYMENT',
      custodian: 'CUSTODIAN'
    };

    Object.keys(fieldMapping).forEach(key => {
      // Check if the key exists in the update data
      if (key in updateData) {
        updateFields.push(`${fieldMapping[key]} = ?`);
        
        // Handle empty strings for all fields
        if (updateData[key] === '' || updateData[key] === null || updateData[key] === undefined) {
          // For DATE fields, set to NULL
          if (key === 'postin_date' || key === 'postout_date') {
            updateValues.push(null);
          } else if (updateData[key] === 'null') {
            // Handle string 'null' values
            updateValues.push(null);
          } else {
            // For other fields, set to empty string
            updateValues.push('');
          }
        } else {
          // For date fields, ensure proper format
          if (key === 'postin_date' || key === 'postout_date') {
            // Parse and format date
            const date = new Date(updateData[key]);
            if (!isNaN(date.getTime())) {
              updateValues.push(date.toISOString().split('T')[0]);
            } else {
              updateValues.push(null);
            }
          } else if (updateData[key] === 'null') {
            // Handle string 'null' values for other fields
            updateValues.push(null);
          } else {
            updateValues.push(updateData[key]);
          }
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateValues.push(pak);

    const query = `
      UPDATE manpower 
      SET ${updateFields.join(', ')} 
      WHERE PAK = ?
    `;

    console.log(`📝 Executing PAF UPDATE query: ${query}`);
    console.log(`📝 With values:`, updateValues);

    const [result] = await db.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update PAF employee data'
      });
    }

    console.log(`✅ PAF Employee data updated successfully. Affected rows: ${result.affectedRows}`);

    // Return updated employee data
    const [updatedEmployee] = await db.execute(
      `SELECT * FROM manpower WHERE PAK = ?`,
      [pak]
    );

    res.json({
      success: true,
      message: 'PAF Employee data updated successfully',
      affectedRows: result.affectedRows,
      employee: updatedEmployee[0]
    });

  } catch (error) {
    console.error('❌ Error updating PAF employee data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
      error: error.message,
      sql: error.sql
    });
  }
});

// Get current employees (POSTOUT_DATE is NULL or future date)
router.get('/current', async (req, res) => {
  try {
    const [employees] = await db.execute(
      `SELECT PAK, CATEGORY, \`RANK\`, EMPLOYEE_NAME 
       FROM manpower 
       WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
       ORDER BY EMPLOYEE_NAME`
    );

    const formattedEmployees = employees.map(emp => 
      `${emp.PAK} : ${emp.RANK || 'N/A'} : ${emp.EMPLOYEE_NAME}`
    );

    res.json({
      success: true,
      employees: formattedEmployees
    });

  } catch (error) {
    console.error('Error fetching current employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get ex-employees (POSTOUT_DATE is not NULL and in the past)
router.get('/ex', async (req, res) => {
  try {
    const [employees] = await db.execute(
      `SELECT PAK, CATEGORY, \`RANK\`, EMPLOYEE_NAME 
       FROM manpower 
       WHERE POSTOUT_DATE IS NOT NULL AND POSTOUT_DATE <= CURDATE()
       ORDER BY EMPLOYEE_NAME`
    );

    const formattedEmployees = employees.map(emp => 
      `${emp.PAK} : ${emp.RANK || 'N/A'} : ${emp.EMPLOYEE_NAME}`
    );

    res.json({
      success: true,
      employees: formattedEmployees
    });

  } catch (error) {
    console.error('Error fetching ex-employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all employees for dropdown (simple version)
router.get('/list/current', async (req, res) => {
  try {
    console.log('🔍 Fetching current employees list...');
    
    const [employees] = await db.execute(
      `SELECT PAK, \`RANK\`, EMPLOYEE_NAME 
       FROM manpower 
       WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
       ORDER BY EMPLOYEE_NAME`
    );

    console.log(`✅ Found ${employees.length} current employees`);

    const formattedEmployees = employees.map(emp => {
      const displayText = `${emp.PAK} : ${emp.RANK || 'No Rank'} : ${emp.EMPLOYEE_NAME || 'No Name'}`;
      return displayText;
    });

    res.json({
      success: true,
      employees: formattedEmployees
    });

  } catch (error) {
    console.error('❌ Error fetching current employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get ex-employees for dropdown
router.get('/list/ex', async (req, res) => {
  try {
    console.log('🔍 Fetching ex-employees list...');
    
    const [employees] = await db.execute(
      `SELECT PAK, \`RANK\`, EMPLOYEE_NAME 
       FROM manpower 
       WHERE POSTOUT_DATE IS NOT NULL AND POSTOUT_DATE <= CURDATE()
       ORDER BY EMPLOYEE_NAME`
    );

    console.log(`✅ Found ${employees.length} ex-employees`);

    const formattedEmployees = employees.map(emp => {
      const displayText = `${emp.PAK} : ${emp.RANK || 'No Rank'} : ${emp.EMPLOYEE_NAME || 'No Name'}`;
      return displayText;
    });

    res.json({
      success: true,
      employees: formattedEmployees
    });

  } catch (error) {
    console.error('❌ Error fetching ex-employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Simple test endpoint to check if employees exist
router.get('/list/test', async (req, res) => {
  try {
    console.log('🧪 Testing employee data...');
    
    const [allEmployees] = await db.execute(
      `SELECT PAK, \`RANK\`, EMPLOYEE_NAME, POSTOUT_DATE 
       FROM manpower 
       LIMIT 10`
    );

    console.log('Sample employees:', allEmployees);

    res.json({
      success: true,
      totalEmployees: allEmployees.length,
      sampleEmployees: allEmployees
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed: ' + error.message
    });
  }
});

// ============================================
// NEW APIs for JCO/Airman Strength Form
// Added after all existing routes
// ============================================

// ✅ API 1: Get all JCOs and Airmen only
router.get('/jco-airmen/all', async (req, res) => {
  try {
    console.log('🔍 Fetching JCO and Airmen data...');
    
    // Query to get only JCOs and Airmen
    const query = `
      SELECT 
        PAK,
        CATEGORY,
        \`RANK\`,
        EMPLOYEE_NAME,
        BRANCHTRADE,
        PHONE_OFFICE,
        INTERCOM,
        PHONE_RES,
        DEFCOM_OFFICE,
        DEFCOM_RES,
        MOBILE,
        ADDRESS,
        EMAIL,
        POSTIN_DATE,
        SECTION,
        DEPLOYMENT
      FROM manpower 
      WHERE 
        (CATEGORY LIKE '%JCO%' OR 
         CATEGORY LIKE '%AIRMAN%' OR
         CATEGORY LIKE '%AIRMEN%' OR
         \`RANK\` LIKE '%HAVILDAR%' OR 
         \`RANK\` LIKE '%NAIK%' OR 
         \`RANK\` LIKE '%LANCE NAIK%' OR
         \`RANK\` LIKE '%HAWALDAR%')
        AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
      ORDER BY 
        CASE 
          WHEN CATEGORY LIKE '%JCO%' THEN 1
          WHEN CATEGORY LIKE '%AIRMAN%' THEN 2
          WHEN CATEGORY LIKE '%AIRMEN%' THEN 2
          ELSE 3
        END,
        \`RANK\`,
        EMPLOYEE_NAME
    `;
    
    const [results] = await db.execute(query);
    
    console.log(`✅ Found ${results.length} JCOs/Airmen in database`);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching JCO/Airman data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch JCO/Airman data',
      error: error.message
    });
  }
});

// ✅ API 2: Get JCO/Airman statistics
router.get('/jco-airmen/stats', async (req, res) => {
  try {
    console.log('📊 Fetching JCO/Airman statistics...');
    
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN CATEGORY LIKE '%JCO%' THEN 1 ELSE 0 END) as jcos,
        SUM(CASE WHEN CATEGORY LIKE '%AIRMAN%' OR CATEGORY LIKE '%AIRMEN%' THEN 1 ELSE 0 END) as airmen,
        COUNT(DISTINCT \`RANK\`) as unique_ranks,
        COUNT(DISTINCT SECTION) as unique_sections,
        COUNT(DISTINCT DEPLOYMENT) as unique_deployments
      FROM manpower 
      WHERE 
        (CATEGORY LIKE '%JCO%' OR 
         CATEGORY LIKE '%AIRMAN%' OR
         CATEGORY LIKE '%AIRMEN%')
        AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
    `;
    
    const [stats] = await db.execute(query);
    
    // Get rank distribution
    const rankQuery = `
      SELECT \`RANK\`, COUNT(*) as count
      FROM manpower 
      WHERE (CATEGORY LIKE '%JCO%' OR CATEGORY LIKE '%AIRMAN%' OR CATEGORY LIKE '%AIRMEN%')
        AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
      GROUP BY \`RANK\`
      ORDER BY count DESC
    `;
    
    const [rankDistribution] = await db.execute(rankQuery);
    
    // Get deployment distribution
    const deploymentQuery = `
      SELECT DEPLOYMENT, COUNT(*) as count
      FROM manpower 
      WHERE (CATEGORY LIKE '%JCO%' OR CATEGORY LIKE '%AIRMAN%' OR CATEGORY LIKE '%AIRMEN%')
        AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
      GROUP BY DEPLOYMENT
      ORDER BY count DESC
    `;
    
    const [deploymentDistribution] = await db.execute(deploymentQuery);
    
    res.json({
      success: true,
      stats: stats[0],
      rankDistribution,
      deploymentDistribution,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching JCO/Airman statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch JCO/Airman statistics',
      error: error.message
    });
  }
});

// ✅ API 3: Search JCOs/Airmen (optional - for search functionality)
router.get('/jco-airmen/search', async (req, res) => {
  try {
    const { q, category, rank, deployment } = req.query;
    
    console.log('🔍 Searching JCOs/Airmen with params:', req.query);
    
    let baseQuery = `
      SELECT 
        PAK,
        CATEGORY,
        \`RANK\`,
        EMPLOYEE_NAME,
        BRANCHTRADE,
        PHONE_OFFICE,
        INTERCOM,
        PHONE_RES,
        DEFCOM_OFFICE,
        DEFCOM_RES,
        MOBILE,
        ADDRESS,
        EMAIL,
        POSTIN_DATE,
        SECTION,
        DEPLOYMENT
      FROM manpower 
      WHERE 
        (CATEGORY LIKE '%JCO%' OR 
         CATEGORY LIKE '%AIRMAN%' OR
         CATEGORY LIKE '%AIRMEN%')
        AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
    `;
    
    const params = [];
    
    if (q) {
      baseQuery += ` AND (
        EMPLOYEE_NAME LIKE ? OR 
        PAK LIKE ? OR 
        \`RANK\` LIKE ? OR 
        SECTION LIKE ? OR 
        BRANCHTRADE LIKE ? OR 
        DEPLOYMENT LIKE ?
      )`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (category) {
      baseQuery += ` AND CATEGORY LIKE ?`;
      params.push(`%${category}%`);
    }
    
    if (rank) {
      baseQuery += ` AND \`RANK\` LIKE ?`;
      params.push(`%${rank}%`);
    }
    
    if (deployment) {
      baseQuery += ` AND DEPLOYMENT LIKE ?`;
      params.push(`%${deployment}%`);
    }
    
    baseQuery += ` ORDER BY CATEGORY, \`RANK\`, EMPLOYEE_NAME`;
    
    const [results] = await db.execute(baseQuery, params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error searching JCO/Airmen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search JCO/Airmen',
      error: error.message
    });
  }
});

// Test route for PAF employee API
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PAF Employee API is working!',
    endpoints: {
      'GET /api/PAFemployee/:pak': 'Get PAF employee details by PAK',
      'PUT /api/PAFemployee/:pak': 'Update PAF employee details',
      'PUT /api/PAFemployee/:pak/picture': 'Update employee picture',
      'GET /api/PAFemployee/:pak/picture': 'Get employee picture',
      'DELETE /api/PAFemployee/:pak/picture': 'Delete employee picture',
      'GET /api/PAFemployee/:pak/has-picture': 'Check if employee has picture',
      // New endpoints added
      'GET /api/PAFemployee/jco-airmen/all': 'Get all JCOs and Airmen',
      'GET /api/PAFemployee/jco-airmen/stats': 'Get JCO/Airman statistics',
      'GET /api/PAFemployee/jco-airmen/search': 'Search JCOs/Airmen'
    }
  });
});


// ============================================
// ROLE MANAGEMENT APIs
// ============================================

// Get all employees for role assignment dropdown
router.get('/list/assign-roles', async (req, res) => {
  try {
    console.log('🔍 Fetching employees for role assignment...');
    
    // Get all current employees (Civilian and PAF)
    const [employees] = await db.execute(
      `SELECT PAK, CATEGORY, \`RANK\`, EMPLOYEE_NAME 
       FROM manpower 
       WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
       ORDER BY CATEGORY, EMPLOYEE_NAME`
    );

    console.log(`✅ Found ${employees.length} employees for role assignment`);

    // Format employees into Civilian and PAF categories
    const civilianEmployees = [];
    const pafEmployees = [];

    employees.forEach(emp => {
      const displayText = `${emp.PAK} : ${emp.RANK || 'No Rank'} : ${emp.EMPLOYEE_NAME || 'No Name'}`;
      
      if (emp.CATEGORY && emp.CATEGORY.toLowerCase() === 'civilian') {
        civilianEmployees.push(displayText);
      } else if (emp.CATEGORY && (
        emp.CATEGORY.toLowerCase().includes('jco') || 
        emp.CATEGORY.toLowerCase().includes('airman') ||
        emp.CATEGORY.toLowerCase().includes('officer')
      )) {
        pafEmployees.push(displayText);
      }
    });

    res.json({
      success: true,
      civilianEmployees,
      pafEmployees,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching employees for role assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get user roles by PAK
router.get('/roles/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    console.log(`🔍 Fetching roles for PAK: ${pak}`);

    // Get all roles for this PAK from manpower_roles table
    const [roles] = await db.execute(
      `SELECT * FROM manpower_roles WHERE PAK = ? ORDER BY MODULE`,
      [pak]
    );

    if (roles.length === 0) {
      return res.json({
        success: true,
        roles: [],
        message: 'No roles assigned for this user'
      });
    }

    // Format roles into a more usable structure
    const formattedRoles = {};
    roles.forEach(role => {
      const module = role.MODULE;
      formattedRoles[module] = {
        add: role.ADD_ROLE === 'on',
        update: role.UPDATE_ROLE === 'on',
        view: role.VIEW_ROLE === 'on',
        assign: role.ASSIGN_ROLE === 'on'
      };
    });

    console.log(`✅ Found ${roles.length} role entries for ${pak}`);

    res.json({
      success: true,
      roles: formattedRoles,
      count: roles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user roles',
      error: error.message
    });
  }
});

// Assign/Update user roles
router.post('/roles/assign', async (req, res) => {
  try {
    const { pak, roles } = req.body;
    
    console.log(`🔄 Assigning roles for PAK: ${pak}`);
    console.log('Roles data:', roles);

    if (!pak) {
      return res.status(400).json({
        success: false,
        message: 'PAK is required'
      });
    }

    // First, delete existing roles for this PAK
    await db.execute(
      'DELETE FROM manpower_roles WHERE PAK = ?',
      [pak]
    );

    // Prepare role data for insertion
    const modules = ['Civilian_HR', 'Civilian_Attendance', 'PAF_HR', 'PAF_Attendance'];
    const insertPromises = [];

    modules.forEach(module => {
      const moduleKey = module.toLowerCase().replace('_', '');
      const moduleRoles = roles[moduleKey];
      
      if (moduleRoles) {
        const roleData = {
          PAK: pak,
          MODULE: module,
          ADD_ROLE: moduleRoles.add ? 'on' : 'off',
          UPDATE_ROLE: moduleRoles.update ? 'on' : 'off',
          VIEW_ROLE: moduleRoles.view ? 'on' : 'off',
          ASSIGN_ROLE: moduleRoles.assign ? 'on' : 'off'
        };

        // If any role is assigned for this module, insert it
        if (moduleRoles.add || moduleRoles.update || moduleRoles.view || moduleRoles.assign) {
          const insertQuery = `
            INSERT INTO manpower_roles 
            (PAK, MODULE, ADD_ROLE, UPDATE_ROLE, VIEW_ROLE, ASSIGN_ROLE)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          
          insertPromises.push(
            db.execute(insertQuery, [
              roleData.PAK,
              roleData.MODULE,
              roleData.ADD_ROLE,
              roleData.UPDATE_ROLE,
              roleData.VIEW_ROLE,
              roleData.ASSIGN_ROLE
            ])
          );
        }
      }
    });

    // Execute all insert queries
    await Promise.all(insertPromises);

    console.log(`✅ Roles assigned successfully for ${pak}`);

    res.json({
      success: true,
      message: 'User roles assigned successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error assigning user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign user roles',
      error: error.message
    });
  }
});

// Get all role assignments
router.get('/roles/all', async (req, res) => {
  try {
    console.log('📋 Fetching all role assignments...');
    
    const [allRoles] = await db.execute(
      `SELECT mr.*, m.EMPLOYEE_NAME, m.CATEGORY, m.RANK 
       FROM manpower_roles mr
       LEFT JOIN manpower m ON mr.PAK = m.PAK
       ORDER BY mr.PAK, mr.MODULE`
    );

    console.log(`✅ Found ${allRoles.length} role assignments`);

    // Group roles by PAK
    const groupedRoles = {};
    allRoles.forEach(role => {
      const pak = role.PAK;
      if (!groupedRoles[pak]) {
        groupedRoles[pak] = {
          employee_name: role.EMPLOYEE_NAME || 'Unknown',
          category: role.CATEGORY || 'Unknown',
          rank: role.RANK || 'N/A',
          roles: {}
        };
      }
      
      groupedRoles[pak].roles[role.MODULE] = {
        add: role.ADD_ROLE === 'on',
        update: role.UPDATE_ROLE === 'on',
        view: role.VIEW_ROLE === 'on',
        assign: role.ASSIGN_ROLE === 'on'
      };
    });

    res.json({
      success: true,
      data: groupedRoles,
      count: Object.keys(groupedRoles).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching all role assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role assignments',
      error: error.message
    });
  }
});

// Update existing role assignments
router.put('/roles/update/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    const { roles } = req.body;
    
    console.log(`🔄 Updating roles for PAK: ${pak}`);

    // First delete existing roles for specific modules
    if (roles && Object.keys(roles).length > 0) {
      const modules = Object.keys(roles).map(module => 
        module.toUpperCase().replace('civilianhr', 'Civilian_HR')
                     .replace('civilianattendance', 'Civilian_Attendance')
                     .replace('pafhr', 'PAF_HR')
                     .replace('pafattendance', 'PAF_Attendance')
      );
      
      await db.execute(
        `DELETE FROM manpower_roles WHERE PAK = ? AND MODULE IN (?)`,
        [pak, modules]
      );

      // Insert updated roles
      const insertPromises = [];
      
      Object.entries(roles).forEach(([moduleKey, moduleRoles]) => {
        const module = moduleKey.toUpperCase().replace('civilianhr', 'Civilian_HR')
                                         .replace('civilianattendance', 'Civilian_Attendance')
                                         .replace('pafhr', 'PAF_HR')
                                         .replace('pafattendance', 'PAF_Attendance');
        
        const roleData = {
          PAK: pak,
          MODULE: module,
          ADD_ROLE: moduleRoles.add ? 'on' : 'off',
          UPDATE_ROLE: moduleRoles.update ? 'on' : 'off',
          VIEW_ROLE: moduleRoles.view ? 'on' : 'off',
          ASSIGN_ROLE: moduleRoles.assign ? 'on' : 'off'
        };

        const insertQuery = `
          INSERT INTO manpower_roles 
          (PAK, MODULE, ADD_ROLE, UPDATE_ROLE, VIEW_ROLE, ASSIGN_ROLE)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        insertPromises.push(
          db.execute(insertQuery, [
            roleData.PAK,
            roleData.MODULE,
            roleData.ADD_ROLE,
            roleData.UPDATE_ROLE,
            roleData.VIEW_ROLE,
            roleData.ASSIGN_ROLE
          ])
        );
      });

      await Promise.all(insertPromises);
    }

    console.log(`✅ Roles updated successfully for ${pak}`);

    res.json({
      success: true,
      message: 'User roles updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user roles',
      error: error.message
    });
  }
});


// ============================================
// PAF ATTENDANCE APIs - COMPLETE VERSION
// ============================================

// Test endpoint to verify API is working
router.get('/attendance/test', (req, res) => {
  console.log('✅ Attendance API test endpoint called');
  res.json({
    success: true,
    message: 'PAF Attendance API is working!',
    timestamp: new Date().toISOString(),
    available_endpoints: [
      'GET /attendance/view/:pak - View attendance for specific PAK',
      'GET /attendance/summary - Get summary for all employees',
      'GET /attendance/dates/:pak - Get available dates',
      'GET /attendance/check/:pak - Check if employee has attendance records'
    ]
  });
});

// Check if employee exists and has attendance records
router.get('/attendance/check/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    console.log(`🔍 Checking attendance records for PAK: ${pak}`);
    
    // Check if employee exists in manpower table
    const [employeeInfo] = await db.execute(
      `SELECT PAK, CATEGORY, \`RANK\`, EMPLOYEE_NAME 
       FROM manpower WHERE PAK = ?`,
      [pak]
    );
    
    if (employeeInfo.length === 0) {
      return res.json({
        success: true,
        exists: false,
        message: `Employee ${pak} not found in manpower table`
      });
    }
    
    // Check if attendance table exists and has records
    let attendanceCount = 0;
    let tableExists = true;
    
    try {
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as count FROM paf_attendence WHERE PAK = ?`,
        [pak]
      );
      attendanceCount = countResult[0].count;
    } catch (tableError) {
      console.log('paf_attendence table might not exist:', tableError.message);
      tableExists = false;
    }
    
    const employee = employeeInfo[0];
    res.json({
      success: true,
      exists: true,
      tableExists: tableExists,
      employee: {
        pak: employee.PAK,
        category: employee.CATEGORY,
        rank: employee.RANK,
        name: employee.EMPLOYEE_NAME
      },
      attendanceCount: attendanceCount,
      message: `Found employee ${pak} with ${attendanceCount} attendance records`
    });
    
  } catch (error) {
    console.error('❌ Error checking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check attendance records',
      error: error.message
    });
  }
});

// Get available attendance months for dropdown
router.get('/attendance/months/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    console.log(`📅 Fetching available months for PAK: ${pak}`);
    
    const [months] = await db.execute(
      `SELECT DISTINCT 
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m') as month_year,
        MIN(ATTENDENCE_DATE) as start_date,
        MAX(ATTENDENCE_DATE) as end_date,
        COUNT(*) as record_count
       FROM paf_attendence 
       WHERE PAK = ?
       GROUP BY DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m')
       ORDER BY ATTENDENCE_DATE DESC
       LIMIT 12`,
      [pak]
    );
    
    console.log(`✅ Found ${months.length} months of data for ${pak}`);
    
    res.json({
      success: true,
      data: months,
      count: months.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching attendance months:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance months',
      error: error.message
    });
  }
});

// MAIN API: Get PAF attendance for specific employee within date range
router.get('/attendance/view/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`📊 Fetching REAL attendance for PAK: ${pak} from ${startDate} to ${endDate}`);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Step 1: Get employee information
    const [employeeInfo] = await db.execute(
      `SELECT PAK, CATEGORY, \`RANK\`, EMPLOYEE_NAME 
       FROM manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (employeeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Employee ${pak} not found in the system`
      });
    }

    // Step 2: Get attendance records
    let attendanceRecords = [];
    let totalRecords = 0;
    
    try {
      const [records] = await db.execute(
        `SELECT 
          ATTENDENCE_ID,
          DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as attendence_date,
          STATUS,
          REMARKS,
          DAYNAME(ATTENDENCE_DATE) as day_name
         FROM paf_attendence 
         WHERE PAK = ? 
           AND ATTENDENCE_DATE BETWEEN ? AND ?
         ORDER BY ATTENDENCE_DATE`,
        [pak, startDate, endDate]
      );
      
      attendanceRecords = records;
      totalRecords = records.length;
      
      // Add row numbers
      attendanceRecords = attendanceRecords.map((record, index) => ({
        ...record,
        row_number: index + 1
      }));
      
    } catch (tableError) {
      console.error('❌ Error accessing paf_attendence table:', tableError.message);
      return res.status(500).json({
        success: false,
        message: 'Attendance database table error',
        error: tableError.message,
        suggestion: 'Check if paf_attendence table exists and has proper structure'
      });
    }

    // Step 3: Calculate statistics from REAL data
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    
    attendanceRecords.forEach(record => {
      const status = record.STATUS ? record.STATUS.toUpperCase() : '';
      
      if (status.includes('PRESENT')) {
        presentCount++;
      } else if (status.includes('ABSENT')) {
        absentCount++;
      } else if (status.includes('LATE')) {
        lateCount++;
      } else if (status.includes('HALF') || status.includes('HALF DAY')) {
        halfDayCount++;
      } else if (status.includes('LEAVE')) {
        leaveCount++;
      }
    });

    // Step 4: Calculate working days (excluding weekends)
    const workingDays = attendanceRecords.filter(record => {
      const dayName = record.day_name;
      return dayName !== 'Saturday' && dayName !== 'Sunday';
    }).length;

    // Step 5: Prepare response
    const employee = employeeInfo[0];
    const responseData = {
      employee: {
        pak: employee.PAK,
        category: employee.CATEGORY,
        rank: employee.RANK,
        name: employee.EMPLOYEE_NAME
      },
      dateRange: {
        startDate,
        endDate,
        totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
      },
      attendanceData: attendanceRecords,
      statistics: {
        totalRecords: totalRecords,
        workingDays: workingDays,
        presentCount: presentCount,
        absentCount: absentCount,
        lateCount: lateCount,
        halfDayCount: halfDayCount,
        leaveCount: leaveCount,
        attendancePercentage: workingDays > 0 ? ((presentCount / workingDays) * 100).toFixed(2) : 0
      },
      summaryData: [
        { STATUS: 'Present', countt: presentCount },
        { STATUS: 'Absent', countt: absentCount },
        { STATUS: 'Late', countt: lateCount },
        { STATUS: 'Half Day', countt: halfDayCount }
      ],
      leaveData: leaveCount > 0 ? [{ STATUS: 'A/Leave', countt: leaveCount }] : []
    };

    console.log(`✅ REAL DATA: Found ${totalRecords} attendance records for ${pak}`);
    console.log(`📈 Statistics: Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount}, Half Day: ${halfDayCount}, Leave: ${leaveCount}`);

    res.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      data_source: 'REAL_DATABASE',
      note: totalRecords === 0 ? 'No attendance records found for this date range' : 'Real data fetched successfully'
    });

  } catch (error) {
    console.error('❌ Error in attendance API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data from database',
      error: error.message,
      suggestion: 'Check database connection and table structure'
    });
  }
});

// Get attendance summary for all PAF employees
router.get('/attendance/summary/all', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log(`📋 Fetching attendance summary for all PAF employees from ${startDate} to ${endDate}`);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const [summary] = await db.execute(
      `SELECT 
        m.PAK,
        m.RANK,
        m.EMPLOYEE_NAME,
        m.CATEGORY,
        COUNT(a.ATTENDENCE_ID) as total_days,
        SUM(CASE WHEN UPPER(a.STATUS) LIKE '%PRESENT%' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN UPPER(a.STATUS) LIKE '%ABSENT%' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN UPPER(a.STATUS) LIKE '%LATE%' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN UPPER(a.STATUS) LIKE '%HALF%' THEN 1 ELSE 0 END) as half_days,
        SUM(CASE WHEN UPPER(a.STATUS) LIKE '%LEAVE%' THEN 1 ELSE 0 END) as leave_days
       FROM manpower m
       LEFT JOIN paf_attendence a ON m.PAK = a.PAK 
         AND a.ATTENDENCE_DATE BETWEEN ? AND ?
       WHERE m.CATEGORY IN ('Officer', 'JCO', 'Airmen')
         AND (m.POSTOUT_DATE IS NULL OR m.POSTOUT_DATE > CURDATE())
       GROUP BY m.PAK, m.RANK, m.EMPLOYEE_NAME, m.CATEGORY
       ORDER BY m.EMPLOYEE_NAME`,
      [startDate, endDate]
    );

    console.log(`✅ Found attendance data for ${summary.length} PAF employees`);

    res.json({
      success: true,
      data: summary,
      count: summary.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary',
      error: error.message
    });
  }
});

// Add attendance record (for future use)
router.post('/attendance/add', async (req, res) => {
  try {
    const { pak, date, status, remarks } = req.body;
    
    console.log(`➕ Adding attendance for PAK: ${pak} on ${date} - Status: ${status}`);
    
    // Check if record already exists
    const [existing] = await db.execute(
      `SELECT ATTENDENCE_ID FROM paf_attendence 
       WHERE PAK = ? AND ATTENDENCE_DATE = ?`,
      [pak, date]
    );
    
    if (existing.length > 0) {
      // Update existing record
      await db.execute(
        `UPDATE paf_attendence 
         SET STATUS = ?, REMARKS = ?
         WHERE PAK = ? AND ATTENDENCE_DATE = ?`,
        [status, remarks, pak, date]
      );
      
      console.log(`✅ Updated attendance record for ${pak} on ${date}`);
      
      res.json({
        success: true,
        action: 'updated',
        message: 'Attendance record updated successfully'
      });
    } else {
      // Insert new record
      const attendanceId = Date.now(); // Simple ID generation
      
      await db.execute(
        `INSERT INTO paf_attendence 
         (ATTENDENCE_ID, ATTENDENCE_DATE, PAK, STATUS, REMARKS)
         VALUES (?, ?, ?, ?, ?)`,
        [attendanceId, date, pak, status, remarks]
      );
      
      console.log(`✅ Added new attendance record for ${pak} on ${date}`);
      
      res.json({
        success: true,
        action: 'added',
        message: 'Attendance record added successfully'
      });
    }
    
  } catch (error) {
    console.error('❌ Error adding attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add attendance record',
      error: error.message
    });
  }
});

// Update the main router.get('/') to include attendance endpoints
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PAF Employee API is working!',
    endpoints: {
      'GET /api/PAFemployee/:pak': 'Get PAF employee details by PAK',
      'GET /api/PAFemployee/attendance/view/:pak': 'View attendance for specific PAK',
      'GET /api/PAFemployee/attendance/summary/all': 'Get attendance summary for all',
      'GET /api/PAFemployee/attendance/months/:pak': 'Get available months',
      'GET /api/PAFemployee/attendance/check/:pak': 'Check employee attendance records',
      'POST /api/PAFemployee/attendance/add': 'Add/Update attendance record',
      'PUT /api/PAFemployee/:pak': 'Update PAF employee details',
      // ... other endpoints
    }
  });
});




// ================================================
// CREATE NEW PAF EMPLOYEE AND UPDATE PROFILE RECORD ROUTES
// ================================================

// Create new PAF employee

// Create new PAF employee - UPDATED VERSION
router.post('/create', async (req, res) => {
  let connection;
  try {
    const employeeData = req.body;
    
    console.log(`📝 Creating new PAF employee: ${employeeData.employee_name}`);
    console.log('PAF Employee data:', employeeData);

    // Validate required fields
    if (!employeeData.pak || !employeeData.employee_name || !employeeData.category || !employeeData.rank) {
      return res.status(400).json({
        success: false,
        message: 'PAK, Employee Name, Category, and Rank are required'
      });
    }

    // Check if PAK already exists
    const [existingPAK] = await db.execute(
      'SELECT PAK FROM manpower WHERE PAK = ?',
      [employeeData.pak]
    );

    if (existingPAK.length > 0) {
      return res.status(400).json({
        success: false,
        message: `PAK ${employeeData.pak} already exists`
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert new PAF employee
      const query = `
        INSERT INTO manpower (
          PAK, CATEGORY, \`RANK\`, EMPLOYEE_NAME, BRANCHTRADE,
          PHONE_OFFICE, INTERCOM, PHONE_RES, DEFCOM_OFFICE, DEFCOM_RES,
          MOBILE, ADDRESS, EMAIL, POSTIN_DATE, POSTOUT_DATE,
          SECTION, DEPLOYMENT, CUSTODIAN, PASSWORD
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Generate default password (PBKDF2 hash of "123")
      const crypto = require('crypto');
      const iterations = 1000;
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = crypto.pbkdf2Sync(
        "123",
        Buffer.from(salt, 'hex'),
        iterations,
        64,
        'sha1'
      );
      const defaultPassword = `${iterations}:${salt}:${derivedKey.toString('hex')}`;

      // Handle null values properly
      const values = [
        employeeData.pak,
        employeeData.category,
        employeeData.rank,
        employeeData.employee_name,
        employeeData.branch_trade && employeeData.branch_trade !== 'null' ? employeeData.branch_trade : null,
        employeeData.phone_office && employeeData.phone_office !== 'null' ? employeeData.phone_office : null,
        employeeData.intercom && employeeData.intercom !== 'null' ? employeeData.intercom : null,
        employeeData.phone_res && employeeData.phone_res !== 'null' ? employeeData.phone_res : null,
        employeeData.defcom_office && employeeData.defcom_office !== 'null' ? employeeData.defcom_office : null,
        employeeData.defcom_res && employeeData.defcom_res !== 'null' ? employeeData.defcom_res : null,
        employeeData.mobile && employeeData.mobile !== 'null' ? employeeData.mobile : null,
        employeeData.address && employeeData.address !== 'null' ? employeeData.address : null,
        employeeData.email && employeeData.email !== 'null' ? employeeData.email : null,
        employeeData.postin_date && employeeData.postin_date !== '' ? employeeData.postin_date : null,
        employeeData.postout_date && employeeData.postout_date !== '' ? employeeData.postout_date : null,
        employeeData.section && employeeData.section !== 'null' ? employeeData.section : null,
        employeeData.deployment && employeeData.deployment !== 'null' ? employeeData.deployment : null,
        employeeData.custodian && employeeData.custodian !== 'null' ? employeeData.custodian : null,
        defaultPassword
      ];

      console.log('Executing insert query with values:', values);

      const [result] = await connection.execute(query, values);

      await connection.commit();
      await connection.release();

      console.log(`✅ PAF Employee created successfully. ID: ${employeeData.pak}, Affected rows: ${result.affectedRows}`);

      res.json({
        success: true,
        message: 'PAF Employee created successfully',
        employee: {
          pak: employeeData.pak,
          employee_name: employeeData.employee_name,
          category: employeeData.category,
          rank: employeeData.rank
        },
        affectedRows: result.affectedRows,
        note: 'Default password: 123456'
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      console.error('❌ Error in PAF employee creation:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating PAF employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Generate next available PAF PAK
router.get('/generate-pak', async (req, res) => {
  try {
    const { category } = req.query;
    
    let prefix = 'PAF-';
    if (category === 'Officer') prefix = 'OF-';
    else if (category === 'JCO') prefix = 'JCO-';
    else if (category === 'Airmen') prefix = 'AM-';
    else if (category === 'Civilian') prefix = 'CIV-';

    // Get the highest PAK with this prefix
    const [results] = await db.execute(
      `SELECT PAK FROM manpower 
       WHERE PAK LIKE ? 
       ORDER BY CAST(SUBSTRING(PAK, LOCATE('-', PAK) + 1) AS UNSIGNED) DESC 
       LIMIT 1`,
      [`${prefix}%`]
    );

    let nextPAK = `${prefix}001`;
    
    if (results.length > 0) {
      const lastPAK = results[0].PAK;
      const parts = lastPAK.split('-');
      if (parts.length >= 2) {
        const lastNumber = parseInt(parts[1]) || 0;
        nextPAK = `${parts[0]}-${String(lastNumber + 1).padStart(3, '0')}`;
      }
    }

    res.json({
      success: true,
      pak: nextPAK
    });

  } catch (error) {
    console.error('Error generating PAF PAK:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check if PAF PAK exists
router.get('/check-pak/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    console.log(`🔍 Checking PAF PAK: ${pak}`);

    const [existing] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME FROM manpower WHERE PAK = ?',
      [pak]
    );

    res.json({
      success: true,
      exists: existing.length > 0,
      employee: existing.length > 0 ? existing[0] : null
    });

  } catch (error) {
    console.error('Error checking PAF PAK:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update PAF employee details - COMPLETE VERSION
router.put('/:pak', async (req, res) => {
  let connection;
  try {
    const { pak } = req.params;
    const updateData = req.body;

    console.log(`🔄 Updating PAF employee data for PAK: ${pak}`, updateData);

    // Check if employee exists
    const [existing] = await db.execute(
      'SELECT PAK FROM manpower WHERE PAK = ?',
      [pak]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PAF Employee not found'
      });
    }

    // Prepare update fields
    const updateFields = [];
    const updateValues = [];

    // Field mapping for PAF employees
    const fieldMapping = {
      category: 'CATEGORY',
      rank: '`RANK`',
      employee_name: 'EMPLOYEE_NAME',
      branch_trade: 'BRANCHTRADE',
      phone_office: 'PHONE_OFFICE',
      intercom: 'INTERCOM',
      phone_res: 'PHONE_RES',
      defcom_office: 'DEFCOM_OFFICE',
      defcom_res: 'DEFCOM_RES',
      mobile: 'MOBILE',
      address: 'ADDRESS',
      email: 'EMAIL',
      postin_date: 'POSTIN_DATE',
      postout_date: 'POSTOUT_DATE',
      section: 'SECTION',
      deployment: 'DEPLOYMENT',
      custodian: 'CUSTODIAN'
    };

    Object.keys(fieldMapping).forEach(key => {
      // Check if the key exists in the update data
      if (key in updateData) {
        updateFields.push(`${fieldMapping[key]} = ?`);
        
        // Handle empty strings for all fields
        if (updateData[key] === '' || updateData[key] === null || updateData[key] === undefined) {
          // For DATE fields, set to NULL
          if (key === 'postin_date' || key === 'postout_date') {
            updateValues.push(null);
          } else {
            // For other fields, set to empty string
            updateValues.push('');
          }
        } else {
          // For date fields, ensure proper format
          if (key === 'postin_date' || key === 'postout_date') {
            // Parse and format date
            const date = new Date(updateData[key]);
            if (!isNaN(date.getTime())) {
              updateValues.push(date.toISOString().split('T')[0]);
            } else {
              updateValues.push(null);
            }
          } else {
            updateValues.push(updateData[key]);
          }
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateValues.push(pak);

    const query = `
      UPDATE manpower 
      SET ${updateFields.join(', ')} 
      WHERE PAK = ?
    `;

    console.log(`📝 Executing PAF UPDATE query: ${query}`);
    console.log(`📝 With values:`, updateValues);

    const [result] = await db.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update PAF employee data'
      });
    }

    console.log(`✅ PAF Employee data updated successfully. Affected rows: ${result.affectedRows}`);

    // Return updated employee data
    const [updatedEmployee] = await db.execute(
      `SELECT * FROM manpower WHERE PAK = ?`,
      [pak]
    );

    res.json({
      success: true,
      message: 'PAF Employee data updated successfully',
      affectedRows: result.affectedRows,
      employee: updatedEmployee[0]
    });

  } catch (error) {
    console.error('❌ Error updating PAF employee data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
      error: error.message
    });
  }
});


// Add this route if you want to keep /upload-picture endpoint
router.post('/:pak/upload-picture', upload.single('photo'), async (req, res) => {
  try {
    const { pak } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No picture file provided'
      });
    }

    console.log(`🖼️ Uploading picture via /upload-picture for PAK: ${pak}`);

    const imageBuffer = fs.readFileSync(req.file.path);

    const [result] = await db.execute(
      'UPDATE manpower SET PICTURE = ? WHERE PAK = ?',
      [imageBuffer, pak]
    );

    fs.unlinkSync(req.file.path);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log(`✅ Picture uploaded successfully for ${pak}`);

    res.json({
      success: true,
      message: 'Picture uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Error uploading picture:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading picture: ' + error.message
    });
  }
});


// Add this route for password updates
router.put('/:pak/update-password', async (req, res) => {
  try {
    const { pak } = req.params;
    const { password } = req.body;
    
    console.log(`🔑 Updating password for PAK: ${pak}`);

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Generate secure password hash (same as employee creation)
    const crypto = require('crypto');
    const iterations = 1000;
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.pbkdf2Sync(
      password,
      Buffer.from(salt, 'hex'),
      iterations,
      64,
      'sha1'
    );
    const hashedPassword = `${iterations}:${salt}:${derivedKey.toString('hex')}`;

    // Update password in database
    const [result] = await db.execute(
      'UPDATE manpower SET PASSWORD = ? WHERE PAK = ?',
      [hashedPassword, pak]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log(`✅ Password updated successfully for ${pak}`);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password: ' + error.message
    });
  }
});

// ================================================
// UPDATED MAIN ROUTE TO INCLUDE NEW ENDPOINTS
// ================================================

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PAF Employee API is working!',
    endpoints: {
      'GET /api/PAFemployee/:pak': 'Get PAF employee details by PAK',
      'PUT /api/PAFemployee/:pak': 'Update PAF employee details',
      'POST /api/PAFemployee/create': 'Create new PAF employee',
      'GET /api/PAFemployee/generate-pak': 'Generate next available PAK',
      'GET /api/PAFemployee/check-pak/:pak': 'Check if PAK exists',
      'GET /api/PAFemployee/list/current': 'Get current PAF employees',
      'GET /api/PAFemployee/list/ex': 'Get ex-PAF employees',
      // Picture endpoints
      'PUT /api/PAFemployee/:pak/picture': 'Update employee picture',
      'GET /api/PAFemployee/:pak/picture': 'Get employee picture',
      'DELETE /api/PAFemployee/:pak/picture': 'Delete employee picture',
      'GET /api/PAFemployee/:pak/has-picture': 'Check if employee has picture',
      // Attendance endpoints
      'GET /api/PAFemployee/attendance/view/:pak': 'View attendance for PAK',
      'GET /api/PAFemployee/attendance/summary/all': 'Get attendance summary',
      'GET /api/PAFemployee/attendance/months/:pak': 'Get available months',
      'POST /api/PAFemployee/attendance/add': 'Add/Update attendance record',
      // JCO/Airman endpoints
      'GET /api/PAFemployee/jco-airmen/all': 'Get all JCOs and Airmen',
      'GET /api/PAFemployee/jco-airmen/stats': 'Get JCO/Airman statistics',
      'GET /api/PAFemployee/jco-airmen/search': 'Search JCOs/Airmen',
      // Role management endpoints
      'GET /api/PAFemployee/list/assign-roles': 'Get employees for role assignment',
      'GET /api/PAFemployee/roles/:pak': 'Get user roles by PAK',
      'POST /api/PAFemployee/roles/assign': 'Assign/Update user roles',
      'GET /api/PAFemployee/roles/all': 'Get all role assignments',
      'PUT /api/PAFemployee/roles/update/:pak': 'Update existing role assignments'
    }
  });
});








module.exports = router;