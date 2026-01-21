// BiometricTestPage.jsx
import { useState } from 'react';
import StandardHeader from '../../../pages/Global/StandardHeader';

const BiometricTestPage = () => {
    const [testResults, setTestResults] = useState([]);
    const [isTesting, setIsTesting] = useState(false);
    const [deviceConfig, setDeviceConfig] = useState({
        ip: '192.168.100.62',
        port: '80',
        username: 'admin',
        password: '12345'
    });
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const runTests = async () => {
        setIsTesting(true);
        const results = [];
        
        // Test 1: Basic API test
        try {
            const response = await fetch('/api/biometric/test');
            const data = await response.json();
            results.push({
                name: 'API Connection',
                status: response.ok ? '✅ Success' : '❌ Failed',
                details: data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            results.push({
                name: 'API Connection',
                status: '❌ Failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Test 2: Config test
        try {
            const response = await fetch('/api/biometric/config');
            const data = await response.json();
            results.push({
                name: 'Configuration',
                status: response.ok ? '✅ Success' : '❌ Failed',
                details: data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            results.push({
                name: 'Configuration',
                status: '❌ Failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Test 3: Simple fetch test
        try {
            const response = await fetch('/api/biometric/fetch-simple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate })
            });
            const data = await response.json();
            results.push({
                name: 'Simple Fetch',
                status: response.ok ? '✅ Success' : '❌ Failed',
                details: `${data.attendanceData?.length || 0} records`,
                data: data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            results.push({
                name: 'Simple Fetch',
                status: '❌ Failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Test 4: Real device fetch test
        try {
            const response = await fetch('/api/biometric/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: selectedDate,
                    device: deviceConfig
                })
            });
            const data = await response.json();
            results.push({
                name: 'Device Fetch',
                status: response.ok ? '✅ Success' : '❌ Failed',
                details: `${data.attendanceData?.length || 0} records (Simulated: ${data.isSimulated ? 'Yes' : 'No'})`,
                data: data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            results.push({
                name: 'Device Fetch',
                status: '❌ Failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Test 5: Direct device ping
        try {
            const response = await fetch(`http://${deviceConfig.ip}:${deviceConfig.port}`, {
                method: 'GET',
                mode: 'no-cors' // This allows cross-origin requests
            });
            results.push({
                name: 'Direct Device Ping',
                status: '✅ Success (no-cors)',
                details: 'Device responded (CORS restrictions may apply)',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            results.push({
                name: 'Direct Device Ping',
                status: '❌ Failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        setTestResults(results);
        setIsTesting(false);
    };

    const handleConfigChange = (field, value) => {
        setDeviceConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const saveConfig = async () => {
        try {
            const response = await fetch('/api/biometric/config/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...deviceConfig,
                    enabled: true,
                    autoSync: false,
                    syncTime: '09:00:00'
                })
            });
            
            const data = await response.json();
            alert(data.message || 'Configuration saved!');
        } catch (error) {
            alert('Error saving configuration: ' + error.message);
        }
    };

    return (
        <div className="page-container">
            <StandardHeader 
                title="Biometric Device Testing" 
                subtitle="Test connection to ANVIZ biometric device"
            />

            <main className="main-content">
                <div className="main-content-wrapper">
                    <div className="standard-card">
                        <h3>Device Configuration</h3>
                        
                        <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Device IP:</label>
                                <input
                                    type="text"
                                    value={deviceConfig.ip}
                                    onChange={(e) => handleConfigChange('ip', e.target.value)}
                                    className="standard-input"
                                    placeholder="192.168.100.62"
                                />
                            </div>
                            
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Port:</label>
                                <input
                                    type="number"
                                    value={deviceConfig.port}
                                    onChange={(e) => handleConfigChange('port', e.target.value)}
                                    className="standard-input"
                                    placeholder="80"
                                />
                            </div>
                        </div>
                        
                        <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Username:</label>
                                <input
                                    type="text"
                                    value={deviceConfig.username}
                                    onChange={(e) => handleConfigChange('username', e.target.value)}
                                    className="standard-input"
                                    placeholder="admin"
                                />
                            </div>
                            
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Password:</label>
                                <input
                                    type="password"
                                    value={deviceConfig.password}
                                    onChange={(e) => handleConfigChange('password', e.target.value)}
                                    className="standard-input"
                                    placeholder="12345"
                                />
                            </div>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Test Date:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="standard-input"
                                style={{ maxWidth: '200px' }}
                            />
                        </div>
                        
                        <div className="action-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button
                                onClick={saveConfig}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Save Configuration
                            </button>
                            
                            <button
                                onClick={runTests}
                                disabled={isTesting}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {isTesting ? 'Testing...' : 'Run All Tests'}
                            </button>
                        </div>
                        
                        {testResults.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                                <h3>Test Results:</h3>
                                {testResults.map((test, index) => (
                                    <div 
                                        key={index} 
                                        style={{
                                            padding: '12px',
                                            margin: '10px 0',
                                            backgroundColor: test.status.includes('✅') ? '#d4edda' : 
                                                           test.status.includes('❌') ? '#f8d7da' : '#fff3cd',
                                            border: `1px solid ${test.status.includes('✅') ? '#c3e6cb' : 
                                                               test.status.includes('❌') ? '#f5c6cb' : '#ffeaa7'}`,
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ fontSize: '14px' }}>{test.name}:</strong>
                                            <span style={{ 
                                                fontWeight: 'bold',
                                                color: test.status.includes('✅') ? '#28a745' : 
                                                       test.status.includes('❌') ? '#dc3545' : '#ffc107'
                                            }}>
                                                {test.status}
                                            </span>
                                        </div>
                                        <div style={{ marginTop: '5px', fontSize: '13px', color: '#495057' }}>
                                            {test.details}
                                        </div>
                                        {test.data && (
                                            <button
                                                onClick={() => {
                                                    console.log('Test data:', test.data);
                                                    alert(`Data preview:\n${JSON.stringify(test.data, null, 2).substring(0, 500)}...`);
                                                }}
                                                style={{
                                                    marginTop: '8px',
                                                    padding: '4px 8px',
                                                    fontSize: '12px',
                                                    backgroundColor: '#6c757d',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                View Data
                                            </button>
                                        )}
                                        <div style={{ marginTop: '5px', fontSize: '11px', color: '#868e96' }}>
                                            {new Date(test.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                            <h4>📋 Testing Instructions:</h4>
                            <ol style={{ marginLeft: '20px', fontSize: '14px' }}>
                                <li>Ensure your ANVIZ device is powered on and connected to network</li>
                                <li>Verify the IP address (should be 192.168.100.62)</li>
                                <li>Default credentials are usually admin/12345</li>
                                <li>Click "Save Configuration" first</li>
                                <li>Then click "Run All Tests"</li>
                                <li>Check the results for any connection issues</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BiometricTestPage;