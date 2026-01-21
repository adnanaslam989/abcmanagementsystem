// routes/penalty.js - UPDATED VERSION with retroactive penalty fix
const express = require('express');
const dbModule = require('../config/db');
const router = express.Router();

const db = dbModule.pool;

// Get penalty settings
router.get('/settings', async (req, res) => {
  try {
    const [settings] = await db.execute(
      `SELECT * FROM penalty_settings WHERE setting_id = 1`
    );
    
    if (settings.length > 0) {
      res.json({
        success: true,
        settings: {
          ...settings[0],
          retroactive_penalty: settings[0].retroactive_penalty !== undefined ? settings[0].retroactive_penalty : 1
        }
      });
    } else {
      const defaultSettings = {
        setting_id: 1,
        late_ignore_count: 3,
        grace_period_minutes: 15,
        double_penalty_start: '09:15',
        double_penalty_end: '10:00',
        quadruple_penalty_start: '10:00',
        quadruple_penalty_end: '16:00',
        late_time_in_threshold: '09:00',
        half_day_penalty_factor: 4,
        full_day_penalty_factor: 8,
        short_leave_exempt: 1,
        retroactive_penalty: 1  // NEW: Default to enabled
      };
      
      res.json({
        success: true,
        settings: defaultSettings,
        is_default: true
      });
    }
  } catch (error) {
    console.error('❌ Error fetching penalty settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Save penalty settings
router.post('/settings/save', async (req, res) => {
  try {
    const {
      late_ignore_count,
      grace_period_minutes,
      double_penalty_start,
      double_penalty_end,
      quadruple_penalty_start,
      quadruple_penalty_end,
      late_time_in_threshold,
      half_day_penalty_factor,
      full_day_penalty_factor,
      short_leave_exempt,
      retroactive_penalty  // NEW: Retroactive penalty setting
    } = req.body;
    
    const [existing] = await db.execute(
      `SELECT setting_id FROM penalty_settings WHERE setting_id = 1`
    );
    
    if (existing.length > 0) {
      await db.execute(
        `UPDATE penalty_settings SET 
          late_ignore_count = ?,
          grace_period_minutes = ?,
          double_penalty_start = ?,
          double_penalty_end = ?,
          quadruple_penalty_start = ?,
          quadruple_penalty_end = ?,
          late_time_in_threshold = ?,
          half_day_penalty_factor = ?,
          full_day_penalty_factor = ?,
          short_leave_exempt = ?,
          retroactive_penalty = ?,
          updated_at = NOW()
         WHERE setting_id = 1`,
        [
          late_ignore_count,
          grace_period_minutes,
          double_penalty_start,
          double_penalty_end,
          quadruple_penalty_start,
          quadruple_penalty_end,
          late_time_in_threshold,
          half_day_penalty_factor,
          full_day_penalty_factor,
          short_leave_exempt,
          retroactive_penalty ? 1 : 0
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO penalty_settings (
          setting_id,
          late_ignore_count,
          grace_period_minutes,
          double_penalty_start,
          double_penalty_end,
          quadruple_penalty_start,
          quadruple_penalty_end,
          late_time_in_threshold,
          half_day_penalty_factor,
          full_day_penalty_factor,
          short_leave_exempt,
          retroactive_penalty,
          created_at,
          updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          late_ignore_count,
          grace_period_minutes,
          double_penalty_start,
          double_penalty_end,
          quadruple_penalty_start,
          quadruple_penalty_end,
          late_time_in_threshold,
          half_day_penalty_factor,
          full_day_penalty_factor,
          short_leave_exempt,
          retroactive_penalty ? 1 : 0
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'Penalty settings saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving penalty settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save penalty settings'
    });
  }
});

// Get attendance for penalty calculation
router.get('/attendance/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    console.log(`🔍 Fetching attendance from civ_attendence for date: ${date}`);
    
    const [attendance] = await db.execute(
      `SELECT 
        a.ATTENDENCE_ID,
        a.PAK,
        c.EMPLOYEE_NAME,
        a.ATTENDENCE_DATE as attendence_date,
        a.STATUS,
        TIME_FORMAT(a.TIME_IN, '%H:%i') as time_in,
        TIME_FORMAT(a.TIME_OUT, '%H:%i') as time_out,
        a.MISSED_HOURS,
        a.REMARKS,
        CASE 
          WHEN a.REMARKS LIKE '%short leave%' OR a.REMARKS LIKE '%short_leave%' OR a.REMARKS LIKE '%short%' THEN 1
          ELSE 0
        END as is_short_leave
       FROM civ_attendence a
       LEFT JOIN civ_manpower c ON a.PAK = c.PAK
       WHERE a.ATTENDENCE_DATE = ?
       ORDER BY c.EMPLOYEE_NAME`,
      [date]
    );
    
    console.log(`✅ Found ${attendance.length} records in civ_attendence`);
    
    const [settings] = await db.execute(
      `SELECT * FROM penalty_settings WHERE setting_id = 1`
    );
    
    const penaltySettings = settings.length > 0 ? settings[0] : {
      late_ignore_count: 3,
      grace_period_minutes: 15,
      double_penalty_start: '09:15',
      double_penalty_end: '10:00',
      quadruple_penalty_start: '10:00',
      quadruple_penalty_end: '16:00',
      late_time_in_threshold: '09:00',
      retroactive_penalty: 1
    };
    
    // Check for existing penalties for each employee
    const processedRecords = await Promise.all(
      attendance.map(async (record) => {
        try {
          const [existingPenalty] = await db.execute(
            `SELECT COUNT(*) as count 
             FROM bonus_hours 
             WHERE BONUS_TO = ? 
               AND DATE(BONUS_DATE) = CURDATE()
               AND REASON LIKE ?
               AND BONUS_HOURS < 0`,
            [record.PAK, `%${date}%`]
          );
          
          const hasExistingPenalty = existingPenalty[0].count > 0;
          
          return {
            ATTENDENCE_ID: record.ATTENDENCE_ID,
            pak: record.PAK || '',
            employee_name: record.EMPLOYEE_NAME || 'Unknown',
            attendence_date: record.attendence_date,
            STATUS: record.STATUS || 'Present',
            time_in: record.time_in || '',
            time_out: record.time_out || '',
            MISSED_HOURS: record.MISSED_HOURS || 0,
            REMARKS: record.REMARKS || '',
            is_short_leave: record.is_short_leave || 0,
            is_late: false,
            late_minutes: 0,
            penalty_factor: 0,
            penalty_hours: '0.00',
            calculated_penalty: '0.00',
            penalty_remarks: '',
            apply_penalty: false,
            is_eligible_for_penalty: false,
            total_late_instances: 0,
            penalty_charged_instances: 0,  // NEW: Track charged instances
            has_existing_penalty: hasExistingPenalty
          };
        } catch (error) {
          console.error(`Error checking existing penalty for ${record.PAK}:`, error);
          return {
            ATTENDENCE_ID: record.ATTENDENCE_ID,
            pak: record.PAK || '',
            employee_name: record.EMPLOYEE_NAME || 'Unknown',
            attendence_date: record.attendence_date,
            STATUS: record.STATUS || 'Present',
            time_in: record.time_in || '',
            time_out: record.time_out || '',
            MISSED_HOURS: record.MISSED_HOURS || 0,
            REMARKS: record.REMARKS || '',
            is_short_leave: record.is_short_leave || 0,
            is_late: false,
            late_minutes: 0,
            penalty_factor: 0,
            penalty_hours: '0.00',
            calculated_penalty: '0.00',
            penalty_remarks: '',
            apply_penalty: false,
            is_eligible_for_penalty: false,
            total_late_instances: 0,
            penalty_charged_instances: 0,
            has_existing_penalty: false
          };
        }
      })
    );
    
    res.json({
      success: true,
      attendance: processedRecords,
      settings: penaltySettings,
      count: processedRecords.length
    });
  } catch (error) {
    console.error('❌ Error fetching attendance for penalty calculation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get already charged penalty instances for an employee
async function getChargedPenaltyInstances(pak, date) {
  try {
    // Query bonus_hours to find previously charged penalties
    const [chargedPenalties] = await db.execute(
      `SELECT REASON 
       FROM bonus_hours 
       WHERE BONUS_TO = ? 
         AND DATE(BONUS_DATE) = CURDATE()
         AND BONUS_HOURS < 0
         AND REASON LIKE '%Late instance%'`,
      [pak]
    );
    
    const chargedInstances = [];
    chargedPenalties.forEach(penalty => {
      const match = penalty.REASON.match(/Late instance #(\d+)/);
      if (match && match[1]) {
        chargedInstances.push(parseInt(match[1]));
      }
    });
    
    return chargedInstances;
  } catch (error) {
    console.error(`Error getting charged instances for ${pak}:`, error);
    return [];
  }
}

// Calculate penalties for all employees - UPDATED with retroactive fix
router.post('/calculate', async (req, res) => {
  try {
    const { date } = req.body;
    
    console.log(`🔢 Calculating penalties for date: ${date}`);
    
    const [settings] = await db.execute(
      `SELECT * FROM penalty_settings WHERE setting_id = 1`
    );
    
    const penaltySettings = settings.length > 0 ? settings[0] : {
      late_ignore_count: 3,
      grace_period_minutes: 15,
      double_penalty_start: '09:15',
      double_penalty_end: '10:00',
      quadruple_penalty_start: '10:00',
      quadruple_penalty_end: '16:00',
      late_time_in_threshold: '09:00',
      retroactive_penalty: 1
    };
    
    const currentDate = new Date(date);
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const [attendance] = await db.execute(
      `SELECT 
        a.ATTENDENCE_ID,
        a.PAK,
        c.EMPLOYEE_NAME,
        a.ATTENDENCE_DATE as attendence_date,
        a.STATUS,
        TIME_FORMAT(a.TIME_IN, '%H:%i') as time_in,
        TIME_FORMAT(a.TIME_OUT, '%H:%i') as time_out,
        a.REMARKS,
        CASE 
          WHEN a.REMARKS LIKE '%short leave%' OR a.REMARKS LIKE '%short_leave%' OR a.REMARKS LIKE '%short%' THEN 1
          ELSE 0
        END as is_short_leave
       FROM civ_attendence a
       LEFT JOIN civ_manpower c ON a.PAK = c.PAK
       WHERE a.ATTENDENCE_DATE = ?`,
      [date]
    );
    
    const penaltyResults = [];
    
    for (const record of attendance) {
      // Get all late instances for this employee in current month
      const [lateHistory] = await db.execute(
        `SELECT 
          ATTENDENCE_DATE,
          STATUS,
          TIME_FORMAT(TIME_IN, '%H:%i') as time_in,
          REMARKS
         FROM civ_attendence 
         WHERE PAK = ? 
           AND YEAR(ATTENDENCE_DATE) = ?
           AND MONTH(ATTENDENCE_DATE) = ?
           AND (STATUS = 'Late' OR (TIME_IN IS NOT NULL AND TIME_FORMAT(TIME_IN, '%H:%i') > ? AND STATUS IN ('Present', 'Late')))
           AND ATTENDENCE_DATE <= ?
         ORDER BY ATTENDENCE_DATE`,
        [record.PAK, currentDate.getFullYear(), currentDate.getMonth() + 1, 
         penaltySettings.late_time_in_threshold, date]
      );
      
      // Filter out short leaves from history
      const eligibleHistory = lateHistory.filter(h => 
        !(h.REMARKS && (h.REMARKS.includes('short leave') || h.REMARKS.includes('short_leave') || h.REMARKS.includes('short')))
      );
      
      const totalLateInstances = eligibleHistory.length;
      
      // Get already charged penalty instances from bonus_hours
      const chargedInstances = await getChargedPenaltyInstances(record.PAK, date);
      const penaltyChargedInstances = chargedInstances.length;
      
      const timeIn = record.time_in || '';
      const status = record.STATUS || 'Present';
      const isLate = status === 'Late' || (timeIn && timeIn > penaltySettings.late_time_in_threshold);
      
      let penaltyHours = 0;
      let penaltyFactor = 0;
      let penaltyRemarks = '';
      let isEligibleForPenalty = false;
      let previousPenaltyHours = 0;
      let lateMinutes = 0;
      let chargedLateInstances = [];
      
      if (isLate && timeIn && (!record.is_short_leave || !penaltySettings.short_leave_exempt)) {
        const [inHour, inMinute] = timeIn.split(':').map(Number);
        const [thresholdHour, thresholdMinute] = penaltySettings.late_time_in_threshold.split(':').map(Number);
        
        const inTotalMinutes = inHour * 60 + inMinute;
        const thresholdTotalMinutes = thresholdHour * 60 + thresholdMinute;
        
        lateMinutes = Math.max(0, inTotalMinutes - thresholdTotalMinutes - penaltySettings.grace_period_minutes);
        
        if (lateMinutes > 0) {
          if (timeIn >= penaltySettings.double_penalty_start && timeIn < penaltySettings.double_penalty_end) {
            penaltyFactor = 2;
            penaltyRemarks = `Late after ${penaltySettings.double_penalty_start} (Double penalty)`;
          } else if (timeIn >= penaltySettings.quadruple_penalty_start) {
            penaltyFactor = 4;
            penaltyRemarks = `Late after ${penaltySettings.quadruple_penalty_start} (Quadruple penalty)`;
          } else {
            penaltyFactor = 1;
            penaltyRemarks = 'Late within grace period';
          }
          
          // Check if current late instance should be penalized
          if (totalLateInstances > penaltySettings.late_ignore_count) {
            isEligibleForPenalty = true;
            const currentPenaltyHours = (lateMinutes / 60) * (penaltyFactor - 1);
            
            // If retroactive penalty is enabled AND current instance is exactly (ignore_count + 1)th instance
            if (penaltySettings.retroactive_penalty && totalLateInstances === penaltySettings.late_ignore_count + 1) {
              // Calculate penalty for previous ignore_count instances
              const previousInstances = eligibleHistory.slice(0, -1).slice(-penaltySettings.late_ignore_count);
              
              previousPenaltyHours = previousInstances.reduce((total, instance) => {
                const instanceTimeIn = instance.time_in || '';
                if (instanceTimeIn && instanceTimeIn.includes(':')) {
                  const [instHour, instMinute] = instanceTimeIn.split(':').map(Number);
                  const instTotalMinutes = instHour * 60 + instMinute;
                  const instLateMinutes = Math.max(0, instTotalMinutes - thresholdTotalMinutes - penaltySettings.grace_period_minutes);
                  
                  let instPenaltyFactor = 1;
                  if (instanceTimeIn >= penaltySettings.double_penalty_start && instanceTimeIn < penaltySettings.double_penalty_end) {
                    instPenaltyFactor = 2;
                  } else if (instanceTimeIn >= penaltySettings.quadruple_penalty_start) {
                    instPenaltyFactor = 4;
                  }
                  
                  return total + (instLateMinutes / 60) * (instPenaltyFactor - 1);
                }
                return total;
              }, 0);
              
              chargedLateInstances = Array.from({length: penaltySettings.late_ignore_count}, (_, i) => totalLateInstances - penaltySettings.late_ignore_count + i);
            } else if (penaltySettings.retroactive_penalty) {
              // For later instances (beyond ignore_count + 1), only charge current instance
              // Check if this instance has already been charged
              if (chargedInstances.includes(totalLateInstances)) {
                isEligibleForPenalty = false;
                currentPenaltyHours = 0;
              }
            } else {
              // Retroactive penalty disabled - only charge current instance
              chargedLateInstances = [totalLateInstances];
            }
            
            penaltyHours = currentPenaltyHours + previousPenaltyHours;
            
            if (isEligibleForPenalty) {
              penaltyRemarks += ` | Late instance #${totalLateInstances}`;
              if (previousPenaltyHours > 0) {
                penaltyRemarks += ` (Includes penalty for previous ${penaltySettings.late_ignore_count} late instances)`;
                chargedLateInstances = Array.from({length: penaltySettings.late_ignore_count + 1}, (_, i) => totalLateInstances - penaltySettings.late_ignore_count + i);
              } else if (penaltySettings.retroactive_penalty) {
                penaltyRemarks += ` (Only current instance - retroactive already applied)`;
              }
            } else {
              penaltyRemarks += ` | Late instance #${totalLateInstances} (already charged)`;
            }
          }
        }
      }
      
      // Check if penalty already exists for this employee
      const [existingPenalty] = await db.execute(
        `SELECT COUNT(*) as count 
         FROM bonus_hours 
         WHERE BONUS_TO = ? 
           AND DATE(BONUS_DATE) = CURDATE()
           AND REASON LIKE ?
           AND BONUS_HOURS < 0`,
        [record.PAK, `%${date}%`]
      );
      
      const hasExistingPenalty = existingPenalty[0].count > 0;
      
      penaltyResults.push({
        pak: record.PAK || '',
        employee_name: record.EMPLOYEE_NAME || 'Unknown',
        attendence_date: record.attendence_date,
        time_in: timeIn,
        status: status,
        remarks: record.REMARKS || '',
        is_short_leave: record.is_short_leave || 0,
        is_late: isLate,
        late_minutes: Math.round(lateMinutes),
        penalty_factor: penaltyFactor,
        penalty_hours: penaltyHours.toFixed(2),
        previous_penalty_hours: previousPenaltyHours.toFixed(2),
        current_penalty_hours: (penaltyHours - previousPenaltyHours).toFixed(2),
        total_late_instances: totalLateInstances,
        penalty_charged_instances: penaltyChargedInstances,
        charged_late_instances: chargedLateInstances,
        is_eligible_for_penalty: isEligibleForPenalty,
        penalty_remarks: penaltyRemarks,
        apply_penalty: isEligibleForPenalty && !hasExistingPenalty,
        has_existing_penalty: hasExistingPenalty
      });
    }
    
    const eligiblePenalties = penaltyResults.filter(r => r.is_eligible_for_penalty);
    const existingPenalties = penaltyResults.filter(r => r.has_existing_penalty);
    const totalPenaltyHours = eligiblePenalties.reduce((sum, r) => sum + parseFloat(r.penalty_hours), 0);
    const exemptedCount = penaltyResults.filter(r => r.is_eligible_for_penalty && r.is_short_leave && penaltySettings.short_leave_exempt).length;
    
    console.log(`✅ Calculated penalties for ${penaltyResults.length} employees (${existingPenalties.length} already have penalties)`);
    
    res.json({
      success: true,
      penalties: penaltyResults,
      settings: penaltySettings,
      date: date,
      summary: {
        total_employees: penaltyResults.length,
        eligible_for_penalty: eligiblePenalties.length,
        total_penalty_hours: totalPenaltyHours.toFixed(2),
        exempted_due_to_short_leave: exemptedCount,
        already_saved_count: existingPenalties.length,
        retroactive_enabled: penaltySettings.retroactive_penalty === 1,
        average_penalty_per_employee: (eligiblePenalties.length > 0 ? totalPenaltyHours / eligiblePenalties.length : 0).toFixed(2)
      }
    });
  } catch (error) {
    console.error('❌ Error calculating penalties:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check if penalty already exists for an employee on this date
router.get('/check-existing-employee/:pak/:date', async (req, res) => {
  try {
    const { pak, date } = req.params;
    
    const [existing] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM bonus_hours 
       WHERE BONUS_TO = ? 
         AND DATE(BONUS_DATE) = CURDATE()
         AND REASON LIKE ?
         AND BONUS_HOURS < 0`,
      [pak, `%${date}%`]
    );
    
    res.json({
      success: true,
      has_existing: existing[0].count > 0,
      count: existing[0].count
    });
  } catch (error) {
    console.error('Error checking existing penalty for employee:', error);
    res.status(500).json({
      success: false,
      has_existing: false,
      message: 'Error checking existing penalty'
    });
  }
});

// Check for duplicate penalty based on remarks
router.get('/check-duplicate/:pak/:date/:remarks', async (req, res) => {
  try {
    const { pak, date, remarks } = req.params;
    const decodedRemarks = decodeURIComponent(remarks);
    
    const [existing] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM bonus_hours 
       WHERE BONUS_TO = ? 
         AND DATE(BONUS_DATE) = CURDATE()
         AND REASON LIKE ?
         AND BONUS_HOURS < 0`,
      [pak, `%${decodedRemarks}%`]
    );
    
    res.json({
      success: true,
      is_duplicate: existing[0].count > 0,
      count: existing[0].count
    });
  } catch (error) {
    console.error('Error checking duplicate penalty:', error);
    res.status(500).json({
      success: false,
      is_duplicate: false,
      message: 'Error checking duplicate penalty'
    });
  }
});

// Save penalties to existing bonus_hours table
router.post('/save-penalties', async (req, res) => {
  try {
    const { penalties, date, awarded_by, reason } = req.body;
    
    console.log('💾 Saving penalties to bonus_hours table:', {
      penalty_count: penalties.filter(p => p.apply_penalty && parseFloat(p.penalty_hours) > 0).length,
      awarded_by: awarded_by,
      reason: reason
    });
    
    const savedRecords = [];
    const skippedRecords = [];
    const errors = [];
    let savedCount = 0;
    let skippedCount = 0;
    
    for (const penalty of penalties) {
      if (penalty.apply_penalty && parseFloat(penalty.penalty_hours) > 0) {
        try {
          // Check if penalty already exists for this exact combination
          const [existing] = await db.execute(
            `SELECT COUNT(*) as count 
             FROM bonus_hours 
             WHERE BONUS_TO = ? 
               AND DATE(BONUS_DATE) = CURDATE()
               AND REASON LIKE ?
               AND BONUS_HOURS < 0`,
            [penalty.pak, `%${date}%${penalty.penalty_remarks}%`]
          );
          
          if (existing[0].count > 0) {
            console.log(`⏭️ Skipping duplicate penalty for ${penalty.pak} - ${penalty.penalty_remarks}`);
            skippedRecords.push({
              pak: penalty.pak,
              employee_name: penalty.employee_name,
              reason: 'Penalty already exists with same details',
              remarks: penalty.penalty_remarks
            });
            skippedCount++;
            continue;
          }
          
          // Check if any penalty exists for this employee on this date
          const [existingForDate] = await db.execute(
            `SELECT COUNT(*) as count 
             FROM bonus_hours 
             WHERE BONUS_TO = ? 
               AND DATE(BONUS_DATE) = CURDATE()
               AND REASON LIKE ?
               AND BONUS_HOURS < 0`,
            [penalty.pak, `%${date}%`]
          );
          
          if (existingForDate[0].count > 0) {
            console.log(`⏭️ Skipping penalty for ${penalty.pak} - already has penalty for ${date}`);
            skippedRecords.push({
              pak: penalty.pak,
              employee_name: penalty.employee_name,
              reason: `Already has penalty for ${date}`,
              remarks: penalty.penalty_remarks
            });
            skippedCount++;
            continue;
          }
          
          const bonusId = Date.now() + Math.floor(Math.random() * 1000);
          const negativeHours = -Math.abs(parseFloat(penalty.penalty_hours));
          const fullReason = `${reason || 'Late Coming Penalty'} - ${date} - ${penalty.penalty_remarks || 'Late arrival'}`;
          
          await db.execute(
            `INSERT INTO bonus_hours (
              BONUS_ID,
              BONUS_TO,
              BONUS_HOURS,
              BONUS_DATE,
              AWARDED_BY,
              REASON,
              CREATED_AT
            ) VALUES (?, ?, ?, CURDATE(), ?, ?, NOW())`,
            [
              bonusId,
              penalty.pak,
              negativeHours,
              awarded_by,
              fullReason.substring(0, 200)
            ]
          );
          
          savedRecords.push({
            pak: penalty.pak,
            employee_name: penalty.employee_name,
            penalty_hours: Math.abs(negativeHours).toFixed(2),
            bonus_id: bonusId,
            bonus_date: new Date().toISOString().split('T')[0],
            reason: fullReason
          });
          
          savedCount++;
          console.log(`✅ Saved penalty to bonus_hours: ${penalty.employee_name} - ${negativeHours} hours`);
          
        } catch (error) {
          console.error(`❌ Error saving penalty for ${penalty.pak}:`, error);
          errors.push({
            pak: penalty.pak,
            error: error.message,
            employee_name: penalty.employee_name
          });
        }
      }
    }
    
    let message = `Successfully saved ${savedCount} penalty records to bonus_hours table`;
    if (skippedCount > 0) {
      message += `, skipped ${skippedCount} duplicate records`;
    }
    
    res.json({
      success: errors.length === 0,
      saved_count: savedCount,
      skipped_count: skippedCount,
      saved_records: savedRecords,
      skipped_records: skippedRecords,
      errors: errors,
      message: message
    });
    
  } catch (error) {
    console.error('❌ Error saving penalties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save penalties'
    });
  }
});

// Check if penalties already exist for a date
router.get('/check-existing/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const [existing] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM bonus_hours 
       WHERE DATE(BONUS_DATE) = CURDATE()
         AND REASON LIKE ?
         AND BONUS_HOURS < 0`,
      [`%${date}%`]
    );
    
    res.json({
      success: true,
      existing_count: existing[0].count,
      has_existing: existing[0].count > 0
    });
    
  } catch (error) {
    console.error('❌ Error checking existing penalties:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking existing penalties'
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Penalty Calculation API is working!',
    endpoints: {
      'GET /api/penalty/settings': 'Get penalty settings',
      'POST /api/penalty/settings/save': 'Save penalty settings',
      'GET /api/penalty/attendance/:date': 'Get attendance for penalty calculation',
      'POST /api/penalty/calculate': 'Calculate penalties for date',
      'POST /api/penalty/save-penalties': 'Save penalties to bonus_hours table',
      'GET /api/penalty/check-existing/:date': 'Check if penalties already exist for date',
      'GET /api/penalty/check-existing-employee/:pak/:date': 'Check if penalty exists for specific employee',
      'GET /api/penalty/check-duplicate/:pak/:date/:remarks': 'Check for duplicate penalty'
    }
  });
});

module.exports = router;