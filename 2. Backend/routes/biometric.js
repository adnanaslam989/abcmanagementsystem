const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const dbModule = require('../config/db');

const router = express.Router();
const db = dbModule.pool;

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/biometric/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed (.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Import attendance from Excel file
router.post('/import-excel', upload.single('excelFile'), async (req, res) => {
  try {
    console.log('📥 Excel import request received');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an Excel file.'
      });
    }
    
    const { date, dateFormat = 'auto' } = req.body;
    
    console.log(`Processing Excel file: ${req.file.filename}`);
    console.log(`Target date: ${date}`);
    console.log(`Date format: ${dateFormat}`);
    
    // Parse Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with formatted strings
    const excelData = xlsx.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: ''
    });
    
    console.log(`Excel data rows: ${excelData.length}`);
    
    if (excelData.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      
      return res.json({
        success: true,
        message: 'Excel file is empty',
        attendanceData: [],
        totalRecordsInFile: 0,
        matchedCount: 0,
        targetDate: date,
        fileName: req.file.originalname
      });
    }
    
    // Log first few rows for debugging
    console.log('Sample data (first 2 rows):');
    excelData.slice(0, 2).forEach((row, idx) => {
      console.log(`Row ${idx + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: "${value}"`);
      });
    });
    
    // Process Excel data
    const attendanceData = processExcelData(excelData, date, dateFormat);
    
    console.log(`Processed ${attendanceData.length} attendance records`);
    
    // Match with employees
    const matchedData = await matchWithEmployees(attendanceData);
    
    // Clean up
    await fs.unlink(req.file.path).catch(error => {
      console.warn('Failed to delete temp file:', error.message);
    });
    
    // Get all dates found
    const allDatesInFile = [...new Set(attendanceData.map(record => record.date))];
    
    res.json({
      success: true,
      message: `Found ${attendanceData.length} records, matched ${matchedData.filter(m => m.matched).length}`,
      attendanceData: matchedData,
      totalRecordsInFile: attendanceData.length,
      matchedCount: matchedData.filter(m => m.matched).length,
      unmatchedCount: matchedData.filter(m => !m.matched).length,
      targetDate: date,
      allDatesInFile: allDatesInFile,
      fileName: req.file.originalname,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Excel import error:', error);
    
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process Excel file: ' + error.message
    });
  }
});


// Process Excel data - Universal function for both Add and Update forms
function processExcelData(jsonData, targetDate, dateFormat) {
  const attendanceData = [];
  
  if (!jsonData || jsonData.length === 0) {
    return attendanceData;
  }
  
  console.log(`Processing ${jsonData.length} rows with format: ${dateFormat}`);
  
  // Group records by employee ID and date
  const employeeRecords = {};
  
  jsonData.forEach((row, index) => {
    // Extract values (case-insensitive)
    const employeeId = extractValue(row, ['ID', 'Id', 'EmployeeID', 'EmployeeID', 'UserID', 'User ID']);
    const employeeName = extractValue(row, ['Name', 'name', 'EmployeeName', 'Employee Name', 'User', 'Username']);
    let dateTimeStr = extractValue(row, ['Date', 'date', 'DateTime', 'Date Time', 'Timestamp', 'Time']);
    
    // Clean the date string
    dateTimeStr = (dateTimeStr || '').toString().trim().replace(/\s+/g, ' ');
    
    console.log(`Row ${index + 1}: ID="${employeeId}", Name="${employeeName}", Date="${dateTimeStr}"`);
    
    // Skip if missing data
    if (!employeeId || !dateTimeStr) {
      console.log(`  Skipping: missing ID or Date`);
      return;
    }
    
    // Parse the date string
    let parsedDate;
    try {
      if (dateFormat === 'auto') {
        parsedDate = autoDetectAndParseDate(dateTimeStr);
      } else {
        parsedDate = parseDateWithFormat(dateTimeStr, dateFormat);
      }
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        console.log(`  Failed to parse date: "${dateTimeStr}"`);
        return;
      }
      
      console.log(`  ✅ Parsed successfully: ${parsedDate}`);
      
    } catch (error) {
      console.log(`  Date parsing error: ${error.message}`);
      return;
    }
    
    // Format date and time
    const recordDate = parsedDate.toISOString().split('T')[0];
    const recordTime = parsedDate.toTimeString().split(' ')[0];
    
    console.log(`  Extracted: Date=${recordDate}, Time=${recordTime}`);
    
    // Filter by target date if provided
    if (targetDate && recordDate !== targetDate) {
      console.log(`  Skipping: Date doesn't match target`);
      return;
    }
    
    // Create key for employee + date
    const recordKey = `${employeeId}|${recordDate}`;
    
    // Initialize if not exists
    if (!employeeRecords[recordKey]) {
      employeeRecords[recordKey] = {
        employeeId,
        employeeName,
        date: recordDate,
        timeIn: null,
        timeOut: null,
        entries: []
      };
    }
    
    // Add time entry
    employeeRecords[recordKey].entries.push({
      time: recordTime,
      rawString: dateTimeStr,
      parsedDate: parsedDate,
      timestamp: parsedDate.getTime() // For easier sorting
    });
  });
  
  console.log(`Grouped into ${Object.keys(employeeRecords).length} employee-date combinations`);
  
  // Process each employee's records
  Object.values(employeeRecords).forEach(record => {
    if (record.entries.length === 0) return;
    
    // Sort by time (earliest first)
    record.entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Get min and max times
    const times = record.entries.map(entry => entry.time);
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    
    console.log(`Employee ${record.employeeId}: Total entries=${record.entries.length}, Times=[${times.join(', ')}]`);
    
    // UNIVERSAL LOGIC FOR BOTH FORMS:
    // 1 entry → timeIn only (minTime), timeOut remains empty
    // 2+ entries → first (min) = timeIn, last (max) = timeOut
    record.timeIn = minTime; // Always set timeIn (earliest entry)
    record.timeOut = record.entries.length >= 2 ? maxTime : ''; // Only set timeOut for 2+ entries
    
    console.log(`  Time In=${record.timeIn}, Time Out=${record.timeOut || '(empty for single entry)'}`);
    
    attendanceData.push({
      userID: record.employeeId,
      userName: record.employeeName,
      date: record.date,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      totalEntries: record.entries.length,
      entries: record.entries,
      source: 'Excel Import'
    });
  });
  
  return attendanceData;
}
// Extract value from row (case-insensitive)
function extractValue(row, possibleKeys) {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

// Auto-detect and parse date
function autoDetectAndParseDate(dateStr) {
  console.log(`🔍 Auto-detecting format for: "${dateStr}"`);
  
  // List of all possible date patterns in order of priority
  const datePatterns = [
    // With time (hh:mm:ss)
    { 
      pattern: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})$/,
      name: 'yyyy/mm/dd hh:mm:ss or yyyy-mm-dd hh:mm:ss',
      parser: (match) => new Date(
        parseInt(match[1]), 
        parseInt(match[2]) - 1, 
        parseInt(match[3]), 
        parseInt(match[4]), 
        parseInt(match[5]), 
        parseInt(match[6])
      )
    },
    
    // With time (hh:mm)
    { 
      pattern: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2}) (\d{1,2}):(\d{2})$/,
      name: 'yyyy/mm/dd hh:mm or yyyy-mm-dd hh:mm',
      parser: (match) => new Date(
        parseInt(match[1]), 
        parseInt(match[2]) - 1, 
        parseInt(match[3]), 
        parseInt(match[4]), 
        parseInt(match[5]), 
        0
      )
    },
    
    // dd/mm/yyyy hh:mm:ss
    { 
      pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/,
      name: 'dd/mm/yyyy hh:mm:ss or dd-mm-yyyy hh:mm:ss',
      parser: (match) => new Date(
        parseInt(match[3]), 
        parseInt(match[2]) - 1, 
        parseInt(match[1]), 
        parseInt(match[4]), 
        parseInt(match[5]), 
        parseInt(match[6])
      )
    },
    
    // dd/mm/yyyy hh:mm
    { 
      pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}) (\d{1,2}):(\d{2})$/,
      name: 'dd/mm/yyyy hh:mm or dd-mm-yyyy hh:mm',
      parser: (match) => new Date(
        parseInt(match[3]), 
        parseInt(match[2]) - 1, 
        parseInt(match[1]), 
        parseInt(match[4]), 
        parseInt(match[5]), 
        0
      )
    },
    
    // mm/dd/yyyy hh:mm:ss
    { 
      pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/,
      name: 'mm/dd/yyyy hh:mm:ss or mm-dd-yyyy hh:mm:ss',
      parser: (match) => new Date(
        parseInt(match[3]), 
        parseInt(match[1]) - 1, 
        parseInt(match[2]), 
        parseInt(match[4]), 
        parseInt(match[5]), 
        parseInt(match[6])
      )
    },
    
    // ISO format (with T)
    { 
      pattern: /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})T(\d{2}):(\d{2}):(\d{2})/,
      name: 'ISO format',
      parser: (match) => new Date(
        parseInt(match[1]), 
        parseInt(match[2]) - 1, 
        parseInt(match[3]), 
        parseInt(match[4]), 
        parseInt(match[5]), 
        parseInt(match[6])
      )
    },
    
    // Just date yyyy/mm/dd or yyyy-mm-dd
    { 
      pattern: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
      name: 'yyyy/mm/dd or yyyy-mm-dd',
      parser: (match) => new Date(
        parseInt(match[1]), 
        parseInt(match[2]) - 1, 
        parseInt(match[3]), 
        0, 0, 0
      )
    },
    
    // Just date dd/mm/yyyy or dd-mm-yyyy
    { 
      pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      name: 'dd/mm/yyyy or dd-mm-yyyy',
      parser: (match) => new Date(
        parseInt(match[3]), 
        parseInt(match[2]) - 1, 
        parseInt(match[1]), 
        0, 0, 0
      )
    },
    
    // Just date mm/dd/yyyy or mm-dd-yyyy
    { 
      pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      name: 'mm/dd/yyyy or mm-dd-yyyy',
      parser: (match) => new Date(
        parseInt(match[3]), 
        parseInt(match[1]) - 1, 
        parseInt(match[2]), 
        0, 0, 0
      )
    },
    
    // Excel serial date (number)
    { 
      pattern: /^\d+\.?\d*$/,
      name: 'Excel serial number',
      parser: (match) => {
        const excelSerial = parseFloat(match[0]);
        // Convert Excel serial to JS Date
        const excelEpoch = new Date(1899, 11, 30);
        const msPerDay = 24 * 60 * 60 * 1000;
        
        let jsDate;
        if (excelSerial >= 60) {
          jsDate = new Date(excelEpoch.getTime() + (excelSerial - 1) * msPerDay);
        } else {
          jsDate = new Date(excelEpoch.getTime() + excelSerial * msPerDay);
        }
        
        return jsDate;
      }
    }
  ];
  
  // Try each pattern
  for (const patternInfo of datePatterns) {
    const match = dateStr.match(patternInfo.pattern);
    if (match) {
      console.log(`  ✅ Matched pattern: ${patternInfo.name}`);
      try {
        const result = patternInfo.parser(match);
        if (result && !isNaN(result.getTime())) {
          return result;
        }
      } catch (error) {
        console.log(`  Pattern matched but parsing failed: ${error.message}`);
      }
    }
  }
  
  // Last resort: try JavaScript Date constructor
  console.log(`  Trying Date constructor as last resort`);
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  console.log(`  ❌ All parsing attempts failed`);
  return null;
}

// Parse date with specific format
function parseDateWithFormat(dateStr, format) {
  console.log(`Parsing with format: ${format}`);
  
  const formatPatterns = {
    'yyyy-mm-dd hh:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
    'yyyy/mm/dd hh:mm:ss': /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
    'dd-mm-yyyy hh:mm:ss': /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
    'dd/mm/yyyy hh:mm:ss': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
    'mm/dd/yyyy hh:mm:ss': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
    'yyyy-mm-dd hh:mm': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/,
    'yyyy/mm/dd hh:mm': /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/,
    'dd-mm-yyyy hh:mm': /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/,
    'dd/mm/yyyy hh:mm': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/,
    'mm/dd/yyyy hh:mm': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/
  };
  
  const pattern = formatPatterns[format];
  if (!pattern) {
    console.log(`Format "${format}" not found, trying auto-detect`);
    return autoDetectAndParseDate(dateStr);
  }
  
  const match = dateStr.match(pattern);
  if (!match) {
    console.log(`String doesn't match format "${format}", trying auto-detect`);
    return autoDetectAndParseDate(dateStr);
  }
  
  // Extract components
  let year, month, day, hours = 0, minutes = 0, seconds = 0;
  
  if (format.startsWith('yyyy-mm-dd') || format.startsWith('yyyy/mm/dd')) {
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10) - 1;
    day = parseInt(match[3], 10);
    hours = parseInt(match[4], 10);
    minutes = parseInt(match[5], 10);
    if (match[6]) seconds = parseInt(match[6], 10);
  } else if (format.startsWith('dd-mm-yyyy') || format.startsWith('dd/mm/yyyy')) {
    day = parseInt(match[1], 10);
    month = parseInt(match[2], 10) - 1;
    year = parseInt(match[3], 10);
    hours = parseInt(match[4], 10);
    minutes = parseInt(match[5], 10);
    if (match[6]) seconds = parseInt(match[6], 10);
  } else if (format.startsWith('mm/dd/yyyy')) {
    month = parseInt(match[1], 10) - 1;
    day = parseInt(match[2], 10);
    year = parseInt(match[3], 10);
    hours = parseInt(match[4], 10);
    minutes = parseInt(match[5], 10);
    if (match[6]) seconds = parseInt(match[6], 10);
  }
  
  return new Date(year, month, day, hours, minutes, seconds);
}

// Match biometric records with employees
async function matchWithEmployees(biometricRecords) {
  const matchedData = [];
  
  if (!biometricRecords || biometricRecords.length === 0) {
    console.log('No biometric records to match');
    return matchedData;
  }
  
  console.log(`Matching ${biometricRecords.length} biometric records with database`);
  
  try {
    // Get all employees from database
    const [employees] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME FROM civ_manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())`,
      []
    );
    
    console.log(`Found ${employees.length} employees in database`);
    
    if (employees.length === 0) {
      console.log('No employees found in database');
      biometricRecords.forEach(bioRecord => {
        matchedData.push({
          ...bioRecord,
          matched: false,
          matchedPAK: null,
          matchedName: null,
          matchMethod: 'No employees in database',
          status: 'Unmatched'
        });
      });
      return matchedData;
    }
    
    // Create mapping of numeric PAK to employee
    const numericPakMap = {};
    employees.forEach(emp => {
      if (emp.PAK) {
        // Extract numeric part (e.g., O-1210710 -> 1210710)
        const numericPart = emp.PAK.replace(/[^0-9]/g, '');
        if (numericPart) {
          numericPakMap[numericPart] = {
            pak: emp.PAK,
            name: emp.EMPLOYEE_NAME
          };
        }
        
        // Also try without O- prefix
        const cleanPak = emp.PAK.replace(/^[A-Z]-/, '');
        if (cleanPak && cleanPak !== emp.PAK) {
          numericPakMap[cleanPak] = {
            pak: emp.PAK,
            name: emp.EMPLOYEE_NAME
          };
        }
      }
    });
    
    console.log(`Created PAK map with ${Object.keys(numericPakMap).length} entries`);
    
    // Match records
    biometricRecords.forEach(bioRecord => {
      console.log(`\nMatching: ID="${bioRecord.userID}", Name="${bioRecord.userName}"`);
      
      let matchedEmployee = null;
      let matchMethod = '';
      
      // Clean biometric ID - remove non-numeric
      const bioNumericId = bioRecord.userID.replace(/[^0-9]/g, '');
      console.log(`  Numeric ID: "${bioNumericId}"`);
      
      // Try numeric match first
      if (bioNumericId && numericPakMap[bioNumericId]) {
        matchedEmployee = numericPakMap[bioNumericId];
        matchMethod = `Numeric ID match: ${bioRecord.userID} → ${matchedEmployee.pak}`;
        console.log(`  ✓ ${matchMethod}`);
      } else {
        console.log(`  ✗ No numeric match for "${bioNumericId}"`);
        
        // Try name match as fallback
        if (bioRecord.userName) {
          const cleanBioName = bioRecord.userName.toLowerCase().trim();
          
          const matched = employees.find(emp => {
            if (!emp.EMPLOYEE_NAME) return false;
            const dbName = emp.EMPLOYEE_NAME.toLowerCase().trim();
            return dbName === cleanBioName || 
                   dbName.includes(cleanBioName) || 
                   cleanBioName.includes(dbName);
          });
          
          if (matched) {
            matchedEmployee = {
              pak: matched.PAK,
              name: matched.EMPLOYEE_NAME
            };
            matchMethod = `Name match: ${bioRecord.userName} → ${matched.EMPLOYEE_NAME}`;
            console.log(`  ✓ ${matchMethod}`);
          }
        }
      }
      
      if (matchedEmployee) {
        matchedData.push({
          ...bioRecord,
          matched: true,
          matchedPAK: matchedEmployee.pak,
          matchedName: matchedEmployee.name,
          matchMethod: matchMethod,
          status: 'Matched'
        });
      } else {
        matchedData.push({
          ...bioRecord,
          matched: false,
          matchedPAK: null,
          matchedName: null,
          matchMethod: 'No match found',
          status: 'Unmatched'
        });
      }
    });
    
    const matchedCount = matchedData.filter(m => m.matched).length;
    console.log(`\n📊 Matching complete: ${matchedCount}/${matchedData.length} records matched`);
    
  } catch (error) {
    console.error('Error matching employees:', error);
    
    biometricRecords.forEach(bioRecord => {
      matchedData.push({
        ...bioRecord,
        matched: false,
        matchedPAK: null,
        matchedName: null,
        matchMethod: `Error: ${error.message}`,
        status: 'Error'
      });
    });
  }
  
  return matchedData;
}

// Get import statistics
router.get('/import-stats', async (req, res) => {
  try {
    const [stats] = await db.execute(
      `SELECT 
        COUNT(*) as total_imports,
        SUM(total_records) as total_records,
        SUM(matched_records) as total_matched,
        MAX(import_date) as last_import_date
       FROM biometric_import_log`
    );
    
    res.json({
      success: true,
      stats: stats[0] || { total_imports: 0, total_records: 0, total_matched: 0 }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Log import activity
async function logImportActivity(fileName, totalRecords, matchedRecords, date) {
  try {
    await db.execute(
      `INSERT INTO biometric_import_log 
       (file_name, total_records, matched_records, import_date, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [fileName, totalRecords, matchedRecords, date]
    );
  } catch (error) {
    console.error('Error logging import:', error);
  }
}

// Debug endpoint
router.post('/debug-excel', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file' });
    }
    
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get string data
    const stringData = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    
    // Clean up
    await fs.unlink(req.file.path).catch(() => {});
    
    res.json({
      success: true,
      fileName: req.file.originalname,
      totalRows: stringData.length,
      sampleData: stringData.slice(0, 5),
      columns: stringData.length > 0 ? Object.keys(stringData[0]) : [],
      firstDateValue: stringData.length > 0 ? stringData[0].Date || stringData[0].date : null
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;