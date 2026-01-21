// BiometricAttendanceButton.jsx - UPDATED VERSION
import { useState } from 'react';

// ADD THIS CONSTANT AT THE TOP
const BIOMETRIC_API_BASE = 'http://10.0.0.7:5000/api/biometric';

const BiometricAttendanceButton = ({
    selectedDate,
    onBiometricDataFetched,
    employees,
    onUpdateEmployees,
    defaultTime = { time_in: '09:00' }
}) => {
    const [isFetching, setIsFetching] = useState(false);
    const [message, setMessage] = useState('');

    // ANVIZ device configuration
    const ANVIZ_CONFIG = {
        ip: '192.168.100.62', // Change this to your ANVIZ device IP
        port: '80',
        username: 'admin', // Default username
        password: '12345', // Default password
        timeout: 10000 // 10 seconds timeout
    };

    // Function to fetch biometric data via backend
    const fetchBiometricViaBackend = async () => {
        if (!selectedDate) {
            setMessage('Please select a date first');
            return;
        }

        setIsFetching(true);
        setMessage('Connecting to biometric device...');

        try {
            console.log('📡 Starting biometric fetch for date:', selectedDate);
            
            // UPDATED: Use the full backend URL
            const response = await fetch(`${BIOMETRIC_API_BASE}/fetch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: selectedDate,
                    device: {
                        ip: ANVIZ_CONFIG.ip,
                        port: ANVIZ_CONFIG.port,
                        username: ANVIZ_CONFIG.username,
                        password: ANVIZ_CONFIG.password
                    }
                })
            });

            console.log('Biometric API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Biometric API result:', result);

            if (result.success) {
                if (result.attendanceData && result.attendanceData.length > 0) {
                    processBiometricData(result.attendanceData);
                    
                    if (result.isSimulated) {
                        setMessage(`⚠️ ${result.attendanceData.length} simulated records (device connection failed)`);
                    } else {
                        setMessage(`✅ ${result.attendanceData.length} records fetched from device`);
                    }
                } else {
                    setMessage('No biometric records found for selected date');
                }
            } else {
                setMessage(`❌ ${result.message || 'Failed to fetch biometric data'}`);
            }
        } catch (error) {
            console.error('Backend fetch error:', error);
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setIsFetching(false);
        }
    };

    // Process biometric data and update employee records
    const processBiometricData = (biometricRecords) => {
        if (!employees || employees.length === 0) {
            setMessage('No employees loaded. Please load employees first.');
            return;
        }

        const updatedEmployees = [...employees];
        let matchedCount = 0;
        let unmatchedRecords = [];

        biometricRecords.forEach(bioRecord => {
            // Try to match by employee ID (PAK)
            let employeeIndex = -1;
            
            // First try exact PAK match
            employeeIndex = updatedEmployees.findIndex(emp => 
                emp.pak && emp.pak.toString() === bioRecord.userID.toString()
            );
            
            // If no exact match, try partial name match
            if (employeeIndex === -1 && bioRecord.userName) {
                employeeIndex = updatedEmployees.findIndex(emp => 
                    emp.employee_name && 
                    bioRecord.userName &&
                    emp.employee_name.toLowerCase().includes(bioRecord.userName.toLowerCase())
                );
            }
            
            // If still no match, try to match by index
            if (employeeIndex === -1 && updatedEmployees.length > 0) {
                // For simulated data, match by position
                const recordIndex = biometricRecords.indexOf(bioRecord);
                if (recordIndex < updatedEmployees.length) {
                    employeeIndex = recordIndex;
                }
            }

            if (employeeIndex !== -1) {
                // Convert time format (from "17:13:10" to "17:13")
                let timeIn = bioRecord.timeIn;
                if (timeIn && timeIn.includes(':')) {
                    const parts = timeIn.split(':');
                    if (parts.length >= 2) {
                        timeIn = `${parts[0].padStart(2, '0')}:${parts[1]}`;
                    }
                }

                // Determine status based on time
                let status = 'Present';
                if (timeIn) {
                    const timeInMinutes = parseInt(timeIn.split(':')[0]) * 60 + parseInt(timeIn.split(':')[1]);
                    const lateThreshold = 9 * 60 + 15; // 09:15
                    if (timeInMinutes > lateThreshold) {
                        status = 'Late';
                    }
                }

                updatedEmployees[employeeIndex] = {
                    ...updatedEmployees[employeeIndex],
                    time_in: timeIn || defaultTime.time_in,
                    status: status,
                    remarks: bioRecord.source ? `Biometric (${bioRecord.source}): ${timeIn || 'No time'}` : 
                             `Biometric: ${timeIn || 'No time recorded'}`
                };

                matchedCount++;
            } else {
                unmatchedRecords.push(bioRecord);
            }
        });

        // Update the parent component
        if (onUpdateEmployees) {
            onUpdateEmployees(updatedEmployees);
        }

        if (onBiometricDataFetched) {
            onBiometricDataFetched({
                totalRecords: biometricRecords.length,
                matchedRecords: matchedCount,
                unmatchedRecords: unmatchedRecords.length,
                unmatchedDetails: unmatchedRecords
            });
        }

        console.log(`Matched ${matchedCount} out of ${biometricRecords.length} biometric records`);
        if (unmatchedRecords.length > 0) {
            console.log('Unmatched records:', unmatchedRecords);
        }
    };

    return (
        <div className="biometric-fetch-section">
            <button
                type="button"
                className="standard-btn standard-btn-success"
                onClick={fetchBiometricViaBackend}
                disabled={isFetching || !selectedDate}
                style={{
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    marginLeft: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px'
                }}
            >
                {isFetching ? (
                    <>
                        <div className="loading-spinner-small"></div>
                        Fetching...
                    </>
                ) : (
                    <>
                        <span style={{ fontSize: '16px' }}>👆</span>
                        Fetch Biometric Data
                    </>
                )}
            </button>

            {message && (
                <div className="biometric-message" style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: message.includes('✅') ? '#d4edda' :
                        message.includes('❌') ? '#f8d7da' : 
                        message.includes('⚠️') ? '#fff3cd' : '#e8f4fd',
                    border: `1px solid ${message.includes('✅') ? '#c3e6cb' :
                        message.includes('❌') ? '#f5c6cb' : 
                        message.includes('⚠️') ? '#ffeaa7' : '#b8daff'}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: message.includes('✅') ? '#155724' :
                        message.includes('❌') ? '#721c24' : 
                        message.includes('⚠️') ? '#856404' : '#2c3e50',
                    maxWidth: '400px'
                }}>
                    <strong>Status:</strong> {message}
                </div>
            )}

            <div className="biometric-info" style={{
                marginTop: '10px',
                fontSize: '12px',
                color: '#6c757d',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e9ecef'
            }}>
                <div><strong>Device IP:</strong> {ANVIZ_CONFIG.ip}:{ANVIZ_CONFIG.port}</div>
                <div><strong>Selected Date:</strong> {selectedDate || 'Not selected'}</div>
                <div><strong>Employees Loaded:</strong> {employees?.length || 0}</div>
                <div style={{ fontSize: '11px', color: '#868e96', marginTop: '5px' }}>
                    Click to fetch biometric attendance data for the selected date
                </div>
            </div>
        </div>
    );
};

export default BiometricAttendanceButton;