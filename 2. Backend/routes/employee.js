// routes/employee.js
const express = require('express');
const dbModule = require('../config/db');
const router = express.Router();

const db = dbModule.pool;

// Test route for employee API
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Employee API is working!',
    endpoints: {
      'GET /api/employee/current-employees': 'Get current civilian employees',
      'GET /api/employee/ex-employees': 'Get ex-civilian employees',
      'GET /api/employee/:pak': 'Get employee details by PAK',
      'PUT /api/employee/:pak': 'Update employee details',
      'GET /api/employee/employee/:pak/photo': 'Get employee photo',
      // Attendance endpoints
      'GET /api/employee/attendance/check-date': 'Check if attendance date exists',
      'GET /api/employee/attendance/date/:date': 'Get attendance by date',
      'POST /api/employee/attendance/add': 'Add new attendance',
      'PUT /api/employee/attendance/update/:date': 'Update attendance',
      'GET /api/employee/attendance/summary': 'Get attendance summary',
      'GET /api/employee/attendance/employee/:pak': 'Get employee attendance history'
    }
  });
});

// Add this test route at the beginning of employee.js
router.get('/test', (req, res) => {
  console.log('✅ Test endpoint called successfully');
  res.json({
    success: true,
    message: 'Employee API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      biometric: '/api/employee/biometric/fetch',
      config: '/api/employee/biometric/config'
    }
  });
});

// Also add a simpler biometric test endpoint
router.get('/biometric/test-simple', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Biometric endpoint is accessible',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint error'
    });
  }
});

// SIMPLE BIOMETRIC FETCH ENDPOINT (for testing)
router.post('/biometric/fetch-simple', async (req, res) => {
  try {
    const { date } = req.body;

    console.log(`📡 Simple biometric fetch for date: ${date}`);

    // For now, return simulated data
    const simulatedData = [
      {
        userID: 'CIV-001',
        userName: 'John Doe',
        date: date,
        timeIn: '08:45:00',
        timeOut: '17:15:00',
        source: 'Simulation'
      },
      {
        userID: 'CIV-002',
        userName: 'Jane Smith',
        date: date,
        timeIn: '09:15:00',
        timeOut: '17:30:00',
        source: 'Simulation'
      },
      {
        userID: 'CIV-003',
        userName: 'Bob Johnson',
        date: date,
        timeIn: '08:30:00',
        timeOut: '17:00:00',
        source: 'Simulation'
      }
    ];

    res.json({
      success: true,
      attendanceData: simulatedData,
      totalRecords: simulatedData.length,
      date: date,
      note: 'This is simulated data for testing'
    });

  } catch (error) {
    console.error('Simple fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// ================================================
// ATTENDANCE MANAGEMENT ROUTES (FIXED)
// ================================================

// Check if attendance date already exists
router.get('/attendance/check-date', async (req, res) => {
  try {
    const { date } = req.query;

    console.log(`📅 Checking attendance date: ${date}`);

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const [results] = await db.execute(
      `SELECT COUNT(*) as count FROM civ_attendence WHERE ATTENDENCE_DATE = ?`,
      [date]
    );

    const exists = results[0].count > 0;

    console.log(`✅ Date ${date} exists: ${exists}, count: ${results[0].count}`);

    res.json({
      success: true,
      exists: exists,
      count: results[0].count
    });

  } catch (error) {
    console.error('❌ Error checking attendance date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get attendance record by date
router.get('/attendance/date/:date', async (req, res) => {
  try {
    const { date } = req.params;

    console.log(`📅 Fetching attendance for date: ${date}`);

    const [attendance] = await db.execute(
      `SELECT 
        a.ATTENDENCE_ID,
        a.ATTENDENCE_DATE,
        a.PAK,
        a.STATUS,
        DATE_FORMAT(a.TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(a.TIME_OUT, '%H:%i') as time_out,
        a.MISSED_HOURS,
        a.REMARKS,
        m.EMPLOYEE_NAME,
        m.APPOINTMENT
       FROM civ_attendence a
       LEFT JOIN civ_manpower m ON a.PAK = m.PAK
       WHERE a.ATTENDENCE_DATE = ?
       ORDER BY m.EMPLOYEE_NAME`,
      [date]
    );

    console.log(`✅ Found ${attendance.length} attendance records for ${date}`);

    res.json({
      success: true,
      attendance: attendance
    });

  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add new attendance record (FIXED - removed transaction)
router.post('/attendance/add', async (req, res) => {
  let connection;
  try {
    const { attendance_date, employees } = req.body;

    console.log(`📝 Adding attendance for date: ${attendance_date}`);
    console.log(`👥 Employees count: ${employees ? employees.length : 0}`);

    if (!attendance_date || !employees || !Array.isArray(employees)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format'
      });
    }

    // Get a connection for transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // First, check if attendance already exists for this date
      const [existing] = await connection.execute(
        `SELECT ATTENDENCE_ID FROM civ_attendence WHERE ATTENDENCE_DATE = ? LIMIT 1`,
        [attendance_date]
      );

      if (existing.length > 0) {
        await connection.rollback();
        await connection.release();
        return res.status(400).json({
          success: false,
          message: 'Attendance for this date already exists'
        });
      }

      // Calculate total strength (number of employees)
      const totalStrength = employees.length;

      // Generate ATTENDENCE_ID (using current timestamp)
      const attendenceId = Date.now();

      let insertedCount = 0;
      let errors = [];

      // Insert each employee's attendance
      for (const emp of employees) {
        if (!emp.pak || !emp.status) {
          console.warn(`⚠️ Skipping employee - missing PAK or status:`, emp);
          continue;
        }

        // Calculate missed hours if time_in is provided
        let missedHours = 0;
        let timeInDatetime = null;

        if (emp.time_in && (emp.status === 'Present' || emp.status === 'Late')) {
          // Convert time string to datetime
          timeInDatetime = `${attendance_date} ${emp.time_in}:00`;

          // Simple missed hours calculation (if after 09:00)
         // const [hours, minutes] = emp.time_in.split(':').map(Number);
         // const defaultTimeIn = 9 * 60; // 09:00 in minutes
          //const actualTimeIn = hours * 60 + minutes;

         // if (actualTimeIn > defaultTimeIn) {
         //   missedHours = ((actualTimeIn - defaultTimeIn) / 60).toFixed(2);
         // }




        }

        // Handle Absent/Leave statuses
        if (emp.status === 'Absent') {
          missedHours = -8; // Default 8 hours missed for absent
          timeInDatetime = null;
        }
         // Handle Absent/Leave statuses
        if (emp.status === 'Leave') {
          missedHours = 0.00; 
          timeInDatetime = null;
        }

        const query = `
          INSERT INTO civ_attendence (
            ATTENDENCE_ID,
            ATTENDENCE_DATE,
            TOTAL_STR,
            PAK,
            STATUS,
            TIME_IN,
            TIME_OUT,
            MISSED_HOURS,
            REMARKS
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `;

        const values = [
          attendenceId,
          attendance_date,
          totalStrength,
          emp.pak,
          emp.status,
          timeInDatetime,
          missedHours,
          emp.remarks || ''
        ];

        try {
          await connection.execute(query, values);
          insertedCount++;
        } catch (insertError) {
          console.error(`❌ Error inserting attendance for ${emp.pak}:`, insertError);
          errors.push({ pak: emp.pak, error: insertError.message });
        }
      }

      if (errors.length > 0) {
        await connection.rollback();
        await connection.release();
        return res.status(400).json({
          success: false,
          message: `Failed to insert some records`,
          errors: errors,
          insertedCount: insertedCount
        });
      }

      // Commit transaction
      await connection.commit();
      await connection.release();

      console.log(`✅ Attendance added successfully. Inserted ${insertedCount} records`);

      res.json({
        success: true,
        message: `Attendance saved successfully for ${attendance_date}`,
        insertedCount: insertedCount,
        totalStrength: totalStrength
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error adding attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Update attendance record (FIXED - removed transaction)
router.put('/attendance/update/:date', async (req, res) => {
  let connection;
  try {
    const { date } = req.params;
    const { employees } = req.body;

    console.log(`🔄 Updating attendance for date: ${date}`);

    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format'
      });
    }

    // Get a connection for transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      let updatedCount = 0;
      let errors = [];

      for (const emp of employees) {
        if (!emp.pak) continue;

        // Calculate missed hours if time_in is provided
        let missedHours = 0;
        let timeInDatetime = null;

        if (emp.time_in && (emp.status === 'Present' || emp.status === 'Late')) {
          timeInDatetime = `${date} ${emp.time_in}:00`;

          const [hours, minutes] = emp.time_in.split(':').map(Number);
          const defaultTimeIn = 9 * 60;
          const actualTimeIn = hours * 60 + minutes;

          if (actualTimeIn > defaultTimeIn) {
            missedHours = ((actualTimeIn - defaultTimeIn) / 60).toFixed(2);
          }
        }

        // Handle Absent/Leave statuses
        if (emp.status === 'Absent') {
          missedHours = -8; // Default 8 hours missed for absent/leave
          timeInDatetime = null;
        }
        if (emp.status === 'Leave') {
          missedHours = 0.0; // Default 8 hours missed for absent/leave
          timeInDatetime = null;
        }

        const query = `
          UPDATE civ_attendence 
          SET STATUS = ?,
              TIME_IN = ?,
              MISSED_HOURS = ?,
              REMARKS = ?
          WHERE ATTENDENCE_DATE = ? AND PAK = ?
        `;

        try {
          const [result] = await connection.execute(query, [
            emp.status,
            timeInDatetime,
            missedHours,
            emp.remarks || '',
            date,
            emp.pak
          ]);

          if (result.affectedRows > 0) {
            updatedCount++;
          } else {
            // If no record exists, insert a new one
            const insertQuery = `
              INSERT INTO civ_attendence (
                ATTENDENCE_ID,
                ATTENDENCE_DATE,
                TOTAL_STR,
                PAK,
                STATUS,
                TIME_IN,
                TIME_OUT,
                MISSED_HOURS,
                REMARKS
              ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
            `;

            const totalStrength = employees.length;
            await connection.execute(insertQuery, [
              Date.now(),
              date,
              totalStrength,
              emp.pak,
              emp.status,
              timeInDatetime,
              missedHours,
              emp.remarks || ''
            ]);
            updatedCount++;
          }
        } catch (updateError) {
          console.error(`❌ Error updating attendance for ${emp.pak}:`, updateError);
          errors.push({ pak: emp.pak, error: updateError.message });
        }
      }

      if (errors.length > 0) {
        await connection.rollback();
        await connection.release();
        return res.status(400).json({
          success: false,
          message: `Failed to update some records`,
          errors: errors,
          updatedCount: updatedCount
        });
      }

      await connection.commit();
      await connection.release();

      console.log(`✅ Attendance updated successfully. Updated ${updatedCount} records`);

      res.json({
        success: true,
        message: `Attendance updated successfully`,
        updatedCount: updatedCount
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get attendance summary by date range
router.get('/attendance/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    console.log(`📊 Fetching attendance summary from ${start_date} to ${end_date}`);

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const [summary] = await db.execute(
      `SELECT 
        ATTENDENCE_DATE,
        COUNT(*) as total_employees,
        COUNT(CASE WHEN STATUS = 'Present' THEN 1 END) as present,
        COUNT(CASE WHEN STATUS = 'Absent' THEN 1 END) as absent,
        COUNT(CASE WHEN STATUS = 'Late' THEN 1 END) as late,
        COUNT(CASE WHEN STATUS = 'Leave' THEN 1 END) as leave,
        COUNT(CASE WHEN STATUS = 'Half Day' THEN 1 END) as half_day
       FROM civ_attendence
       WHERE ATTENDENCE_DATE BETWEEN ? AND ?
       GROUP BY ATTENDENCE_DATE
       ORDER BY ATTENDENCE_DATE DESC`,
      [start_date, end_date]
    );

    res.json({
      success: true,
      summary: summary,
      period: { start_date, end_date }
    });

  } catch (error) {
    console.error('❌ Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employee attendance history
router.get('/attendance/employee/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    const { month, year } = req.query;

    console.log(`📅 Fetching attendance history for PAK: ${pak}`);

    let query = `
      SELECT 
        ATTENDENCE_DATE,
        STATUS,
        DATE_FORMAT(TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as time_out,
        MISSED_HOURS,
        REMARKS
      FROM civ_attendence
      WHERE PAK = ?
    `;

    const params = [pak];

    if (month && year) {
      query += ` AND MONTH(ATTENDENCE_DATE) = ? AND YEAR(ATTENDENCE_DATE) = ?`;
      params.push(month, year);
    }

    query += ` ORDER BY ATTENDENCE_DATE DESC`;

    const [attendance] = await db.execute(query, params);

    res.json({
      success: true,
      pak: pak,
      attendance: attendance,
      totalRecords: attendance.length
    });

  } catch (error) {
    console.error('❌ Error fetching employee attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ================================================
// WORKING HOURS MANAGEMENT ROUTES
// ================================================

// Get current working hours
router.get('/working-hours', async (req, res) => {
  try {
    console.log('🔍 GET /working-hours called');

    // Query to get the latest time record
    const [timeRecords] = await db.execute(
      `SELECT 
        TIME_IN,
        TIME_OUT,
        DATE_FORMAT(TIME_IN, '%H:%i') as formatted_time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as formatted_time_out
       FROM time 
       ORDER BY TIME_IN DESC 
       LIMIT 1`
    );

    console.log('Database query result:', timeRecords);

    if (timeRecords.length === 0) {
      console.log('⚠️ No time records found in database, using defaults');
      return res.json({
        success: true,
        time_in: '09:00',
        time_out: '17:00',
        found_in_db: false,
        message: 'Using default working hours'
      });
    }

    const record = timeRecords[0];
    console.log(`✅ Found time record: ${record.formatted_time_in} - ${record.formatted_time_out}`);

    res.json({
      success: true,
      time_in: record.formatted_time_in || '09:00',
      time_out: record.formatted_time_out || '17:00',
      original_time_in: record.TIME_IN,
      original_time_out: record.TIME_OUT,
      found_in_db: true,
      message: 'Working hours loaded successfully'
    });

  } catch (error) {
    console.error('❌ Error in /working-hours:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      time_in: '09:00',
      time_out: '17:00',
      error: error.message
    });
  }
});

// Update working hours
router.post('/working-hours/update', async (req, res) => {
  let connection;
  try {
    const { time_in, time_out } = req.body;

    console.log(`🔄 POST /working-hours/update called with: ${time_in} - ${time_out}`);

    if (!time_in || !time_out) {
      return res.status(400).json({
        success: false,
        message: 'Both time_in and time_out are required'
      });
    }

    // Validate time format (24-hour format)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time_in) || !timeRegex.test(time_out)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use 24-hour format (HH:MM)'
      });
    }

    // Validate time logic
    const [inHours, inMinutes] = time_in.split(':').map(Number);
    const [outHours, outMinutes] = time_out.split(':').map(Number);

    // Validate hour range
    if (inHours > 23 || outHours > 23) {
      return res.status(400).json({
        success: false,
        message: 'Hour must be between 00-23'
      });
    }

    // Validate minute range
    if (inMinutes > 59 || outMinutes > 59) {
      return res.status(400).json({
        success: false,
        message: 'Minute must be between 00-59'
      });
    }

    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;

    if (totalOutMinutes <= totalInMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Time-out must be after time-in'
      });
    }

    const workingMinutes = totalOutMinutes - totalInMinutes;
    if (workingMinutes < 60) {
      return res.status(400).json({
        success: false,
        message: 'Minimum working hours should be at least 1 hour'
      });
    }

    if (workingMinutes > 12 * 60) {
      return res.status(400).json({
        success: false,
        message: 'Maximum working hours cannot exceed 12 hours'
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // First, check if there's an existing record
      const [existingRecords] = await connection.execute(
        `SELECT COUNT(*) as count FROM time`
      );

      // Use today's date for the datetime fields
      const today = new Date().toISOString().split('T')[0];
      const timeInDatetime = `${today} ${time_in}:00`;
      const timeOutDatetime = `${today} ${time_out}:00`;

      console.log(`Inserting/Updating with: ${timeInDatetime} - ${timeOutDatetime}`);

      let result;

      if (existingRecords[0].count === 0) {
        // Insert new record
        const query = `INSERT INTO time (TIME_IN, TIME_OUT) VALUES (?, ?)`;
        [result] = await connection.execute(query, [timeInDatetime, timeOutDatetime]);
        console.log('✅ Inserted new time record');
      } else {
        // Update the most recent record
        const query = `UPDATE time SET TIME_IN = ?, TIME_OUT = ? ORDER BY TIME_IN DESC LIMIT 1`;
        [result] = await connection.execute(query, [timeInDatetime, timeOutDatetime]);
        console.log('✅ Updated existing time record');
      }

      await connection.commit();
      await connection.release();

      console.log(`✅ Working hours updated. Affected rows: ${result.affectedRows}`);

      // Get the updated working hours to return
      const [updatedRecords] = await db.execute(
        `SELECT 
          DATE_FORMAT(TIME_IN, '%H:%i') as time_in,
          DATE_FORMAT(TIME_OUT, '%H:%i') as time_out
         FROM time 
         ORDER BY TIME_IN DESC 
         LIMIT 1`
      );

      const updatedRecord = updatedRecords[0];
      const updatedWorkingMinutes = totalOutMinutes - totalInMinutes;
      const updatedHours = Math.floor(updatedWorkingMinutes / 60);
      const updatedMinutes = updatedWorkingMinutes % 60;

      res.json({
        success: true,
        message: 'Working hours updated successfully',
        time_in: updatedRecord.time_in,
        time_out: updatedRecord.time_out,
        duration: `${updatedHours} hours ${updatedMinutes} minutes`,
        affectedRows: result.affectedRows,
        found_in_db: true
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      console.error('❌ Database error in update:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ Error in /working-hours/update:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get working hours history
router.get('/working-hours/history', async (req, res) => {
  try {
    console.log('📜 GET /working-hours/history called');

    const [history] = await db.execute(
      `SELECT 
        TIME_IN,
        TIME_OUT,
        DATE_FORMAT(TIME_IN, '%Y-%m-%d %H:%i') as formatted_time_in,
        DATE_FORMAT(TIME_OUT, '%Y-%m-%d %H:%i') as formatted_time_out,
        DATE_FORMAT(TIME_IN, '%Y-%m-%d') as date_only,
        TIME_FORMAT(TIME_IN, '%H:%i') as time_only_in,
        TIME_FORMAT(TIME_OUT, '%H:%i') as time_only_out,
        TIMESTAMPDIFF(MINUTE, TIME_IN, TIME_OUT) as duration_minutes
       FROM time 
       ORDER BY TIME_IN DESC`
    );

    console.log(`Found ${history.length} historical records`);

    const formattedHistory = history.map((record, index) => {
      const hours = Math.floor(record.duration_minutes / 60);
      const minutes = record.duration_minutes % 60;

      return {
        id: index + 1,
        time_in: record.formatted_time_in,
        time_out: record.formatted_time_out,
        date_updated: record.date_only,
        time_in_only: record.time_only_in,
        time_out_only: record.time_only_out,
        duration_minutes: record.duration_minutes,
        duration: `${hours} hours ${minutes} minutes`
      };
    });

    res.json({
      success: true,
      history: formattedHistory,
      count: formattedHistory.length,
      message: `Found ${formattedHistory.length} historical records`
    });

  } catch (error) {
    console.error('❌ Error in /working-hours/history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset to default working hours
router.post('/working-hours/reset', async (req, res) => {
  let connection;
  try {
    console.log('🔁 POST /working-hours/reset called');

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Default times
      const defaultTimeIn = '09:00';
      const defaultTimeOut = '17:00';
      const today = new Date().toISOString().split('T')[0];
      const timeInDatetime = `${today} ${defaultTimeIn}:00`;
      const timeOutDatetime = `${today} ${defaultTimeOut}:00`;

      // Check if there's an existing record
      const [existingRecords] = await connection.execute(
        `SELECT COUNT(*) as count FROM time`
      );

      let result;

      if (existingRecords[0].count === 0) {
        // Insert new record
        const query = `INSERT INTO time (TIME_IN, TIME_OUT) VALUES (?, ?)`;
        [result] = await connection.execute(query, [timeInDatetime, timeOutDatetime]);
        console.log('✅ Inserted default time record');
      } else {
        // Update existing record
        const query = `UPDATE time SET TIME_IN = ?, TIME_OUT = ? ORDER BY TIME_IN DESC LIMIT 1`;
        [result] = await connection.execute(query, [timeInDatetime, timeOutDatetime]);
        console.log('✅ Updated to default time record');
      }

      await connection.commit();
      await connection.release();

      console.log(`✅ Working hours reset. Affected rows: ${result.affectedRows}`);

      const workingMinutes = (17 * 60) - (8 * 60); // 9 hours
      const hours = Math.floor(workingMinutes / 60);
      const minutes = workingMinutes % 60;

      res.json({
        success: true,
        message: 'Working hours reset to default successfully',
        time_in: defaultTimeIn,
        time_out: defaultTimeOut,
        duration: `${hours} hours ${minutes} minutes`,
        affectedRows: result.affectedRows
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error in /working-hours/reset:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Debug endpoint to see raw time table data
router.get('/working-hours/debug', async (req, res) => {
  try {
    console.log('🐛 GET /working-hours/debug called');

    const [rawData] = await db.execute(
      `SELECT 
        TIME_IN,
        TIME_OUT,
        DATE(TIME_IN) as date_part,
        TIME(TIME_IN) as time_part_in,
        TIME(TIME_OUT) as time_part_out,
        DATE_FORMAT(TIME_IN, '%H:%i') as formatted_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as formatted_out
       FROM time 
       ORDER BY TIME_IN DESC`
    );

    console.log('Raw time table data:', rawData);

    res.json({
      success: true,
      raw_data: rawData,
      count: rawData.length,
      message: `Found ${rawData.length} records in time table`
    });

  } catch (error) {
    console.error('❌ Error in /working-hours/debug:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});



// ================================================
// EXISTING EMPLOYEE ROUTES (Keep all existing code below)
// ================================================

// Upload civilian employee photo
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/:pak/photo', upload.single('photo'), async (req, res) => {
  try {
    const { pak } = req.params;

    console.log(`🖼️ Uploading photo for civilian employee PAK: ${pak}`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded or file too large'
      });
    }

    const photoBuffer = req.file.buffer;

    // Check if employee exists
    const [existing] = await db.execute(
      'SELECT PAK FROM civ_manpower WHERE PAK = ?',
      [pak]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update photo in database
    const [result] = await db.execute(
      `UPDATE civ_manpower SET PICTURE = ? WHERE PAK = ?`,
      [photoBuffer, pak]
    );

    console.log(`✅ Photo uploaded successfully for PAK: ${pak}. Affected rows: ${result.affectedRows}`);

    res.json({
      success: true,
      message: 'Photo updated successfully'
    });

  } catch (error) {
    console.error('❌ Error uploading photo:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum 5MB allowed.'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get all civilian employees
router.get('/total-strength', async (req, res) => {
  console.log('📋 Fetching civilian strength...');

  try {
    const sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY PAK),
        PAK,
        COALESCE(APPOINTMENT, 'Not Specified') as appointment,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(FATHER_NAME, 'N/A') as father_name,
        COALESCE(PHONE, 'N/A') as phone,
        COALESCE(MOBILE, 'N/A') as mobile,
        COALESCE(TEMP_ADDRESS, PERMANENT_ADDRESS, 'Address not available') as address,
        COALESCE(EMAIL, 'N/A') as email,
        DATE_FORMAT(POSTIN_DATE, '%d-%b-%y') as postin_date,
        DATE_FORMAT(DOB, '%d-%b-%y') as dob,
        COALESCE(QUALIFICATION, 'N/A') as qualification,
        COALESCE(EXPERIENCE, 'N/A') as experience,
        COALESCE(SALARY_PM, 'N/A') as salary_pm,
        COALESCE(DEPLOYMENT, 'Not Assigned') as deployment,
        COALESCE(SECTION, 'Not Assigned') as section,
        COALESCE(CNIC, 'N/A') as cnic,
        COALESCE(BLOOD_GROUP, 'N/A') as blood_group
      FROM civ_manpower
      WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
      ORDER BY PAK
    `;

    const [results] = await db.query(sql);
    console.log(`✅ Fetched ${results.length} civilian employees`);

    res.json(results);
  } catch (error) {
    console.error('❌ Database error fetching civilians:', error.message);
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});

// Search civilians
router.get('/search', async (req, res) => {
  const searchTerm = req.query.term || '';
  console.log(`🔍 Searching civilians for: "${searchTerm}"`);

  try {
    if (!searchTerm.trim()) {
      const [results] = await db.query('SELECT * FROM civ_manpower');
      return res.json(results);
    }

    const sql = `
      SELECT 
        PAK,
        COALESCE(APPOINTMENT, 'Not Specified') as appointment,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(DEPLOYMENT, 'Not Assigned') as deployment,
        COALESCE(SECTION, 'Not Assigned') as section
      FROM civ_manpower
      WHERE (
        UPPER(EMPLOYEE_NAME) LIKE UPPER(?) OR
        UPPER(PAK) LIKE UPPER(?) OR
        UPPER(APPOINTMENT) LIKE UPPER(?) OR
        UPPER(SECTION) LIKE UPPER(?) OR
        UPPER(DEPLOYMENT) LIKE UPPER(?)
      )
      AND (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
    `;

    const searchPattern = `%${searchTerm}%`;

    const [results] = await db.query(sql, [
      searchPattern, searchPattern, searchPattern,
      searchPattern, searchPattern
    ]);

    console.log(`✅ Found ${results.length} civilian results`);
    res.json(results);
  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get civilian statistics
router.get('/statistics', async (req, res) => {
  console.log('📊 Fetching civilian statistics...');

  try {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DEPLOYMENT LIKE '%Research%' THEN 1 END) as research,
        COUNT(CASE WHEN DEPLOYMENT LIKE '%Design%' THEN 1 END) as design,
        COUNT(CASE WHEN DEPLOYMENT LIKE '%Support%' THEN 1 END) as support,
        COUNT(CASE WHEN DEPLOYMENT IS NULL OR DEPLOYMENT = '' THEN 1 END) as other_deployment
      FROM civ_manpower
      WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
    `;

    const [results] = await db.query(sql);
    console.log('✅ Civilian statistics:', results[0]);
    res.json(results[0]);
  } catch (error) {
    console.error('❌ Statistics error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get appointment distribution
router.get('/appointment-distribution', async (req, res) => {
  try {
    const sql = `
      SELECT 
        APPOINTMENT as appointment,
        COUNT(*) as count
      FROM civ_manpower
      WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
      GROUP BY APPOINTMENT
      ORDER BY count DESC
    `;

    const [results] = await db.query(sql);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deployment distribution
router.get('/deployment-distribution', async (req, res) => {
  try {
    const sql = `
      SELECT 
        DEPLOYMENT as deployment,
        COUNT(*) as count
      FROM civ_manpower
      WHERE POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE()
      GROUP BY DEPLOYMENT
      ORDER BY count DESC
    `;

    const [results] = await db.query(sql);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const [result] = await db.query('SELECT COUNT(*) as count FROM civ_manpower');
    res.json({
      status: 'healthy',
      table: 'civ_manpower',
      record_count: result[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Get current civilian employees (POSTOUT_DATE is null OR future date)
router.get('/current-employees', async (req, res) => {
  try {
    console.log('🔍 Fetching current civilian employees');

    const [employees] = await db.execute(
      `SELECT PAK, APPOINTMENT, EMPLOYEE_NAME 
       FROM civ_manpower 
       WHERE POSTOUT_DATE IS NULL 
          OR POSTOUT_DATE > CURDATE()
       ORDER BY EMPLOYEE_NAME`
    );

    const formattedEmployees = employees.map(employee =>
      `${employee.PAK} : ${employee.APPOINTMENT || 'N/A'} : ${employee.EMPLOYEE_NAME}`
    );

    console.log(`✅ Found ${formattedEmployees.length} current employees`);

    res.json({
      success: true,
      employees: formattedEmployees
    });
  } catch (error) {
    console.error('❌ Error fetching current civilian employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get ex-civilian employees (POSTOUT_DATE is not null AND past date)
router.get('/ex-employees', async (req, res) => {
  try {
    console.log('🔍 Fetching ex-civilian employees');

    const [employees] = await db.execute(
      `SELECT PAK, APPOINTMENT, EMPLOYEE_NAME 
       FROM civ_manpower 
       WHERE POSTOUT_DATE IS NOT NULL 
          AND POSTOUT_DATE <= CURDATE()
       ORDER BY EMPLOYEE_NAME`
    );

    const formattedEmployees = employees.map(employee =>
      `${employee.PAK} : ${employee.APPOINTMENT || 'N/A'} : ${employee.EMPLOYEE_NAME}`
    );

    console.log(`✅ Found ${formattedEmployees.length} ex-employees`);

    res.json({
      success: true,
      employees: formattedEmployees
    });
  } catch (error) {
    console.error('❌ Error fetching ex-civilian employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employee details by PAK
router.get('/:pak', async (req, res) => {
  try {
    const { pak } = req.params;

    console.log(`🔍 Fetching employee data for PAK: ${pak}`);

    const [employees] = await db.execute(
      `SELECT 
        PAK, PASS_NO, APPOINTMENT, EMPLOYEE_NAME, FATHER_NAME, 
        PHONE, MOBILE, TEMP_ADDRESS, PERMANENT_ADDRESS, EMAIL,
        POSTIN_DATE, POSTOUT_DATE, CNIC, DOB, QUALIFICATION,
        EXPERIENCE, REFERENCE, SALARY_PM, DEPLOYMENT, BANK_ACCOUNT,
        BANK_ADDRESS, BLOOD_GROUP, SECTION
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (employees.length === 0) {
      console.log(`❌ Employee not found: ${pak}`);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
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
      pass_no: employee.PASS_NO,
      appointment: employee.APPOINTMENT,
      employee_name: employee.EMPLOYEE_NAME,
      father_name: employee.FATHER_NAME,
      phone: employee.PHONE,
      mobile: employee.MOBILE,
      temp_address: employee.TEMP_ADDRESS,
      permanent_address: employee.PERMANENT_ADDRESS,
      email: employee.EMAIL,
      postin_date: formatDate(employee.POSTIN_DATE),
      postout_date: formatDate(employee.POSTOUT_DATE),
      cnic: employee.CNIC,
      dob: formatDate(employee.DOB),
      qualification: employee.QUALIFICATION,
      experience: employee.EXPERIENCE,
      reference: employee.REFERENCE,
      salary_pm: employee.SALARY_PM,
      deployment: employee.DEPLOYMENT,
      bank_account: employee.BANK_ACCOUNT,
      bank_address: employee.BANK_ADDRESS,
      blood_group: employee.BLOOD_GROUP,
      section: employee.SECTION
    };

    console.log(`✅ Employee data fetched successfully: ${employee.EMPLOYEE_NAME}`);

    res.json({
      success: true,
      employee: formattedEmployee
    });

  } catch (error) {
    console.error('❌ Error fetching employee data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update employee details
/*
router.put('/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    const updateData = req.body;

    console.log(`🔄 Updating employee data for PAK: ${pak}`, updateData);

    // Check if employee exists
    const [existing] = await db.execute(
      'SELECT PAK FROM civ_manpower WHERE PAK = ?',
      [pak]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Prepare update fields
    const updateFields = [];
    const updateValues = [];

    const fieldMapping = {
      pass_no: 'PASS_NO',
      father_name: 'FATHER_NAME',
      phone: 'PHONE',
      mobile: 'MOBILE',
      temp_address: 'TEMP_ADDRESS',
      permanent_address: 'PERMANENT_ADDRESS',
      email: 'EMAIL',
      dob: 'DOB',
      qualification: 'QUALIFICATION',
      experience: 'EXPERIENCE',
      reference: 'REFERENCE',
      deployment: 'DEPLOYMENT',
      blood_group: 'BLOOD_GROUP',
      section: 'SECTION'
    };

    Object.keys(fieldMapping).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${fieldMapping[key]} = ?`);
        updateValues.push(updateData[key]);
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
      UPDATE civ_manpower 
      SET ${updateFields.join(', ')} 
      WHERE PAK = ?
    `;

    console.log(`📝 Executing query: ${query}`);
    console.log(`📝 With values:`, updateValues);

    const [result] = await db.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update employee data'
      });
    }

    console.log(`✅ Employee data updated successfully. Affected rows: ${result.affectedRows}`);

    res.json({
      success: true,
      message: 'Employee data updated successfully',
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('❌ Error updating employee data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
*/



// Get civilian employee photo by PAK
router.get('/employee/:pak/photo', async (req, res) => {
  try {
    const { pak } = req.params;
    console.log(`🖼️ Fetching photo for employee PAK: ${pak}`);

    const [rows] = await db.execute(
      `SELECT PICTURE FROM civ_manpower WHERE PAK = ?`,
      [pak]
    );

    if (rows.length === 0 || !rows[0].PICTURE) {
      console.log(`❌ No photo found for PAK: ${pak}, returning default avatar`);
      return res.redirect('/images/default-avatar.png');
    }

    const picture = rows[0].PICTURE;

    // Set appropriate headers for image
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(picture);

    console.log(`✅ Photo sent successfully for PAK: ${pak}`);
  } catch (error) {
    console.error('❌ Error fetching employee photo:', error);
    res.redirect('/images/default-avatar.png');
  }
});



// ================================================
// UPDATE ATTENDANCE ROUTES - CORRECTED
// ================================================



// Helper function to get default times from time table (used by attendance)
const getDefaultTimes = async () => {
  try {
    console.log('⏰ Fetching default times from database...');

    const [timeRecords] = await db.execute(
      `SELECT 
        DATE_FORMAT(TIME_IN, '%H:%i') as default_time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as default_time_out
       FROM time 
       ORDER BY TIME_IN DESC 
       LIMIT 1`
    );

    if (timeRecords.length > 0) {
      return {
        default_time_in: timeRecords[0].default_time_in || '09:00',
        default_time_out: timeRecords[0].default_time_out || '17:00'
      };
    }

    // Return defaults if no records found
    return {
      default_time_in: '09:00',
      default_time_out: '17:00'
    };
  } catch (error) {
    console.error('❌ Error fetching default times:', error);
    return {
      default_time_in: '09:00',
      default_time_out: '17:00'
    };
  }
};

// Get default times API
router.get('/attendance/default-times', async (req, res) => {
  try {
    const defaultTimes = await getDefaultTimes();

    console.log('⏰ Default times:', defaultTimes);

    res.json({
      success: true,
      ...defaultTimes
    });

  } catch (error) {
    console.error('❌ Error fetching default times:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      default_time_in: '09:00',
      default_time_out: '17:00'
    });
  }
});

// Update the date-details route to include default times
router.get('/attendance/date-details/:date', async (req, res) => {
  try {
    const { date } = req.params;

    console.log(`📅 Fetching attendance for specific date: ${date}`);

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get default times
    const defaultTimes = await getDefaultTimes();

    const [attendance] = await db.execute(
      `SELECT 
        a.ATTENDENCE_ID,
        DATE_FORMAT(a.ATTENDENCE_DATE, '%Y-%m-%d') as attendence_date,
        a.PAK,
        a.STATUS,
        DATE_FORMAT(a.TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(a.TIME_OUT, '%H:%i') as time_out,
        a.MISSED_HOURS,
        a.REMARKS,
        m.EMPLOYEE_NAME,
        m.APPOINTMENT
       FROM civ_attendence a
       LEFT JOIN civ_manpower m ON a.PAK = m.PAK
       WHERE DATE(a.ATTENDENCE_DATE) = ?
       ORDER BY a.TIME_IN DESC`,
      [date]
    );

    console.log(`✅ Found ${attendance.length} records for date ${date}`);

    res.json({
      success: true,
      attendance: attendance,
      count: attendance.length,
      date: date,
      default_time_in: defaultTimes.default_time_in,
      default_time_out: defaultTimes.default_time_out
    });

  } catch (error) {
    console.error('❌ Error fetching attendance for date:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update the /attendance/update-details route in employee.js
router.post('/attendance/update-details', async (req, res) => {
  let connection;
  try {
    const { attendance_records, date } = req.body;

    console.log(`🔄 Updating attendance details for ${attendance_records ? attendance_records.length : 0} records`);
    console.log('Received data:', JSON.stringify(req.body, null, 2));

    if (!attendance_records || !Array.isArray(attendance_records) || !date) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Date and records are required.'
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      let updatedCount = 0;
      let errors = [];

      for (const record of attendance_records) {
        if (!record.pak || !record.attendence_id) {
          errors.push({
            pak: record.pak,
            error: 'Missing required fields (PAK or Attendance ID)'
          });
          continue;
        }

        // Use the missed_hours value from frontend (don't recalculate)
        let missedHours = record.missed_hours || 0;

        // Prepare time values
        let timeInDatetime = null;
        let timeOutDatetime = null;

        // Set time_in if provided
        if (record.time_in && record.time_in.trim() !== '') {
          let timeIn = record.time_in.trim();
          // Ensure proper format
          if (timeIn.length === 4) timeIn = '0' + timeIn; // Handle 9:00 as 09:00
          timeInDatetime = `${date} ${timeIn}:00`;
        }

        // Set time_out if provided
        if (record.time_out && record.time_out.trim() !== '') {
          let timeOut = record.time_out.trim();
          if (timeOut.length === 4) timeOut = '0' + timeOut;
          timeOutDatetime = `${date} ${timeOut}:00`;
        }

        // Handle special statuses
        if (record.status === 'Absent') {
          missedHours = -8; // Negative for missed hours
          timeInDatetime = null;
          timeOutDatetime = null;
        } else if (record.status === 'Leave') {
          missedHours = 0.0; // Negative for missed hours
          timeInDatetime = null;
          timeOutDatetime = null;
        }

        console.log(`Updating ${record.pak}: Status=${record.status}, TimeIn=${timeInDatetime}, TimeOut=${timeOutDatetime}, MissedHours=${missedHours}`);

        const query = `
          UPDATE civ_attendence 
          SET STATUS = ?,
              TIME_IN = ?,
              TIME_OUT = ?,
              MISSED_HOURS = ?,
              REMARKS = ?
          WHERE ATTENDENCE_ID = ? AND PAK = ?
        `;

        try {
          const [result] = await connection.execute(query, [
            record.status,
            timeInDatetime,
            timeOutDatetime,
            missedHours,
            record.remarks || '',
            record.attendence_id,
            record.pak
          ]);

          if (result.affectedRows > 0) {
            updatedCount++;
            console.log(`✅ Updated record for ${record.pak}: ${result.affectedRows} row(s) affected`);
          } else {
            // Try to find if record exists with different criteria
            const [checkExists] = await connection.execute(
              `SELECT ATTENDENCE_ID FROM civ_attendence WHERE PAK = ? AND ATTENDENCE_DATE = ?`,
              [record.pak, date]
            );

            if (checkExists.length > 0) {
              // Update using date instead of ATTENDENCE_ID
              const updateByDateQuery = `
                UPDATE civ_attendence 
                SET STATUS = ?,
                    TIME_IN = ?,
                    TIME_OUT = ?,
                    MISSED_HOURS = ?,
                    REMARKS = ?
                WHERE PAK = ? AND ATTENDENCE_DATE = ?
              `;

              const [dateResult] = await connection.execute(updateByDateQuery, [
                record.status,
                timeInDatetime,
                timeOutDatetime,
                missedHours,
                record.remarks || '',
                record.pak,
                date
              ]);

              if (dateResult.affectedRows > 0) {
                updatedCount++;
                console.log(`✅ Updated record for ${record.pak} by date`);
              } else {
                errors.push({
                  pak: record.pak,
                  error: 'Record exists but could not be updated'
                });
              }
            } else {
              errors.push({
                pak: record.pak,
                error: 'No matching record found'
              });
            }
          }
        } catch (updateError) {
          console.error(`❌ Error updating record for ${record.pak}:`, updateError);
          errors.push({
            pak: record.pak,
            error: updateError.message
          });
        }
      }

      if (errors.length > 0) {
        console.error('Update errors:', errors);
        await connection.rollback();
        await connection.release();
        return res.status(400).json({
          success: false,
          message: `Failed to update some records`,
          errors: errors,
          updatedCount: updatedCount
        });
      }

      await connection.commit();
      await connection.release();

      console.log(`✅ Successfully updated ${updatedCount} records`);

      res.json({
        success: true,
        message: `Successfully updated ${updatedCount} attendance records`,
        updatedCount: updatedCount
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error updating attendance details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});




// Get biometric data (simulated for now - in production this would connect to biometric device)
router.get('/attendance/biometric-data/:date', async (req, res) => {
  try {
    const { date } = req.params;

    console.log(`📊 Fetching simulated biometric data for date: ${date}`);

    // In production, this would connect to biometric device API
    // For now, we'll simulate biometric data

    // Get attendance records for the date
    const [attendance] = await db.execute(
      `SELECT PAK FROM civ_attendence WHERE DATE(ATTENDENCE_DATE) = ?`,
      [date]
    );

    // Generate simulated biometric data
    const biometricData = {};
    attendance.forEach(record => {
      // Generate random time between 08:00 and 09:30 for time_in
      const randomHourIn = 8 + Math.floor(Math.random() * 2);
      const randomMinuteIn = Math.floor(Math.random() * 60);
      const timeIn = `${randomHourIn.toString().padStart(2, '0')}:${randomMinuteIn.toString().padStart(2, '0')}`;

      // Generate random time between 17:00 and 18:30 for time_out
      const randomHourOut = 17 + Math.floor(Math.random() * 2);
      const randomMinuteOut = Math.floor(Math.random() * 60);
      const timeOut = `${randomHourOut.toString().padStart(2, '0')}:${randomMinuteOut.toString().padStart(2, '0')}`;

      biometricData[record.PAK] = {
        time_in: timeIn,
        time_out: timeOut,
        source: 'biometric_device'
      };
    });

    res.json({
      success: true,
      biometric_data: biometricData,
      count: Object.keys(biometricData).length,
      date: date
    });

  } catch (error) {
    console.error('❌ Error fetching biometric data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});




// ================================================
// UPDATED HOLIDAY WORK MANAGEMENT ROUTES
// All routes need to be prefixed with /api/employee/
// ================================================

// Check if holiday work record already exists WITH DATA
router.get('/holiday-work/check-with-data', async (req, res) => {
  try {
    const { date, pak } = req.query;

    console.log(`🔍 Checking holiday work with data for PAK: ${pak} on date: ${date}`);

    if (!date || !pak) {
      return res.status(400).json({
        success: false,
        message: 'Date and PAK parameters are required'
      });
    }

    // Check if it's actually a weekend (holiday)
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend) {
      return res.json({
        success: true,
        exists: false,
        is_holiday: false,
        message: 'Selected date is not a weekend (holiday)'
      });
    }

    const [results] = await db.execute(
      `SELECT 
        a.ATTENDENCE_ID,
        DATE_FORMAT(a.ATTENDENCE_DATE, '%Y-%m-%d') as attendence_date,
        a.PAK,
        a.STATUS,
        DATE_FORMAT(a.TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(a.TIME_OUT, '%H:%i') as time_out,
        a.MISSED_HOURS,
        a.REMARKS,
        m.EMPLOYEE_NAME,
        m.APPOINTMENT
       FROM civ_attendence a
       LEFT JOIN civ_manpower m ON a.PAK = m.PAK
       WHERE a.ATTENDENCE_DATE = ? AND a.PAK = ? AND a.STATUS = 'Holiday Work'`,
      [date, pak]
    );

    const exists = results.length > 0;

    console.log(`✅ Holiday work check with data: ${exists ? 'Exists' : 'Does not exist'}`);

    res.json({
      success: true,
      exists: exists,
      record: exists ? results[0] : null,
      count: results.length,
      is_holiday: true,
      day_of_week: dayOfWeek === 0 ? 'Sunday' : 'Saturday'
    });

  } catch (error) {
    console.error('❌ Error checking holiday work with data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Save holiday work record (CREATE)
router.post('/holiday-work/save', async (req, res) => {
  let connection;
  try {
    const {
      date,
      pak,
      employee_name,
      appointment,
      time_in,
      time_out,
      work_hours,
      holiday_credit_hours,
      remarks,
      status
    } = req.body;

    console.log(`📝 Saving holiday work for PAK: ${pak} on date: ${date}`);
    console.log('Holiday work data:', req.body);

    if (!date || !pak || !time_in || !time_out) {
      return res.status(400).json({
        success: false,
        message: 'Date, PAK, time_in, and time_out are required'
      });
    }

    // Validate date is a weekend (holiday)
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend) {
      return res.status(400).json({
        success: false,
        message: 'Holiday work can only be recorded on Saturdays (6) or Sundays (0)'
      });
    }

    // Calculate work duration
    const [inHours, inMinutes] = time_in.split(':').map(Number);
    const [outHours, outMinutes] = time_out.split(':').map(Number);

    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;
    const workMinutes = totalOutMinutes - totalInMinutes;

    if (workMinutes < 60) {
      return res.status(400).json({
        success: false,
        message: 'Minimum work duration should be at least 1 hour'
      });
    }

    if (workMinutes > 12 * 60) {
      return res.status(400).json({
        success: false,
        message: 'Maximum work duration cannot exceed 12 hours'
      });
    }

    // Check if record already exists
    const [existing] = await db.execute(
      `SELECT ATTENDENCE_ID FROM civ_attendence 
       WHERE ATTENDENCE_DATE = ? AND PAK = ? AND STATUS = 'Holiday Work'`,
      [date, pak]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Holiday work record for this employee and date already exists',
        existing_record_id: existing[0].ATTENDENCE_ID
      });
    }

    // For holiday work, missed_hours should be POSITIVE (credit/extra work)
    const creditHours = workMinutes / 60; // Positive hours

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get total strength for ATTENDENCE_ID generation
      const [strengthResult] = await connection.execute(
        `SELECT COUNT(DISTINCT PAK) as total FROM civ_attendence WHERE ATTENDENCE_DATE = ?`,
        [date]
      );

      const totalStrength = strengthResult[0]?.total || 0;
      const attendenceId = Date.now(); // Generate unique ID

      // Prepare time values
      const timeInDatetime = `${date} ${time_in}:00`;
      const timeOutDatetime = `${date} ${time_out}:00`;

      // Insert holiday work record
      const query = `
        INSERT INTO civ_attendence (
          ATTENDENCE_ID,
          ATTENDENCE_DATE,
          TOTAL_STR,
          PAK,
          STATUS,
          TIME_IN,
          TIME_OUT,
          MISSED_HOURS,
          REMARKS
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        attendenceId,
        date,
        totalStrength + 1, // Increment total strength
        pak,
        'Holiday Work', // Special status
        timeInDatetime,
        timeOutDatetime,
        creditHours, // Store as positive (represents credit)
        remarks || `Holiday Work: ${time_in} to ${time_out} (${creditHours.toFixed(2)} hours)`
      ];

      console.log('Executing query with values:', values);

      const [result] = await connection.execute(query, values);

      await connection.commit();
      await connection.release();

      console.log(`✅ Holiday work saved successfully. Inserted ID: ${attendenceId}`);

      res.json({
        success: true,
        message: `Holiday work saved successfully for ${employee_name}`,
        attendence_id: attendenceId,
        credit_hours: creditHours,
        affectedRows: result.affectedRows
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error saving holiday work:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Update holiday work record (UPDATE)
router.put('/holiday-work/update', async (req, res) => {
  let connection;
  try {
    const {
      date,
      pak,
      attendence_id,
      time_in,
      time_out,
      work_hours,
      holiday_credit_hours,
      remarks
    } = req.body;

    console.log(`✏️ Updating holiday work for PAK: ${pak} on date: ${date}`);
    console.log('Update data:', req.body);

    if (!date || !pak || !attendence_id || !time_in || !time_out) {
      return res.status(400).json({
        success: false,
        message: 'Date, PAK, attendence_id, time_in, and time_out are required'
      });
    }

    // Validate date is a weekend (holiday)
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend) {
      return res.status(400).json({
        success: false,
        message: 'Holiday work can only be recorded on Saturdays (6) or Sundays (0)'
      });
    }

    // Calculate work duration
    const [inHours, inMinutes] = time_in.split(':').map(Number);
    const [outHours, outMinutes] = time_out.split(':').map(Number);

    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;
    const workMinutes = totalOutMinutes - totalInMinutes;

    if (workMinutes < 60) {
      return res.status(400).json({
        success: false,
        message: 'Minimum work duration should be at least 1 hour'
      });
    }

    if (workMinutes > 12 * 60) {
      return res.status(400).json({
        success: false,
        message: 'Maximum work duration cannot exceed 12 hours'
      });
    }

    // For holiday work, missed_hours should be POSITIVE (credit/extra work)
    const creditHours = workMinutes / 60; // Positive hours

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Check if record exists
      const [existing] = await connection.execute(
        `SELECT ATTENDENCE_ID FROM civ_attendence 
         WHERE ATTENDENCE_ID = ? AND PAK = ? AND STATUS = 'Holiday Work'`,
        [attendence_id, pak]
      );

      if (existing.length === 0) {
        await connection.rollback();
        await connection.release();
        return res.status(404).json({
          success: false,
          message: 'Holiday work record not found'
        });
      }

      // Prepare time values
      const timeInDatetime = `${date} ${time_in}:00`;
      const timeOutDatetime = `${date} ${time_out}:00`;

      // Update holiday work record
      const query = `
        UPDATE civ_attendence 
        SET TIME_IN = ?,
            TIME_OUT = ?,
            MISSED_HOURS = ?,
            REMARKS = ?,
            ATTENDENCE_DATE = ?
        WHERE ATTENDENCE_ID = ? AND PAK = ? AND STATUS = 'Holiday Work'
      `;

      const values = [
        timeInDatetime,
        timeOutDatetime,
        creditHours, // Store as positive (represents credit)
        remarks || `Holiday Work: ${time_in} to ${time_out} (${creditHours.toFixed(2)} hours)`,
        date,
        attendence_id,
        pak
      ];

      console.log('Executing update query with values:', values);

      const [result] = await connection.execute(query, values);

      await connection.commit();
      await connection.release();

      if (result.affectedRows === 0) {
        console.log(`❌ No rows affected for update`);
        return res.status(400).json({
          success: false,
          message: 'No changes made or record not found'
        });
      }

      console.log(`✅ Holiday work updated successfully. Affected rows: ${result.affectedRows}`);

      res.json({
        success: true,
        message: `Holiday work updated successfully`,
        attendence_id: attendence_id,
        credit_hours: creditHours,
        affectedRows: result.affectedRows
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error updating holiday work:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get recent holiday work entries
router.get('/holiday-work/recent', async (req, res) => {
  try {
    console.log('📋 Fetching recent holiday work entries');

    const [holidayWork] = await db.execute(
      `SELECT 
        a.ATTENDENCE_ID,
        DATE_FORMAT(a.ATTENDENCE_DATE, '%Y-%m-%d') as attendence_date,
        a.PAK,
        a.STATUS,
        DATE_FORMAT(a.TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(a.TIME_OUT, '%H:%i') as time_out,
        a.MISSED_HOURS,
        a.REMARKS,
        m.EMPLOYEE_NAME,
        m.APPOINTMENT,
        DAYOFWEEK(a.ATTENDENCE_DATE) as day_of_week
       FROM civ_attendence a
       LEFT JOIN civ_manpower m ON a.PAK = m.PAK
       WHERE a.STATUS = 'Holiday Work'
       ORDER BY a.ATTENDENCE_DATE DESC, a.TIME_IN DESC
       LIMIT 10`
    );

    console.log(`✅ Found ${holidayWork.length} recent holiday work records`);

    res.json({
      success: true,
      holiday_work: holidayWork,
      count: holidayWork.length
    });

  } catch (error) {
    console.error('❌ Error fetching holiday work:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete holiday work record
router.delete('/holiday-work/delete/:attendence_id', async (req, res) => {
  try {
    const { attendence_id } = req.params;

    console.log(`🗑️ Deleting holiday work record ID: ${attendence_id}`);

    const [result] = await db.execute(
      `DELETE FROM civ_attendence WHERE ATTENDENCE_ID = ? AND STATUS = 'Holiday Work'`,
      [attendence_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday work record not found'
      });
    }

    console.log(`✅ Holiday work deleted successfully. Affected rows: ${result.affectedRows}`);

    res.json({
      success: true,
      message: 'Holiday work record deleted successfully',
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('❌ Error deleting holiday work:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});




// ================================================
// MANHOUR REPORT MANAGEMENT ROUTES
// ================================================

// Get available years with attendance data
router.get('/manhour-report/years', async (req, res) => {
  try {
    console.log('📅 Fetching years with attendance data');

    const [years] = await db.execute(
      `SELECT DISTINCT YEAR(ATTENDENCE_DATE) as year 
       FROM civ_attendence 
       WHERE STATUS != 'Holiday Work'
       ORDER BY year DESC
       LIMIT 20`
    );

    const availableYears = years.map(row => row.year.toString());

    // Get current year
    const currentYear = new Date().getFullYear().toString();

    // Add current year if not in list
    if (!availableYears.includes(currentYear)) {
      availableYears.unshift(currentYear);
    }

    console.log(`✅ Found ${availableYears.length} years with data`);

    res.json({
      success: true,
      current_year: currentYear,
      available_years: availableYears,
      count: availableYears.length
    });

  } catch (error) {
    console.error('❌ Error fetching years:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get hours records for a specific employee and year
router.get('/hours-records/:pak/:year', async (req, res) => {
  try {
    const { pak, year } = req.params;

    console.log(`📊 Fetching hours records for ${pak} in ${year}`);

    const [hoursRecords] = await db.execute(
      `SELECT 
        BONUS_ID,
        BONUS_TO,
        BONUS_HOURS,
        BONUS_DATE,
        AWARDED_BY,
        REASON,
        CASE 
          WHEN BONUS_HOURS >= 0 THEN 'Award'
          ELSE 'Penalty'
        END as ACTION_TYPE
       FROM bonus_hours 
       WHERE BONUS_TO = ? 
         AND YEAR(BONUS_DATE) = ?
       ORDER BY BONUS_DATE DESC`,
      [pak, year]
    );

    console.log(`✅ Found ${hoursRecords.length} hours records for ${pak}`);

    res.json({
      success: true,
      hours_records: hoursRecords,
      count: hoursRecords.length,
      employee_pak: pak,
      year: year
    });

  } catch (error) {
    console.error('❌ Error fetching hours records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get manhour report summary for a specific year - COMPLETE WORKING VERSION
router.get('/manhour-report/summary/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const reportYear = parseInt(year); // DEFINE reportYear HERE

    console.log(`📊 Generating manhour report for year: ${reportYear}`);

    // Get all current employees
    const [employees] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME, POSTIN_DATE 
       FROM civ_manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
         AND (POSTIN_DATE IS NOT NULL)
       ORDER BY EMPLOYEE_NAME`
    );

    console.log(`✅ Found ${employees.length} current employees`);

    const reportData = [];
    let processedCount = 0;

    // Get today's date for current year calculation
    const today = new Date();
    const currentYear = today.getFullYear();
    const isCurrentYear = reportYear === currentYear;

    // Daily accumulation rate - DEFINE HERE (outside the loop)
    const dailyAccumulationRate = 20 / 365; // ~0.0547945 per day

    for (const employee of employees) {
      try {
        const pak = employee.PAK;
        const postinDate = employee.POSTIN_DATE;
        const employeeName = employee.EMPLOYEE_NAME;

        // Calculate counted days for the year - IMPORTANT: This is for MAXIMUM possible days
        let maximumPossibleDays = 0;

        if (postinDate) {
          const postin = new Date(postinDate);
          const postinYear = postin.getFullYear();

          if (postinYear > reportYear) {
            // Employee joined after the report year
            maximumPossibleDays = 0;
          } else if (postinYear === reportYear) {
            // Employee joined in the same year as report year
            // Count MAXIMUM possible days from postin date to Dec 31 of that year
            const yearEnd = new Date(reportYear, 11, 31); // December 31
            const diffTime = Math.abs(yearEnd - postin);
            maximumPossibleDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include postin date
          } else {
            // Employee joined before the report year - should be full year
            const isLeapYear = (reportYear % 4 === 0 && reportYear % 100 !== 0) || (reportYear % 400 === 0);
            maximumPossibleDays = isLeapYear ? 366 : 365;
          }
        } else {
          // If no postin date, assume full year
          const isLeapYear = (reportYear % 4 === 0 && reportYear % 100 !== 0) || (reportYear % 400 === 0);
          maximumPossibleDays = isLeapYear ? 366 : 365;
        }

        // DAILY ACCUMULATION LOGIC
        let allowedLeaveDays = 0;

        if (maximumPossibleDays > 0) {
          if (isCurrentYear) {
            // For CURRENT year: accumulate from Jan 1 (or postin date) to TODAY

            const yearStart = new Date(reportYear, 0, 1); // Jan 1
            const yearEnd = new Date(reportYear, 11, 31); // Dec 31

            // Determine accumulation start date (postin date or Jan 1, whichever is later)
            let accumulationStartDate = yearStart;
            if (postinDate) {
              const postin = new Date(postinDate);
              accumulationStartDate = postin > yearStart ? postin : yearStart;
            }

            // For current year, accumulate up to TODAY
            const accumulationEndDate = today > yearEnd ? yearEnd : today;

            // Calculate days to accumulate
            const diffTime = Math.abs(accumulationEndDate - accumulationStartDate);
            let daysToAccumulate = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start date

            // Ensure daysToAccumulate doesn't exceed maximumPossibleDays
            daysToAccumulate = Math.min(daysToAccumulate, maximumPossibleDays);

            // Calculate allowed leaves
            allowedLeaveDays = daysToAccumulate * dailyAccumulationRate;

          } else {
            // For PAST year: accumulate from Jan 1 (or postin date) to Dec 31

            const yearStart = new Date(reportYear, 0, 1); // Jan 1
            const yearEnd = new Date(reportYear, 11, 31); // Dec 31

            // Determine accumulation start date (postin date or Jan 1, whichever is later)
            let accumulationStartDate = yearStart;
            if (postinDate) {
              const postin = new Date(postinDate);
              accumulationStartDate = postin > yearStart ? postin : yearStart;
            }

            // Calculate days to accumulate
            const diffTime = Math.abs(yearEnd - accumulationStartDate);
            let daysToAccumulate = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start date

            // Ensure daysToAccumulate doesn't exceed maximumPossibleDays
            daysToAccumulate = Math.min(daysToAccumulate, maximumPossibleDays);

            // Calculate allowed leaves
            allowedLeaveDays = daysToAccumulate * dailyAccumulationRate;

            // Cap at 20 days for past years
            if (allowedLeaveDays > 20) {
              allowedLeaveDays = 20;
            }
          }
        }

        // Get attendance data for the year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const [attendance] = await db.execute(
          `SELECT STATUS, MISSED_HOURS 
           FROM civ_attendence 
           WHERE PAK = ? 
             AND ATTENDENCE_DATE BETWEEN ? AND ?`,
          [pak, startDate, endDate]
        );

        // 1. Calculate availed leave days (only from official leaves)
        let availedLeaveDays = 0;

        attendance.forEach(record => {
          const status = record.STATUS;
          if (status === 'Leave') {
            availedLeaveDays += 1; // Full day leave
          } else if (status === 'Half Day') {
            availedLeaveDays += 0.5; // Half day leave
          }
        });

        // 2. Calculate earned leave days from missed_hours (ALL statuses except 'Leave')
        let totalEarnedHours = 0;

        attendance.forEach(record => {
          const status = record.STATUS;
          const missedHours = parseFloat(record.MISSED_HOURS) || 0;

          // Include ALL statuses EXCEPT 'Leave' in earned leave calculation
          if (status !== 'Leave') {
            totalEarnedHours += missedHours;
          }
        });

        const earnedLeaveDays = totalEarnedHours / 8; // Convert hours to days

        // 3. Calculate remaining leave days
        const remainingLeaveDays = allowedLeaveDays - availedLeaveDays;

        // 4. Fetch bonus HOURS from bonus_hours table
        const [bonusRecords] = await db.execute(
          `SELECT SUM(BONUS_HOURS) as total_bonus_hours 
           FROM bonus_hours 
           WHERE BONUS_TO = ? 
             AND YEAR(BONUS_DATE) = ?`,
          [pak, year]
        );

        const bonusHours = parseFloat(bonusRecords[0]?.total_bonus_hours || 0);

        // 5. Calculate balance leave days - CONVERT HOURS TO DAYS
        const balanceLeaveDays = remainingLeaveDays + (bonusHours / 8) + earnedLeaveDays;

        reportData.push({
          pak: pak,
          employee_name: employeeName,
          postin_date: postinDate ? new Date(postinDate).toISOString().split('T')[0] : 'N/A',
          counted_days: maximumPossibleDays, // This is MAXIMUM possible days
          allowed_leave_days: parseFloat(allowedLeaveDays.toFixed(4)),
          availed_leave_days: parseFloat(availedLeaveDays.toFixed(4)),
          remaining_leave_days: parseFloat(remainingLeaveDays.toFixed(4)),
          bonus_hours: parseFloat(bonusHours.toFixed(2)),
          earned_leave_days: parseFloat(earnedLeaveDays.toFixed(4)),
          balance_leave_days: parseFloat(balanceLeaveDays.toFixed(4))
        });

        // Debug log for first few employees
        if (processedCount < 3) {
          console.log(`Sample calculation for ${employeeName} (${pak}):`);
          console.log(`  Max Possible Days: ${maximumPossibleDays}`);
          console.log(`  Daily Rate: ${dailyAccumulationRate.toFixed(6)}`);
          console.log(`  Allowed: ${allowedLeaveDays.toFixed(4)} days (accumulated daily)`);
          console.log(`  Availed: ${availedLeaveDays.toFixed(4)} days (Leaves only)`);
          console.log(`  Earned: ${earnedLeaveDays.toFixed(4)} days (from ALL statuses except Leave)`);
          console.log(`  Bonus: ${bonusHours.toFixed(2)} hours (${(bonusHours / 8).toFixed(4)} days)`);
          console.log(`  Balance: ${balanceLeaveDays.toFixed(4)} days`);
        }

        processedCount++;

        // Log progress every 10 employees
        if (processedCount % 10 === 0) {
          console.log(`🔄 Processed ${processedCount}/${employees.length} employees...`);
        }

      } catch (employeeError) {
        console.error(`❌ Error processing employee ${employee.PAK}:`, employeeError);
        // Add employee with zero values if there's an error
        reportData.push({
          pak: employee.PAK,
          employee_name: employee.EMPLOYEE_NAME || 'Unknown',
          postin_date: employee.POSTIN_DATE ? new Date(employee.POSTIN_DATE).toISOString().split('T')[0] : 'N/A',
          counted_days: 0,
          allowed_leave_days: 0,
          availed_leave_days: 0,
          remaining_leave_days: 0,
          bonus_hours: 0,
          earned_leave_days: 0,
          balance_leave_days: 0
        });
      }
    }

    console.log(`✅ Generated report for ${reportData.length} employees`);

    // Calculate summary statistics
    const summary = {
      total_employees: reportData.length,
      total_allowed_days: parseFloat(reportData.reduce((sum, emp) => sum + emp.allowed_leave_days, 0).toFixed(4)),
      total_availed_days: parseFloat(reportData.reduce((sum, emp) => sum + emp.availed_leave_days, 0).toFixed(4)),
      total_bonus_hours: parseFloat(reportData.reduce((sum, emp) => sum + emp.bonus_hours, 0).toFixed(2)),
      total_earned_days: parseFloat(reportData.reduce((sum, emp) => sum + emp.earned_leave_days, 0).toFixed(4)),
      total_balance_days: parseFloat(reportData.reduce((sum, emp) => sum + emp.balance_leave_days, 0).toFixed(4))
    };

    res.json({
      success: true,
      year: year,
      report_data: reportData,
      summary: summary,
      count: reportData.length,
      generated_at: new Date().toISOString(),
      daily_accumulation_rate: dailyAccumulationRate.toFixed(6),
      is_current_year: isCurrentYear
    });

  } catch (error) {
    console.error('❌ Error generating manhour report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});




// Get detailed employee attendance for a specific year - COMPLETE WORKING VERSION
router.get('/manhour-report/employee/:pak/:year', async (req, res) => {
  try {
    const { pak, year } = req.params;
    const reportYearNum = parseInt(year); // DEFINE reportYearNum HERE

    console.log(`📋 Fetching detailed attendance for ${pak} in ${reportYearNum}`);

    // Get employee basic info
    const [employeeInfo] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME, POSTIN_DATE, APPOINTMENT
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (employeeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const employee = employeeInfo[0];
    const postinDate = employee.POSTIN_DATE;

    // IMPORTANT FIX: Correct Counted Days calculation
    let countedDays = 0;

    if (postinDate) {
      const postin = new Date(postinDate);
      const postinYear = postin.getFullYear();

      console.log(`Employee ${pak}: Post-in Date: ${postinDate}, Post-in Year: ${postinYear}, Report Year: ${reportYearNum}`);

      if (postinYear > reportYearNum) {
        // Employee joined after the report year
        countedDays = 0;
        console.log(`Employee joined after ${reportYearNum} - Counted Days: 0`);
      } else if (postinYear === reportYearNum) {
        // Employee joined in the same year as report year
        // Count days from postin date to Dec 31 of that year
        const yearEnd = new Date(reportYearNum, 11, 31); // December 31
        const diffTime = Math.abs(yearEnd - postin);
        countedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include postin date
        console.log(`Employee joined in ${reportYearNum} - Counted Days: ${countedDays} (from ${postinDate} to Dec 31)`);
      } else {
        // Employee joined before the report year - should be full year (365 or 366)
        const isLeapYear = (reportYearNum % 4 === 0 && reportYearNum % 100 !== 0) || (reportYearNum % 400 === 0);
        countedDays = isLeapYear ? 366 : 365;
        console.log(`Employee joined before ${reportYearNum} - Counted Days: ${countedDays} (full year)`);
      }
    } else {
      // If no postin date, assume full year
      const isLeapYear = (reportYearNum % 4 === 0 && reportYearNum % 100 !== 0) || (reportYearNum % 400 === 0);
      countedDays = isLeapYear ? 366 : 365;
      console.log(`No postin date - using full year: ${countedDays} days`);
    }

    // Get detailed attendance records for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const [attendanceRecords] = await db.execute(
      `SELECT 
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as attendence_date,
        DAYNAME(ATTENDENCE_DATE) as day_name,
        STATUS,
        DATE_FORMAT(TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as time_out,
        MISSED_HOURS,
        REMARKS
       FROM civ_attendence 
       WHERE PAK = ? 
         AND ATTENDENCE_DATE BETWEEN ? AND ?
       ORDER BY ATTENDENCE_DATE ASC`,
      [pak, startDate, endDate]
    );

    // Calculate availed leave days (only official leaves)
    let availedLeaveDays = 0;

    // Calculate earned leave days from missed_hours (ALL statuses except 'Leave')
    let totalEarnedHours = 0;

    attendanceRecords.forEach(record => {
      const status = record.STATUS;
      const missedHours = parseFloat(record.MISSED_HOURS) || 0;

      // Availed leave calculation
      if (status === 'Leave') {
        availedLeaveDays += 1;
      } else if (status === 'Half Day') {
        availedLeaveDays += 0.5;
      }

      // Earned leave calculation - Include ALL statuses EXCEPT 'Leave'
      if (status !== 'Leave') {
        totalEarnedHours += missedHours;
      }
    });

    const earnedLeaveDays = totalEarnedHours / 8;

    // Calculate allowed leave (20 days per year, accumulated daily) - DAILY ACCUMULATION
    const dailyAccumulationRate = 20 / 365; // ~0.0547945 per day - DEFINE HERE
    let allowedLeaveDays = 0;

    if (countedDays > 0) {
      // Check if this is current year or past year
      const today = new Date();
      const isCurrentYear = reportYearNum === today.getFullYear();

      const yearStart = new Date(reportYearNum, 0, 1); // Jan 1
      const yearEnd = new Date(reportYearNum, 11, 31); // Dec 31

      // Determine accumulation start date
      let accumulationStartDate = yearStart;
      if (postinDate) {
        const postin = new Date(postinDate);
        accumulationStartDate = postin > yearStart ? postin : yearStart;
      }

      if (isCurrentYear) {
        // For current year: accumulate from start date to TODAY
        const accumulationEndDate = today > yearEnd ? yearEnd : today;
        const diffTime = Math.abs(accumulationEndDate - accumulationStartDate);
        const daysToAccumulate = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        allowedLeaveDays = daysToAccumulate * dailyAccumulationRate;
      } else {
        // For past year: accumulate from start date to Dec 31
        const diffTime = Math.abs(yearEnd - accumulationStartDate);
        const daysToAccumulate = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        allowedLeaveDays = daysToAccumulate * dailyAccumulationRate;

        // Cap at 20 days for past years
        if (allowedLeaveDays > 20) {
          allowedLeaveDays = 20;
        }
      }
    }

    console.log(`Counted Days: ${countedDays}, Daily Rate: ${dailyAccumulationRate.toFixed(6)}, Allowed Days: ${allowedLeaveDays.toFixed(4)}`);

    // Calculate remaining
    const remainingLeaveDays = allowedLeaveDays - availedLeaveDays;

    // Fetch bonus hours 

    const [bonusRecords] = await db.execute(
      `SELECT SUM(BONUS_HOURS) as total_bonus_hours 
       FROM bonus_hours 
       WHERE BONUS_TO = ? 
         AND YEAR(BONUS_DATE) = ?`,
      [pak, year]
    );

    const bonusHours = parseFloat(bonusRecords[0]?.total_bonus_hours || 0);

    // Calculate balance - convert bonus hours to days (÷ 8)
    const bonusDays = bonusHours / 8;
    const balanceLeaveDays = remainingLeaveDays + bonusDays + earnedLeaveDays;

    // Calculate attendance statistics
    const totalDaysInYear = countedDays > 0 ? countedDays : 365;
    const presentDays = attendanceRecords.filter(r => r.STATUS === 'Present' || r.STATUS === 'Late').length;
    const absentDays = attendanceRecords.filter(r => r.STATUS === 'Absent').length;
    const leaveDays = attendanceRecords.filter(r => r.STATUS === 'Leave').length;
    const halfDays = attendanceRecords.filter(r => r.STATUS === 'Half Day').length;
    const holidayWorkDays = attendanceRecords.filter(r => r.STATUS === 'Holiday Work').length;

    const summaryData = {
      postin_date: postinDate ? new Date(postinDate).toISOString().split('T')[0] : 'N/A',
      counted_days: countedDays,
      allowed_leave_days: parseFloat(allowedLeaveDays.toFixed(4)),
      availed_leave_days: parseFloat(availedLeaveDays.toFixed(4)),
      remaining_leave_days: parseFloat(remainingLeaveDays.toFixed(4)),
      bonus_hours: parseFloat(bonusHours.toFixed(2)),
      earned_leave_days: parseFloat(earnedLeaveDays.toFixed(4)),
      balance_leave_days: parseFloat(balanceLeaveDays.toFixed(4)),
      attendance_summary: {
        total_days: totalDaysInYear,
        present_days: presentDays,
        absent_days: absentDays,
        leave_days: leaveDays,
        half_days: halfDays,
        holiday_work_days: holidayWorkDays
      }
    };

    res.json({
      success: true,
      employee: {
        pak: employee.PAK,
        employee_name: employee.EMPLOYEE_NAME,
        appointment: employee.APPOINTMENT,
        postin_date: postinDate ? new Date(postinDate).toISOString().split('T')[0] : 'N/A'
      },
      year: year,
      attendance_records: attendanceRecords,
      summary: summaryData,
      record_count: attendanceRecords.length,
      generated_at: new Date().toISOString(),
      daily_accumulation_rate: dailyAccumulationRate.toFixed(6)
    });

  } catch (error) {
    console.error('❌ Error fetching employee detail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});






// ================================================
// ATTENDANCE HISTORY MANAGEMENT ROUTES
// ================================================

// Get attendance summary for a specific date (MySQL 5.x compatible)
router.get('/attendance-history/summary/:date', async (req, res) => {
  try {
    const { date } = req.params;

    console.log(`📊 Fetching attendance summary for date: ${date}`);

    // Get total strength (current employees)
    const [totalStrengthResult] = await db.execute(
      `SELECT COUNT(*) as total_strength 
       FROM civ_manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())`,
      []
    );

    const totalStrength = totalStrengthResult[0].total_strength;

    // Get status counts for the date
    const [statusCounts] = await db.execute(
      `SELECT 
        STATUS,
        COUNT(*) as count
       FROM civ_attendence 
       WHERE ATTENDENCE_DATE = ?
       GROUP BY STATUS
       ORDER BY 
         CASE 
           WHEN STATUS = 'Present' THEN 1
           WHEN STATUS = 'Late' THEN 2
           WHEN STATUS = 'Half Day' THEN 3
           WHEN STATUS = 'Leave' THEN 4
           WHEN STATUS = 'Absent' THEN 5
           WHEN STATUS = 'Holiday Work' THEN 6
           ELSE 7
         END`,
      [date]
    );

    // Get deployment-wise summary
    const [deploymentSummary] = await db.execute(
      `SELECT 
        COALESCE(m.DEPLOYMENT, 'Not Assigned') as deployment,
        COUNT(DISTINCT m.PAK) as total_strength,
        SUM(CASE WHEN a.STATUS IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_count
       FROM civ_manpower m
       LEFT JOIN civ_attendence a ON m.PAK = a.PAK AND a.ATTENDENCE_DATE = ?
       WHERE (m.POSTOUT_DATE IS NULL OR m.POSTOUT_DATE > CURDATE())
       GROUP BY COALESCE(m.DEPLOYMENT, 'Not Assigned')
       ORDER BY deployment`,
      [date]
    );

    console.log(`✅ Attendance summary loaded for ${date}`);

    res.json({
      success: true,
      date: date,
      total_strength: totalStrength,
      status_counts: statusCounts,
      deployment_summary: deploymentSummary
    });

  } catch (error) {
    console.error('❌ Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get detailed attendance data by date (MySQL 5.x compatible)
router.get('/attendance-history/detailed/:date', async (req, res) => {
  try {
    const { date } = req.params;

    console.log(`📋 Fetching detailed attendance for date: ${date}`);

    // Get all deployments
    const [deployments] = await db.execute(
      `SELECT DISTINCT COALESCE(DEPLOYMENT, 'Not Assigned') as deployment
       FROM civ_manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
       ORDER BY deployment`,
      []
    );

    const detailedData = [];
    let globalRowNumber = 1;

    for (const deployment of deployments) {
      // MySQL 5.x compatible query without ROW_NUMBER()
      const [employees] = await db.execute(
        `SELECT 
          m.PAK,
          COALESCE(m.APPOINTMENT, 'N/A') as appointment,
          COALESCE(m.EMPLOYEE_NAME, 'Unknown') as employee_name,
          COALESCE(m.DEPLOYMENT, 'Not Assigned') as deployment,
          COALESCE(a.STATUS, 'Absent') as status,
          COALESCE(a.REMARKS, '') as remarks,
          DATE_FORMAT(a.TIME_IN, '%H:%i') as time_in,
          DATE_FORMAT(a.TIME_OUT, '%H:%i') as time_out,
          a.MISSED_HOURS
         FROM civ_manpower m
         LEFT JOIN civ_attendence a ON m.PAK = a.PAK AND a.ATTENDENCE_DATE = ?
         WHERE (m.POSTOUT_DATE IS NULL OR m.POSTOUT_DATE > CURDATE())
           AND COALESCE(m.DEPLOYMENT, 'Not Assigned') = ?
         ORDER BY m.EMPLOYEE_NAME`,
        [date, deployment.deployment]
      );

      if (employees.length > 0) {
        // Add row numbers manually
        const employeesWithRowNumbers = employees.map((employee, index) => ({
          row_number: globalRowNumber++,
          ...employee
        }));

        detailedData.push({
          deployment: deployment.deployment,
          employees: employeesWithRowNumbers
        });
      }
    }

    console.log(`✅ Detailed attendance loaded: ${detailedData.length} deployments, ${globalRowNumber - 1} employees`);

    res.json({
      success: true,
      date: date,
      detailed_data: detailedData,
      total_deployments: detailedData.length,
      total_employees: globalRowNumber - 1
    });

  } catch (error) {
    console.error('❌ Error fetching detailed attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get attendance data for date range - FIXED (LEAVE is reserved keyword)
router.get('/attendance-history/date-range', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    console.log(`📅 Fetching attendance from ${start_date} to ${end_date}`);

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const [attendanceSummary] = await db.execute(
      `SELECT 
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as date,
        COUNT(*) as total_attendance,
        SUM(CASE WHEN STATUS = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN STATUS = 'Late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN STATUS = 'Leave' THEN 1 ELSE 0 END) as \`leave\`,
        SUM(CASE WHEN STATUS = 'Absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN STATUS = 'Half Day' THEN 1 ELSE 0 END) as half_day,
        SUM(CASE WHEN STATUS = 'Holiday Work' THEN 1 ELSE 0 END) as holiday_work
       FROM civ_attendence
       WHERE ATTENDENCE_DATE BETWEEN ? AND ?
       GROUP BY ATTENDENCE_DATE
       ORDER BY ATTENDENCE_DATE DESC`,
      [start_date, end_date]
    );

    res.json({
      success: false,
      summary: attendanceSummary,
      period: { start_date, end_date },
      count: attendanceSummary.length
    });

  } catch (error) {
    console.error('❌ Error fetching attendance date range:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employee attendance history with filters
router.get('/attendance-history/employee-history', async (req, res) => {
  try {
    const { pak, start_date, end_date, status } = req.query;

    console.log(`📋 Fetching employee attendance history for ${pak}`);

    let query = `
      SELECT 
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as date,
        STATUS,
        DATE_FORMAT(TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as time_out,
        MISSED_HOURS,
        REMARKS,
        DAYNAME(ATTENDENCE_DATE) as day_name
      FROM civ_attendence
      WHERE 1=1
    `;

    const params = [];

    if (pak) {
      query += ` AND PAK = ?`;
      params.push(pak);
    }

    if (start_date) {
      query += ` AND ATTENDENCE_DATE >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ATTENDENCE_DATE <= ?`;
      params.push(end_date);
    }

    if (status && status !== 'All') {
      query += ` AND STATUS = ?`;
      params.push(status);
    }

    query += ` ORDER BY ATTENDENCE_DATE DESC`;

    const [attendance] = await db.execute(query, params);

    // Get employee info if PAK is provided
    let employeeInfo = null;
    if (pak) {
      const [employee] = await db.execute(
        `SELECT PAK, EMPLOYEE_NAME, APPOINTMENT, DEPLOYMENT 
         FROM civ_manpower WHERE PAK = ?`,
        [pak]
      );

      if (employee.length > 0) {
        employeeInfo = employee[0];
      }
    }

    res.json({
      success: true,
      attendance: attendance,
      employee_info: employeeInfo,
      count: attendance.length
    });

  } catch (error) {
    console.error('❌ Error fetching employee attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/*
router.get('/manhour-report/employee/:pak/:year', async (req, res) => {
  try {
    const { pak, year } = req.params;
    
    console.log(`📋 Fetching detailed attendance for ${pak} in ${year}`);
    
    // Get employee basic info
    const [employeeInfo] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME, POSTIN_DATE, APPOINTMENT
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );
    
    if (employeeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const employee = employeeInfo[0];
    const postinDate = employee.POSTIN_DATE;
    
    // Calculate counted days for the year
    let countedDays = 0;
    
    if (postinDate) {
      const postinYear = new Date(postinDate).getFullYear();
      const reportYear = parseInt(year);
      
      if (postinYear < reportYear) {
        countedDays = 365;
      } else if (postinYear === reportYear) {
        const postin = new Date(postinDate);
        const yearEnd = new Date(reportYear, 11, 31);
        const diffTime = Math.abs(yearEnd - postin);
        countedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    
    // Get detailed attendance records for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const [attendanceRecords] = await db.execute(
      `SELECT 
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as attendence_date,
        DAYNAME(ATTENDENCE_DATE) as day_name,
        STATUS,
        DATE_FORMAT(TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as time_out,
        MISSED_HOURS,
        REMARKS
       FROM civ_attendence 
       WHERE PAK = ? 
         AND ATTENDENCE_DATE BETWEEN ? AND ?
       ORDER BY ATTENDENCE_DATE DESC`,
      [pak, startDate, endDate]
    );
    
    // Calculate availed leave days (only official leaves)
    let availedLeaveDays = 0;
    
    // Calculate earned leave days from missed_hours (only worked days)
    let totalEarnedHours = 0;
    
    attendanceRecords.forEach(record => {
      const status = record.STATUS;
      const missedHours = parseFloat(record.MISSED_HOURS) || 0;
      
      // Availed leave calculation
      if (status === 'Leave') {
        availedLeaveDays += 1;
      } else if (status === 'Half Day') {
        availedLeaveDays += 0.5;
      }
      
      // Earned leave calculation (skip Leave, Absent, Holiday Work)
      if (status === 'Present' || status === 'Late') {
        totalEarnedHours += missedHours;
      } else if (status === 'Half Day') {
        if (missedHours > 0) {
          totalEarnedHours += missedHours;
        } else if (missedHours < 0) {
          totalEarnedHours += missedHours;
        }
      }
    });
    
    const earnedLeaveDays = totalEarnedHours / 8;
    
    // Calculate allowed leave (20 days per year = 176 hours)
    const allowedLeaveDays = countedDays > 0 ? parseFloat((countedDays * (20 / 365)).toFixed(3)) : 0;
    
    // Calculate remaining
    const remainingLeaveDays = Math.max(0, allowedLeaveDays - availedLeaveDays);
    
    // Fetch bonus days
    const [bonusRecords] = await db.execute(
   `SELECT SUM(BONUS_HOURS) as total_bonus_hours 
   FROM bonus_hours 
   WHERE BONUS_TO = ? 
     AND YEAR(BONUS_DATE) = ?`,
  [pak, year]
);


    
const bonusHours = parseFloat(bonusRecords[0]?.total_bonus_hours || 0);
    
    // Calculate balance
    const balanceLeaveDays = remainingLeaveDays + (bonusHours / 8) + earnedLeaveDays;
    
    // Calculate attendance statistics
    const totalDaysInYear = 365;
    const presentDays = attendanceRecords.filter(r => r.STATUS === 'Present' || r.STATUS === 'Late').length;
    const absentDays = attendanceRecords.filter(r => r.STATUS === 'Absent').length;
    const leaveDays = attendanceRecords.filter(r => r.STATUS === 'Leave').length;
    const halfDays = attendanceRecords.filter(r => r.STATUS === 'Half Day').length;
    const holidayWorkDays = attendanceRecords.filter(r => r.STATUS === 'Holiday Work').length;
    
    const summaryData = {
      postin_date: postinDate ? new Date(postinDate).toISOString().split('T')[0] : 'N/A',
      counted_days: countedDays,
      allowed_leave_days: parseFloat(allowedLeaveDays.toFixed(3)),
      availed_leave_days: parseFloat(availedLeaveDays.toFixed(3)),
      remaining_leave_days: parseFloat(remainingLeaveDays.toFixed(3)),
      bonus_days: parseFloat(bonusDays.toFixed(3)),
      earned_leave_days: parseFloat(earnedLeaveDays.toFixed(3)),
      balance_leave_days: parseFloat(balanceLeaveDays.toFixed(3)),
      attendance_summary: {
        total_days: totalDaysInYear,
        present_days: presentDays,
        absent_days: absentDays,
        leave_days: leaveDays,
        half_days: halfDays,
        holiday_work_days: holidayWorkDays
      }
    };
    
    res.json({
      success: true,
      employee: {
        pak: employee.PAK,
        employee_name: employee.EMPLOYEE_NAME,
        appointment: employee.APPOINTMENT,
        postin_date: postinDate ? new Date(postinDate).toISOString().split('T')[0] : 'N/A'
      },
      year: year,
      attendance_records: attendanceRecords,
      summary: summaryData,
      record_count: attendanceRecords.length,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching employee detail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

*/




// ================================================
// FIXED ATTENDANCE BETWEEN DATES ROUTES
// ================================================


// Get complete employee-wise attendance summary - FIXED COLUMN NAMES
router.get('/attendance-between-dates/complete-summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    console.log(`👥 Fetching COMPLETE employee summary from ${start_date} to ${end_date}`);

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Get total working days in the period
    const [workingDaysResult] = await db.execute(
      `SELECT COUNT(DISTINCT ATTENDENCE_DATE) as total_working_days
       FROM civ_attendence 
       WHERE ATTENDENCE_DATE BETWEEN ? AND ?`,
      [start_date, end_date]
    );

    const totalWorkingDays = workingDaysResult[0]?.total_working_days || 0;

    // Get ALL current employees with their basic info
    const [employees] = await db.execute(
      `SELECT 
        PAK,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(APPOINTMENT, 'N/A') as appointment,
        COALESCE(DEPLOYMENT, 'Not Assigned') as deployment,
        COALESCE(PHONE, 'N/A') as phone,
        COALESCE(EMAIL, 'N/A') as email,
        COALESCE(SECTION, 'N/A') as section
       FROM civ_manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
       ORDER BY EMPLOYEE_NAME`,
      []
    );

    console.log(`Found ${employees.length} current employees`);

    const employeeSummary = [];

    for (const employee of employees) {
      try {
        // Get attendance summary for this employee
        const [attendanceSummary] = await db.execute(
          `SELECT 
            STATUS,
            COUNT(*) as count
           FROM civ_attendence 
           WHERE PAK = ? 
             AND ATTENDENCE_DATE BETWEEN ? AND ?
           GROUP BY STATUS`,
          [employee.PAK, start_date, end_date]
        );

        // Initialize all counts
        let presentCount = 0;
        let lateCount = 0;
        let leaveCount = 0;
        let absentCount = 0;
        let halfDayCount = 0;
        let holidayWorkCount = 0;

        // Sum up counts by status
        attendanceSummary.forEach(item => {
          const count = parseInt(item.count) || 0;
          const status = item.STATUS || '';

          switch (status.toLowerCase()) {
            case 'present':
              presentCount = count;
              break;
            case 'late':
              lateCount = count;
              break;
            case 'leave':
              leaveCount = count;
              break;
            case 'absent':
              absentCount = count;
              break;
            case 'half day':
              halfDayCount = count;
              break;
            case 'holiday work':
              holidayWorkCount = count;
              break;
          }
        });

        const totalPresent = presentCount + lateCount;
        const attendancePercentage = totalWorkingDays > 0
          ? Math.round((totalPresent / totalWorkingDays) * 100)
          : 0;

        // FIXED: Use the correct field names from the database
        employeeSummary.push({
          pak: employee.PAK,
          employee_name: employee.employee_name, // This is from COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name
          deployment: employee.deployment,       // This is from COALESCE(DEPLOYMENT, 'Not Assigned') as deployment
          appointment: employee.appointment,     // This is from COALESCE(APPOINTMENT, 'N/A') as appointment
          phone: employee.PHONE,
          email: employee.EMAIL,
          section: employee.SECTION,
          total_days: totalWorkingDays,
          present_days: presentCount,
          late_days: lateCount,
          leave_days: leaveCount,
          absent_days: absentCount,
          half_day_days: halfDayCount,
          holiday_work_days: holidayWorkCount,
          total_present: totalPresent,
          attendance_percentage: `${attendancePercentage}%`
        });

      } catch (empError) {
        console.error(`Error processing employee ${employee.PAK}:`, empError);
        // Add employee with zero counts if there's an error
        employeeSummary.push({
          pak: employee.PAK,
          employee_name: employee.employee_name || 'Unknown',
          deployment: employee.deployment || 'Not Assigned',
          appointment: employee.appointment || 'N/A',
          phone: employee.PHONE || 'N/A',
          email: employee.EMAIL || 'N/A',
          section: employee.SECTION || 'N/A',
          total_days: totalWorkingDays,
          present_days: 0,
          late_days: 0,
          leave_days: 0,
          absent_days: 0,
          half_day_days: 0,
          holiday_work_days: 0,
          total_present: 0,
          attendance_percentage: '0%'
        });
      }
    }

    // Calculate overall summary
    let totalPresent = 0;
    let totalLeave = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalLate = 0;
    let totalHolidayWork = 0;

    employeeSummary.forEach(emp => {
      totalPresent += emp.present_days || 0;
      totalLate += emp.late_days || 0;
      totalLeave += emp.leave_days || 0;
      totalAbsent += emp.absent_days || 0;
      totalHalfDay += emp.half_day_days || 0;
      totalHolidayWork += emp.holiday_work_days || 0;
    });

    const totalRecords = totalPresent + totalLate + totalLeave + totalAbsent + totalHalfDay + totalHolidayWork;

    // Calculate average attendance across all employees
    const totalAttendancePercent = employeeSummary.reduce((sum, emp) => {
      const percentStr = emp.attendance_percentage || '0%';
      const percent = parseFloat(percentStr.replace('%', '')) || 0;
      return sum + percent;
    }, 0);

    const averageAttendance = employeeSummary.length > 0
      ? Math.round(totalAttendancePercent / employeeSummary.length)
      : 0;

    const summaryData = {
      totalEmployees: employeeSummary.length,
      totalWorkingDays: totalWorkingDays,
      averageAttendance: `${averageAttendance}%`,
      statusSummary: [
        { status: 'Present', count: totalPresent, percentage: `${Math.round((totalPresent / totalRecords) * 100) || 0}%` },
        { status: 'Late', count: totalLate, percentage: `${Math.round((totalLate / totalRecords) * 100) || 0}%` },
        { status: 'Leave', count: totalLeave, percentage: `${Math.round((totalLeave / totalRecords) * 100) || 0}%` },
        { status: 'Absent', count: totalAbsent, percentage: `${Math.round((totalAbsent / totalRecords) * 100) || 0}%` },
        { status: 'Half Day', count: totalHalfDay, percentage: `${Math.round((totalHalfDay / totalRecords) * 100) || 0}%` },
        { status: 'Holiday Work', count: totalHolidayWork, percentage: `${Math.round((totalHolidayWork / totalRecords) * 100) || 0}%` }
      ].filter(item => item.count > 0)
    };

    console.log(`✅ Generated COMPLETE summary for ${employeeSummary.length} employees`);
    console.log('Sample employee data:', employeeSummary[0]);

    res.json({
      success: true,
      employee_summary: employeeSummary,
      overall_summary: summaryData,
      total_employees: employeeSummary.length,
      total_working_days: totalWorkingDays,
      period: { start_date, end_date },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching complete employee summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Get COMPLETE employee attendance detail with all fields - IMPROVED
router.get('/attendance-between-dates/complete-employee-detail/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    const { start_date, end_date } = req.query;

    console.log(`📋 Fetching COMPLETE detail for ${pak} from ${start_date} to ${end_date}`);

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // First, let's debug what we're receiving
    console.log('Received parameters:', { pak, start_date, end_date });

    // Get complete employee info
    const [employeeInfo] = await db.execute(
      `SELECT 
        PAK,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(APPOINTMENT, 'N/A') as appointment,
        COALESCE(DEPLOYMENT, 'Not Assigned') as deployment,
        COALESCE(PHONE, 'N/A') as phone,
        COALESCE(EMAIL, 'N/A') as email,
        COALESCE(SECTION, 'N/A') as section,
        COALESCE(CNIC, 'N/A') as cnic,
        COALESCE(BLOOD_GROUP, 'N/A') as blood_group
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (employeeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with PAK: ${pak}`
      });
    }

    const employee = employeeInfo[0];
    console.log('Found employee:', employee);

    // Get COMPLETE attendance records - FIXED QUERY
    const [attendanceRecords] = await db.execute(
      `SELECT 
        ATTENDENCE_ID,
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as date,
        DAYNAME(ATTENDENCE_DATE) as day_name,
        STATUS,
        DATE_FORMAT(TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as time_out,
        MISSED_HOURS,
        REMARKS
       FROM civ_attendence 
       WHERE PAK = ? 
         AND DATE(ATTENDENCE_DATE) BETWEEN DATE(?) AND DATE(?)
       ORDER BY ATTENDENCE_DATE ASC`,
      [pak, start_date, end_date]
    );

    console.log(`Found ${attendanceRecords.length} attendance records for ${pak}`);

    // If no records found, check if there are any records at all for this employee
    if (attendanceRecords.length === 0) {
      const [allRecords] = await db.execute(
        `SELECT 
          COUNT(*) as total_records,
          MIN(DATE(ATTENDENCE_DATE)) as earliest_date,
          MAX(DATE(ATTENDENCE_DATE)) as latest_date
         FROM civ_attendence 
         WHERE PAK = ?`,
        [pak]
      );

      console.log(`Debug info for ${pak}:`, allRecords[0]);
    }

    // Calculate summary
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let holidayWorkCount = 0;
    let totalMissedHours = 0;
    let totalExtraHours = 0;

    attendanceRecords.forEach(record => {
      const status = record.STATUS || '';
      const missedHours = parseFloat(record.MISSED_HOURS) || 0;

      switch (status.toLowerCase()) {
        case 'present':
          presentCount++;
          if (missedHours > 0) totalExtraHours += missedHours;
          else if (missedHours < 0) totalMissedHours += Math.abs(missedHours);
          break;
        case 'late':
          lateCount++;
          if (missedHours > 0) totalExtraHours += missedHours;
          else if (missedHours < 0) totalMissedHours += Math.abs(missedHours);
          break;
        case 'leave':
          leaveCount++;
          totalMissedHours += Math.abs(missedHours);
          break;
        case 'absent':
          absentCount++;
          totalMissedHours += Math.abs(missedHours);
          break;
        case 'half day':
          halfDayCount++;
          totalMissedHours += Math.abs(missedHours);
          break;
        case 'holiday work':
          holidayWorkCount++;
          totalExtraHours += Math.abs(missedHours);
          break;
      }
    });

    const totalDays = attendanceRecords.length;
    const totalPresent = presentCount + lateCount;
    const attendancePercentage = totalDays > 0
      ? Math.round((totalPresent / totalDays) * 100)
      : 0;

    // Also get date range info
    const [dateRangeInfo] = await db.execute(
      `SELECT 
        COUNT(DISTINCT DATE(ATTENDENCE_DATE)) as working_days_count,
        MIN(DATE(ATTENDENCE_DATE)) as first_working_day,
        MAX(DATE(ATTENDENCE_DATE)) as last_working_day
       FROM civ_attendence 
       WHERE DATE(ATTENDENCE_DATE) BETWEEN DATE(?) AND DATE(?)`,
      [start_date, end_date]
    );

    const summary = {
      total_days: totalDays,
      present_days: presentCount,
      late_days: lateCount,
      leave_days: leaveCount,
      absent_days: absentCount,
      half_day_days: halfDayCount,
      holiday_work_days: holidayWorkCount,
      total_present: totalPresent,
      attendance_percentage: `${attendancePercentage}%`,
      total_missed_hours: parseFloat(totalMissedHours.toFixed(2)),
      total_extra_hours: parseFloat(totalExtraHours.toFixed(2)),
      net_hours: parseFloat((totalExtraHours - totalMissedHours).toFixed(2))
    };

    res.json({
      success: true,
      employee: {
        pak: employee.PAK,
        employee_name: employee.employee_name,
        appointment: employee.appointment,
        deployment: employee.deployment,
        phone: employee.PHONE,
        email: employee.EMAIL,
        section: employee.SECTION,
        cnic: employee.CNIC,
        blood_group: employee.BLOOD_GROUP
      },
      attendance_records: attendanceRecords,
      summary: summary,
      date_range_info: dateRangeInfo[0] || {
        working_days_count: 0,
        first_working_day: start_date,
        last_working_day: end_date
      },
      record_count: attendanceRecords.length,
      period: { start_date, end_date },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching complete employee detail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
      error_details: error
    });
  }
});

// New endpoint to get ALL attendance records for an employee (no date filter)
router.get('/attendance-between-dates/all-employee-records/:pak', async (req, res) => {
  try {
    const { pak } = req.params;

    console.log(`📋 Fetching ALL records for ${pak}`);

    // Get employee info
    const [employeeInfo] = await db.execute(
      `SELECT 
        PAK,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(APPOINTMENT, 'N/A') as appointment,
        COALESCE(DEPLOYMENT, 'Not Assigned') as deployment
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (employeeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with PAK: ${pak}`
      });
    }

    const employee = employeeInfo[0];

    // Get ALL attendance records (last 100)
    const [attendanceRecords] = await db.execute(
      `SELECT 
        ATTENDENCE_ID,
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as date,
        DAYNAME(ATTENDENCE_DATE) as day_name,
        STATUS,
        DATE_FORMAT(TIME_IN, '%H:%i') as time_in,
        DATE_FORMAT(TIME_OUT, '%H:%i') as time_out,
        MISSED_HOURS,
        REMARKS
       FROM civ_attendence 
       WHERE PAK = ? 
       ORDER BY ATTENDENCE_DATE DESC`,
      [pak]
    );

    console.log(`Found ${attendanceRecords.length} total records for ${pak}`);

    // Calculate total stats
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let holidayWorkCount = 0;

    attendanceRecords.forEach(record => {
      const status = record.STATUS || '';

      switch (status.toLowerCase()) {
        case 'present':
          presentCount++;
          break;
        case 'late':
          lateCount++;
          break;
        case 'leave':
          leaveCount++;
          break;
        case 'absent':
          absentCount++;
          break;
        case 'half day':
          halfDayCount++;
          break;
        case 'holiday work':
          holidayWorkCount++;
          break;
      }
    });

    const totalDays = attendanceRecords.length;
    const totalPresent = presentCount + lateCount;
    const attendancePercentage = totalDays > 0
      ? Math.round((totalPresent / totalDays) * 100)
      : 0;

    res.json({
      success: true,
      employee: {
        pak: employee.PAK,
        employee_name: employee.employee_name,
        appointment: employee.appointment,
        deployment: employee.deployment
      },
      attendance_records: attendanceRecords,
      summary: {
        total_days: totalDays,
        present_days: presentCount,
        late_days: lateCount,
        leave_days: leaveCount,
        absent_days: absentCount,
        half_day_days: halfDayCount,
        holiday_work_days: holidayWorkCount,
        total_present: totalPresent,
        attendance_percentage: `${attendancePercentage}%`
      },
      record_count: attendanceRecords.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching all employee records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Test endpoint to check attendance data
router.get('/test-attendance-data', async (req, res) => {
  try {
    const { pak, start_date, end_date } = req.query;

    console.log('Testing attendance data for:', { pak, start_date, end_date });

    // Check if employee exists
    const [employee] = await db.execute(
      `SELECT PAK, EMPLOYEE_NAME FROM civ_manpower WHERE PAK = ?`,
      [pak]
    );

    if (employee.length === 0) {
      return res.json({
        success: false,
        message: `Employee ${pak} not found`
      });
    }

    // Check attendance table structure
    const [attendanceStructure] = await db.execute(
      `SHOW COLUMNS FROM civ_attendence`
    );

    // Check sample attendance data
    const [attendanceData] = await db.execute(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT PAK) as unique_employees,
        MIN(DATE(ATTENDENCE_DATE)) as earliest_date,
        MAX(DATE(ATTENDENCE_DATE)) as latest_date
       FROM civ_attendence`
    );

    // Check specific employee data
    const [employeeAttendance] = await db.execute(
      `SELECT 
        PAK,
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as date,
        STATUS,
        DATE_FORMAT(TIME_IN, '%H:%i') as time_in
       FROM civ_attendence 
       WHERE PAK = ?
       ORDER BY ATTENDENCE_DATE DESC`,
      [pak]
    );

    res.json({
      success: true,
      employee: employee[0],
      attendance_structure: attendanceStructure,
      overall_stats: attendanceData[0],
      employee_attendance: employeeAttendance,
      query_test: {
        pak_used: pak,
        date_range_used: `${start_date} to ${end_date}`,
        total_records_found: employeeAttendance.length
      }
    });

  } catch (error) {
    console.error('Error testing attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});


















// ================================================
// COMPLETE LATE TREND ANALYSIS WITH REMARKS-BASED SHORT LEAVE HANDLING
// ================================================

// Get detailed late trend analysis with employee photos and day-wise breakdown
router.get('/attendance/late-trend/complete-analysis', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    console.log(`📊 Complete late analysis from ${start_date} to ${end_date}`);

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // 1. Get working hours from time table
    const [workHours] = await db.execute(
      `SELECT 
        TIME_IN,
        TIME_OUT,
        DATE_FORMAT(TIME_IN, '%H:%i:%s') as official_start,
        DATE_FORMAT(TIME_OUT, '%H:%i:%s') as official_end
       FROM time 
       ORDER BY TIME_IN DESC 
       LIMIT 1`
    );

    const officialStart = workHours[0]?.official_start || '09:00:00';
    const officialEnd = workHours[0]?.official_end || '17:00:00';
    const gracePeriod = 15; // 15 minutes grace period

    console.log(`Official hours: ${officialStart} to ${officialEnd}`);

    // Function to check if remarks indicate short leave
    const isShortLeaveRemarks = (remarks) => {
      if (!remarks) return false;
      
      const remarksLower = remarks.toLowerCase().trim();
      const shortLeaveKeywords = [
        'short leave', 'shortleave', 's.leave', 'sl', 
        'leave', 'half day', 'half-day', 'halfday',
        'personal leave', 'casual leave', 'emergency leave'
      ];
      
      return shortLeaveKeywords.some(keyword => 
        remarksLower.includes(keyword.toLowerCase())
      );
    };

    // 2. Get all current employees with basic info
    const [allEmployees] = await db.execute(
      `SELECT 
        m.PAK,
        m.EMPLOYEE_NAME,
        m.APPOINTMENT,
        COALESCE(m.DEPLOYMENT, 'Not Assigned') as DEPARTMENT,
        m.SECTION,
        m.PHONE,
        m.EMAIL,
        m.PICTURE,
        (SELECT COUNT(*) FROM civ_attendence a 
         WHERE a.PAK = m.PAK 
           AND a.ATTENDENCE_DATE BETWEEN ? AND ?
           AND a.STATUS NOT IN ('Absent', 'Leave', 'Holiday Work')
           AND a.TIME_IN IS NOT NULL) as total_attendance_days
       FROM civ_manpower m
       WHERE (m.POSTOUT_DATE IS NULL OR m.POSTOUT_DATE > CURDATE())
       ORDER BY m.EMPLOYEE_NAME`,
      [start_date, end_date]
    );

    console.log(`Found ${allEmployees.length} current employees`);

    // 3. Get all attendance records in the date range
    const [attendanceRecords] = await db.execute(
      `SELECT 
        a.PAK,
        DATE_FORMAT(a.ATTENDENCE_DATE, '%Y-%m-%d') as ATTENDENCE_DATE,
        DAYNAME(a.ATTENDENCE_DATE) as DAY_NAME,
        a.STATUS,
        a.TIME_IN,
        a.TIME_OUT,
        a.MISSED_HOURS,
        a.REMARKS,
        DATE_FORMAT(a.TIME_IN, '%H:%i:%s') as TIME_IN_STR,
        DATE_FORMAT(a.TIME_OUT, '%H:%i:%s') as TIME_OUT_STR
       FROM civ_attendence a
       WHERE a.ATTENDENCE_DATE BETWEEN ? AND ?
         AND a.STATUS NOT IN ('Absent', 'Leave', 'Holiday Work')
         AND a.TIME_IN IS NOT NULL
       ORDER BY a.ATTENDENCE_DATE, a.PAK`,
      [start_date, end_date]
    );

    console.log(`Found ${attendanceRecords.length} attendance records`);

    // 4. Calculate late arrivals for each employee with short leave detection
    const employeeAnalysis = [];
    const dayWiseStats = {
      'Monday': { late_count: 0, early_count: 0, total_instances: 0, short_leave_days: 0 },
      'Tuesday': { late_count: 0, early_count: 0, total_instances: 0, short_leave_days: 0 },
      'Wednesday': { late_count: 0, early_count: 0, total_instances: 0, short_leave_days: 0 },
      'Thursday': { late_count: 0, early_count: 0, total_instances: 0, short_leave_days: 0 },
      'Friday': { late_count: 0, early_count: 0, total_instances: 0, short_leave_days: 0 },
      'Saturday': { late_count: 0, early_count: 0, total_instances: 0, short_leave_days: 0 },
      'Sunday': { late_count: 0, early_count: 0, total_instances: 0, short_leave_days: 0 }
    };

    for (const employee of allEmployees) {
      const employeeRecords = attendanceRecords.filter(record => record.PAK === employee.PAK);
      
      let lateArrivals = [];
      let earlyLeaving = [];
      let shortLeaveDays = [];
      let totalLateMinutes = 0;
      let totalEarlyMinutes = 0;
      
      // Parse official start time
      const [officialHour, officialMinute] = officialStart.split(':').map(Number);
      const officialStartMinutes = officialHour * 60 + officialMinute;
      
      // Parse official end time for early leaving
      const [officialEndHour, officialEndMinute] = officialEnd.split(':').map(Number);
      const officialEndMinutes = officialEndHour * 60 + officialEndMinute;

      // Process each attendance record
      employeeRecords.forEach(record => {
        const dayName = record.DAY_NAME;
        
        // Check if remarks indicate short leave
        const isShortLeaveDay = isShortLeaveRemarks(record.REMARKS);
        
        if (isShortLeaveDay) {
          // Track short leave days but don't calculate late/early
          shortLeaveDays.push({
            date: record.ATTENDENCE_DATE,
            day_name: dayName,
            remarks: record.REMARKS
          });
          
          dayWiseStats[dayName].short_leave_days++;
          return; // Skip late/early calculation for this day
        }
        
        // Calculate late arrival (only if not short leave)
        if (record.TIME_IN_STR) {
          const [actualHour, actualMinute] = record.TIME_IN_STR.split(':').map(Number);
          const actualStartMinutes = actualHour * 60 + actualMinute;
          
          if (actualStartMinutes > (officialStartMinutes + gracePeriod)) {
            const lateMinutes = actualStartMinutes - (officialStartMinutes + gracePeriod);
            
            lateArrivals.push({
              date: record.ATTENDENCE_DATE,
              day_name: dayName,
              time_in: record.TIME_IN_STR,
              late_minutes: lateMinutes,
              type: 'Late Arrival',
              remarks: record.REMARKS,
              is_short_leave: false
            });
            
            totalLateMinutes += lateMinutes;
            dayWiseStats[dayName].late_count++;
            dayWiseStats[dayName].total_instances++;
          }
        }
        
        // Calculate early leaving (only if not short leave)
        if (record.TIME_OUT_STR && record.TIME_OUT_STR !== '00:00:00') {
          const [outHour, outMinute] = record.TIME_OUT_STR.split(':').map(Number);
          const actualEndMinutes = outHour * 60 + outMinute;
          
          if (actualEndMinutes < (officialEndMinutes )) { 
            const earlyMinutes = (officialEndMinutes) - actualEndMinutes;
            
            earlyLeaving.push({
              date: record.ATTENDENCE_DATE,
              day_name: dayName,
              time_out: record.TIME_OUT_STR,
              early_minutes: earlyMinutes,
              type: 'Early Leaving',
              remarks: record.REMARKS,
              is_short_leave: false
            });
            
            totalEarlyMinutes += earlyMinutes;
            dayWiseStats[dayName].early_count++;
            dayWiseStats[dayName].total_instances++;
          }
        }
      });

      const totalLateInstances = lateArrivals.length;
      const totalEarlyInstances = earlyLeaving.length;
      const totalShortLeaveDays = shortLeaveDays.length;
      const totalInstances = totalLateInstances + totalEarlyInstances;
      
      // Find most frequent late day
      const lateDaysCount = {};
      lateArrivals.forEach(arrival => {
        lateDaysCount[arrival.day_name] = (lateDaysCount[arrival.day_name] || 0) + 1;
      });
      
      let mostFrequentLateDay = 'None';
      let maxLateDays = 0;
      Object.entries(lateDaysCount).forEach(([day, count]) => {
        if (count > maxLateDays) {
          maxLateDays = count;
          mostFrequentLateDay = day;
        }
      });

      // Find most frequent early day
      const earlyDaysCount = {};
      earlyLeaving.forEach(leaving => {
        earlyDaysCount[leaving.day_name] = (earlyDaysCount[leaving.day_name] || 0) + 1;
      });
      
      let mostFrequentEarlyDay = 'None';
      let maxEarlyDays = 0;
      Object.entries(earlyDaysCount).forEach(([day, count]) => {
        if (count > maxEarlyDays) {
          maxEarlyDays = count;
          mostFrequentEarlyDay = day;
        }
      });

      // Determine trend
      let trend = 'stable';
      if (totalInstances === 0 && totalShortLeaveDays === 0) trend = 'none';
      else if (totalInstances > 10) trend = 'high';
      else if (totalInstances > 5) trend = 'increasing';
      else if (totalShortLeaveDays > 0) trend = 'with_short_leave';
      
      // Calculate severity (excluding short leave days)
      let severity = 'none';
      if (totalLateInstances === 0 && totalEarlyInstances === 0) severity = 'none';
      else if (totalLateInstances >= 5 || totalEarlyInstances >= 5) severity = 'high';
      else if (totalLateInstances >= 3 || totalEarlyInstances >= 3) severity = 'medium';
      else severity = 'low';

      employeeAnalysis.push({
        pak: employee.PAK,
        employee_name: employee.EMPLOYEE_NAME,
        appointment: employee.APPOINTMENT,
        department: employee.DEPLOYMENT,
        section: employee.SECTION,
        phone: employee.PHONE,
        email: employee.EMAIL,
        has_photo: employee.PICTURE ? true : false,
        total_attendance_days: employee.total_attendance_days || 0,
        
        // Short Leave Stats
        short_leave_days: {
          total_days: totalShortLeaveDays,
          records: shortLeaveDays.slice(0, 5) // Show recent 5 short leave days
        },
        
        // Late Arrival Stats
        late_arrivals: {
          total_instances: totalLateInstances,
          total_minutes: totalLateMinutes,
          average_minutes: totalLateInstances > 0 ? (totalLateMinutes / totalLateInstances).toFixed(1) : 0,
          most_frequent_day: mostFrequentLateDay,
          records: lateArrivals.slice(0, 10)
        },
        
        // Early Leaving Stats
        early_leaving: {
          total_instances: totalEarlyInstances,
          total_minutes: totalEarlyMinutes,
          average_minutes: totalEarlyInstances > 0 ? (totalEarlyMinutes / totalEarlyInstances).toFixed(1) : 0,
          most_frequent_day: mostFrequentEarlyDay,
          records: earlyLeaving.slice(0, 10)
        },
        
        // Combined Stats
        total_instances: totalInstances,
        total_minutes: totalLateMinutes + totalEarlyMinutes,
        average_minutes: totalInstances > 0 ? ((totalLateMinutes + totalEarlyMinutes) / totalInstances).toFixed(1) : 0,
        
        trend: trend,
        severity: severity,
        has_short_leave: totalShortLeaveDays > 0
      });
    }

    // 5. Sort employees by total late+early instances
    const sortedEmployees = employeeAnalysis
      .filter(emp => emp.total_instances > 0 || emp.has_short_leave)
      .sort((a, b) => b.total_instances - a.total_instances);

    // Get top 8 employees for the banner
    const topEmployees = sortedEmployees.slice(0, 8);

    // 6. Calculate overall statistics
    const allLateInstances = sortedEmployees.reduce((sum, emp) => sum + emp.late_arrivals.total_instances, 0);
    const allEarlyInstances = sortedEmployees.reduce((sum, emp) => sum + emp.early_leaving.total_instances, 0);
    const allShortLeaveDays = sortedEmployees.reduce((sum, emp) => sum + emp.short_leave_days.total_days, 0);
    const allTotalInstances = allLateInstances + allEarlyInstances;
    
    const avgLateMinutes = allLateInstances > 0 ? 
      (sortedEmployees.reduce((sum, emp) => sum + emp.late_arrivals.total_minutes, 0) / allLateInstances).toFixed(1) : 0;
    
    const avgEarlyMinutes = allEarlyInstances > 0 ? 
      (sortedEmployees.reduce((sum, emp) => sum + emp.early_leaving.total_minutes, 0) / allEarlyInstances).toFixed(1) : 0;

    // 7. Find peak day
    let peakDay = 'None';
    let peakDayCount = 0;
    Object.entries(dayWiseStats).forEach(([day, stats]) => {
      if (stats.total_instances > peakDayCount) {
        peakDayCount = stats.total_instances;
        peakDay = day;
      }
    });

    // 8. Prepare response
    const response = {
      success: true,
      work_hours: {
        official_start: officialStart,
        official_end: officialEnd,
        grace_period: gracePeriod,
        early_buffer: 15
      },
      
      period: {
        start_date: start_date,
        end_date: end_date,
        days: Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1
      },
      
      summary: {
        total_employees_analyzed: allEmployees.length,
        employees_with_issues: sortedEmployees.length,
        total_late_arrivals: allLateInstances,
        total_early_leaving: allEarlyInstances,
        total_short_leave_days: allShortLeaveDays,
        total_instances: allTotalInstances,
        average_late_minutes: avgLateMinutes,
        average_early_minutes: avgEarlyMinutes,
        peak_day: peakDay,
        peak_day_count: peakDayCount
      },
      
      day_wise_analysis: dayWiseStats,
      
      top_employees: topEmployees.map((emp, index) => ({
        rank: index + 1,
        pak: emp.pak,
        employee_name: emp.employee_name,
        department: emp.DEPLOYMENT,
        total_instances: emp.total_instances,
        late_arrivals: emp.late_arrivals.total_instances,
        early_leaving: emp.early_leaving.total_instances,
        short_leave_days: emp.short_leave_days.total_days,
        has_photo: emp.has_photo
      })),
      
      all_employees: sortedEmployees,
      
      short_leave_detection: {
        method: 'remarks_based',
        keywords_used: ['short leave', 'shortleave', 's.leave', 'sl', 'leave', 'half day', 'half-day', 'halfday'],
        note: 'Days with short leave remarks are excluded from late/early calculations'
      },
      
      generated_at: new Date().toISOString(),
      record_count: {
        employees: sortedEmployees.length,
        total_records: allTotalInstances,
        short_leave_records: allShortLeaveDays
      }
    };

    console.log(`✅ Complete analysis generated: ${sortedEmployees.length} employees with issues, ${allTotalInstances} total instances, ${allShortLeaveDays} short leave days`);

    res.json(response);

  } catch (error) {
    console.error('❌ Error in complete late analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
      error_details: error.message
    });
  }
});

// Get employee late/early details with pagination and short leave detection
router.get('/attendance/late-trend/employee-details/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    const { start_date, end_date, type = 'all', page = 1, limit = 10 } = req.query;

    console.log(`📋 Fetching details for ${pak}, type: ${type}`);

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Function to check if remarks indicate short leave
    const isShortLeaveRemarks = (remarks) => {
      if (!remarks) return false;
      
      const remarksLower = remarks.toLowerCase().trim();
      const shortLeaveKeywords = [
        'short leave', 'shortleave', 's.leave', 'sl', 
        'leave', 'half day', 'half-day', 'halfday',
        'personal leave', 'casual leave', 'emergency leave'
      ];
      
      return shortLeaveKeywords.some(keyword => 
        remarksLower.includes(keyword.toLowerCase())
      );
    };

    // Get employee info
    const [employeeInfo] = await db.execute(
      `SELECT 
        PAK,
        EMPLOYEE_NAME,
        APPOINTMENT,
        DEPLOYMENT,
        SECTION,
        PHONE,
        EMAIL,
        PICTURE
       FROM civ_manpower 
       WHERE PAK = ?`,
      [pak]
    );

    if (employeeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const employee = employeeInfo[0];

    // Get working hours
    const [workHours] = await db.execute(
      `SELECT 
        DATE_FORMAT(TIME_IN, '%H:%i:%s') as official_start,
        DATE_FORMAT(TIME_OUT, '%H:%i:%s') as official_end
       FROM time 
       ORDER BY TIME_IN DESC 
       LIMIT 1`
    );

    const officialStart = workHours[0]?.official_start || '09:00:00';
    const officialEnd = workHours[0]?.official_end || '17:00:00';
    const gracePeriod = 15;

    // Parse official times
    const [officialHour, officialMinute] = officialStart.split(':').map(Number);
    const officialStartMinutes = officialHour * 60 + officialMinute;
    
    const [officialEndHour, officialEndMinute] = officialEnd.split(':').map(Number);
    const officialEndMinutes = officialEndHour * 60 + officialEndMinute;

    // Build query
    const query = `
      SELECT 
        ATTENDENCE_ID,
        DATE_FORMAT(ATTENDENCE_DATE, '%Y-%m-%d') as date,
        DAYNAME(ATTENDENCE_DATE) as day_name,
        STATUS,
        TIME_IN,
        TIME_OUT,
        DATE_FORMAT(TIME_IN, '%H:%i:%s') as time_in_str,
        DATE_FORMAT(TIME_OUT, '%H:%i:%s') as time_out_str,
        MISSED_HOURS,
        REMARKS
      FROM civ_attendence 
      WHERE PAK = ? 
        AND ATTENDENCE_DATE BETWEEN ? AND ?
        AND STATUS NOT IN ('Absent', 'Leave', 'Holiday Work')
        AND TIME_IN IS NOT NULL
      ORDER BY ATTENDENCE_DATE DESC
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    const params = [pak, start_date, end_date, parseInt(limit), offset];

    // Get total count
    const [totalCountResult] = await db.execute(
      `SELECT COUNT(*) as total 
       FROM civ_attendence 
       WHERE PAK = ? 
         AND ATTENDENCE_DATE BETWEEN ? AND ?
         AND STATUS NOT IN ('Absent', 'Leave', 'Holiday Work')
         AND TIME_IN IS NOT NULL`,
      [pak, start_date, end_date]
    );

    const totalCount = totalCountResult[0].total;

    const [attendanceRecords] = await db.execute(query, params);

    // Process records with short leave detection
    const processedRecords = [];
    const shortLeaveRecords = [];
    let lateCount = 0;
    let earlyCount = 0;
    let totalLateMinutes = 0;
    let totalEarlyMinutes = 0;

    attendanceRecords.forEach(record => {
      // Check if remarks indicate short leave
      const isShortLeaveDay = isShortLeaveRemarks(record.REMARKS);
      
      if (isShortLeaveDay) {
        shortLeaveRecords.push({
          ...record,
          is_late: false,
          is_early: false,
          late_minutes: 0,
          early_minutes: 0,
          issue_type: 'Short Leave',
          is_short_leave: true,
          total_effect_minutes: 0
        });
        return; // Skip late/early calculation
      }
      
      let isLate = false;
      let isEarly = false;
      let lateMinutes = 0;
      let earlyMinutes = 0;
      let issueType = 'None';

      // Check late arrival
      if (record.time_in_str) {
        const [actualHour, actualMinute] = record.time_in_str.split(':').map(Number);
        const actualStartMinutes = actualHour * 60 + actualMinute;
        
        if (actualStartMinutes > (officialStartMinutes + gracePeriod)) {
          isLate = true;
          lateMinutes = actualStartMinutes - (officialStartMinutes + gracePeriod);
          issueType = 'Late Arrival';
          lateCount++;
          totalLateMinutes += lateMinutes;
        }
      }

      // Check early leaving
      if (record.time_out_str && record.time_out_str !== '00:00:00') {
        const [outHour, outMinute] = record.time_out_str.split(':').map(Number);
        const actualEndMinutes = outHour * 60 + outMinute;
        
        if (actualEndMinutes < (officialEndMinutes )) {
          isEarly = true;
          earlyMinutes = (officialEndMinutes ) - actualEndMinutes;
          issueType = isLate ? 'Both Late & Early' : 'Early Leaving';
          earlyCount++;
          totalEarlyMinutes += earlyMinutes;
        }
      }

      processedRecords.push({
        ...record,
        is_late: isLate,
        is_early: isEarly,
        late_minutes: lateMinutes,
        early_minutes: earlyMinutes,
        issue_type: issueType,
        is_short_leave: false,
        total_effect_minutes: lateMinutes + earlyMinutes
      });
    });

    // Combine regular and short leave records if needed
    let filteredRecords = [];
    if (type === 'all') {
      filteredRecords = [...processedRecords, ...shortLeaveRecords].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
    } else if (type === 'short_leave') {
      filteredRecords = shortLeaveRecords;
    } else {
      filteredRecords = processedRecords.filter(record => 
        (type === 'late' && record.is_late) || 
        (type === 'early' && record.is_early) ||
        (type === 'both' && (record.is_late || record.is_early))
      );
    }

    // Calculate day-wise distribution
    const dayDistribution = {
      'Monday': { late: 0, early: 0, short_leave: 0, total: 0 },
      'Tuesday': { late: 0, early: 0, short_leave: 0, total: 0 },
      'Wednesday': { late: 0, early: 0, short_leave: 0, total: 0 },
      'Thursday': { late: 0, early: 0, short_leave: 0, total: 0 },
      'Friday': { late: 0, early: 0, short_leave: 0, total: 0 },
      'Saturday': { late: 0, early: 0, short_leave: 0, total: 0 },
      'Sunday': { late: 0, early: 0, short_leave: 0, total: 0 }
    };

    filteredRecords.forEach(record => {
      if (record.day_name && dayDistribution[record.day_name]) {
        if (record.is_late) {
          dayDistribution[record.day_name].late++;
          dayDistribution[record.day_name].total++;
        }
        if (record.is_early) {
          dayDistribution[record.day_name].early++;
          dayDistribution[record.day_name].total++;
        }
        if (record.is_short_leave) {
          dayDistribution[record.day_name].short_leave++;
          dayDistribution[record.day_name].total++;
        }
      }
    });

    // Find most frequent day
    let mostFrequentDay = 'None';
    let maxCount = 0;
    Object.entries(dayDistribution).forEach(([day, stats]) => {
      if (stats.total > maxCount) {
        maxCount = stats.total;
        mostFrequentDay = day;
      }
    });

    const response = {
      success: true,
      employee: {
        pak: employee.PAK,
        employee_name: employee.EMPLOYEE_NAME,
        appointment: employee.APPOINTMENT,
        department: employee.DEPLOYMENT,
        section: employee.SECTION,
        has_photo: employee.PICTURE ? true : false
      },
      work_hours: {
        official_start: officialStart,
        official_end: officialEnd,
        grace_period: gracePeriod
      },
      period: { start_date, end_date },
      statistics: {
        total_records: filteredRecords.length,
        late_arrivals: lateCount,
        early_leaving: earlyCount,
        short_leave_days: shortLeaveRecords.length,
        total_instances: lateCount + earlyCount + shortLeaveRecords.length,
        average_late_minutes: lateCount > 0 ? (totalLateMinutes / lateCount).toFixed(1) : 0,
        average_early_minutes: earlyCount > 0 ? (totalEarlyMinutes / earlyCount).toFixed(1) : 0,
        most_frequent_day: mostFrequentDay,
        day_distribution: dayDistribution
      },
      records: filteredRecords,
      short_leave_info: {
        detection_method: 'remarks_based',
        total_days: shortLeaveRecords.length,
        sample_remarks: shortLeaveRecords.slice(0, 3).map(r => r.REMARKS)
      },
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_records: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    };

    console.log(`✅ Employee details fetched: ${filteredRecords.length} records for ${pak}, including ${shortLeaveRecords.length} short leave days`);

    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching employee details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});



































// ================================================
// CREATE NEW CIV EMPLOYEE AND UPDATE PROFILE RECORD ROUTES
// ================================================
// Create new employee
router.post('/create', async (req, res) => {
  let connection;
  try {
    const employeeData = req.body;

    console.log(`📝 Creating new employee: ${employeeData.employee_name}`);
    console.log('Employee data:', employeeData);

    // Validate required fields
    if (!employeeData.pak || !employeeData.employee_name || !employeeData.appointment || !employeeData.cnic) {
      return res.status(400).json({
        success: false,
        message: 'PAK, Employee Name, Appointment, and CNIC are required'
      });
    }

    // Check if PAK already exists
    const [existingPAK] = await db.execute(
      'SELECT PAK FROM civ_manpower WHERE PAK = ?',
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
      // Insert new employee
      const query = `
        INSERT INTO civ_manpower (
          PAK, PASS_NO, APPOINTMENT, EMPLOYEE_NAME, FATHER_NAME,
          PHONE, MOBILE, TEMP_ADDRESS, PERMANENT_ADDRESS, EMAIL,
          POSTIN_DATE, POSTOUT_DATE, CNIC, DOB, QUALIFICATION,
          EXPERIENCE, REFERENCE, SALARY_PM, DEPLOYMENT, BANK_ACCOUNT,
          BANK_ADDRESS, BLOOD_GROUP, SECTION, PASSWORD
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Generate default password (PBKDF2 hash of "123456")
      const crypto = require('crypto');
      const iterations = 1000;
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = crypto.pbkdf2Sync(
        "123456",
        Buffer.from(salt, 'hex'),
        iterations,
        64,
        'sha1'
      );
      const defaultPassword = `${iterations}:${salt}:${derivedKey.toString('hex')}`;

      const values = [
        employeeData.pak,
        employeeData.pass_no || null,
        employeeData.appointment,
        employeeData.employee_name,
        employeeData.father_name || null,
        employeeData.phone || null,
        employeeData.mobile || null,
        employeeData.temp_address || null,
        employeeData.permanent_address || null,
        employeeData.email || null,
        employeeData.postin_date || null,
        employeeData.postout_date || null,
        employeeData.cnic,
        employeeData.dob || null,
        employeeData.qualification || null,
        employeeData.experience || null,
        employeeData.reference || null,
        employeeData.salary_pm || null,
        employeeData.deployment || null,
        employeeData.bank_account || null,
        employeeData.bank_address || null,
        employeeData.blood_group || null,
        employeeData.section || null,
        defaultPassword
      ];

      console.log('Executing insert query with values:', values);

      const [result] = await connection.execute(query, values);

      await connection.commit();
      await connection.release();

      console.log(`✅ Employee created successfully. ID: ${employeeData.pak}, Affected rows: ${result.affectedRows}`);

      res.json({
        success: true,
        message: 'Employee created successfully',
        employee: {
          pak: employeeData.pak,
          employee_name: employeeData.employee_name,
          appointment: employeeData.appointment
        },
        affectedRows: result.affectedRows,
        note: 'Default password: 123456'
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Generate next available PAK
router.get('/generate-pak', async (req, res) => {
  try {
    // Get the highest CIV-XXX PAK
    const [results] = await db.execute(
      `SELECT PAK FROM civ_manpower 
       WHERE PAK LIKE 'CIV-%' 
       ORDER BY CAST(SUBSTRING(PAK, 5) AS UNSIGNED) DESC 
       LIMIT 1`
    );

    let nextPAK = 'CIV-001';

    if (results.length > 0) {
      const lastPAK = results[0].PAK;
      const lastNumber = parseInt(lastPAK.split('-')[1]) || 0;
      nextPAK = `CIV-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    res.json({
      success: true,
      pak: nextPAK
    });

  } catch (error) {
    console.error('Error generating PAK:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check if PAK exists
router.get('/check-pak/:pak', async (req, res) => {
  try {
    const { pak } = req.params;

    console.log(`🔍 Checking PAK: ${pak}`);

    const [existing] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME FROM civ_manpower WHERE PAK = ?',
      [pak]
    );

    res.json({
      success: true,
      exists: existing.length > 0,
      employee: existing.length > 0 ? existing[0] : null
    });

  } catch (error) {
    console.error('Error checking PAK:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update employee details - COMPLETE FIXED VERSION
router.put('/:pak', async (req, res) => {
  let connection;
  try {
    const { pak } = req.params;
    const updateData = req.body;

    console.log(`🔄 Updating employee data for PAK: ${pak}`, updateData);

    // Check if employee exists
    const [existing] = await db.execute(
      'SELECT PAK FROM civ_manpower WHERE PAK = ?',
      [pak]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Prepare update fields
    const updateFields = [];
    const updateValues = [];

    // COMPLETE field mapping with ALL form fields
    const fieldMapping = {
      pass_no: 'PASS_NO',
      appointment: 'APPOINTMENT',
      employee_name: 'EMPLOYEE_NAME',
      father_name: 'FATHER_NAME',
      phone: 'PHONE',
      mobile: 'MOBILE',
      temp_address: 'TEMP_ADDRESS',
      permanent_address: 'PERMANENT_ADDRESS',
      email: 'EMAIL',
      postin_date: 'POSTIN_DATE',
      postout_date: 'POSTOUT_DATE',
      cnic: 'CNIC',
      dob: 'DOB',
      qualification: 'QUALIFICATION',
      experience: 'EXPERIENCE',
      reference: 'REFERENCE',
      salary_pm: 'SALARY_PM',
      deployment: 'DEPLOYMENT',
      bank_account: 'BANK_ACCOUNT',
      bank_address: 'BANK_ADDRESS',
      blood_group: 'BLOOD_GROUP',
      section: 'SECTION'
    };

    Object.keys(fieldMapping).forEach(key => {
      // Check if the key exists in the update data
      if (key in updateData) {
        updateFields.push(`${fieldMapping[key]} = ?`);

        // Handle empty strings for all fields
        if (updateData[key] === '' || updateData[key] === null || updateData[key] === undefined) {
          // For DATE fields, set to NULL
          if (key === 'dob' || key === 'postin_date' || key === 'postout_date') {
            updateValues.push(null);
          } else {
            // For other fields, set to empty string
            updateValues.push('');
          }
        } else {
          // For date fields, ensure proper format
          if (key === 'dob' || key === 'postin_date' || key === 'postout_date') {
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
      UPDATE civ_manpower 
      SET ${updateFields.join(', ')} 
      WHERE PAK = ?
    `;

    console.log(`📝 Executing UPDATE query: ${query}`);
    console.log(`📝 With values:`, updateValues);

    const [result] = await db.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update employee data'
      });
    }

    console.log(`✅ Employee data updated successfully. Affected rows: ${result.affectedRows}`);

    // Return updated employee data
    const [updatedEmployee] = await db.execute(
      `SELECT * FROM civ_manpower WHERE PAK = ?`,
      [pak]
    );

    res.json({
      success: true,
      message: 'Employee data updated successfully',
      affectedRows: result.affectedRows,
      employee: updatedEmployee[0]
    });

  } catch (error) {
    console.error('❌ Error updating employee data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
      error: error.message
    });
  }
});



// Update employee password (HR reset)
router.put('/:id/update-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    console.log(`🔑 Updating password for Civilian Employee: ${id}`);

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Generate secure password hash
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
      'UPDATE civ_manpower SET PASSWORD = ? WHERE PAK = ?',
      [hashedPassword, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log(`✅ Password updated successfully for ${id}`);

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





module.exports = router;