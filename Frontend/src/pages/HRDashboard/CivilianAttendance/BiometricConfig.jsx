// BiometricConfig.jsx - A page to configure biometric device
import { useState, useEffect } from 'react';
import StandardHeader from '../../../pages/Global/StandardHeader';

const BiometricConfig = () => {
  const [config, setConfig] = useState({
    ip: '10.0.0.100',
    port: 80,
    username: 'admin',
    password: 'admin123',
    enabled: true,
    autoSync: false,
    syncTime: '09:00'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/employee/biometric/config');
      const data = await response.json();
      
      if (data.success && data.config) {
        setConfig({
          ip: data.config.ip || '10.0.0.100',
          port: data.config.port || 80,
          username: data.config.username || 'admin',
          password: data.config.password || 'admin123',
          enabled: data.config.enabled === 1,
          autoSync: data.config.auto_sync === 1,
          syncTime: data.config.sync_time || '09:00'
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/employee/biometric/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('✅ Configuration saved successfully');
        setTestResult(result.testResult);
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setMessage('❌ Error saving configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setMessage('Testing connection...');
    
    try {
      const response = await fetch('/api/employee/biometric/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      setTestResult(result);
      setMessage(result.success ? '✅ Connection successful' : '❌ Connection failed');
    } catch (error) {
      setMessage('❌ Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <StandardHeader 
        title="Biometric Device Configuration" 
        subtitle="Configure ANVIZ biometric device for automatic attendance"
      />
      
      <main className="main-content">
        <div className="main-content-wrapper">
          <div className="standard-card">
            <h3>Device Configuration</h3>
            
            <div className="form-group">
              <label>Device IP Address:</label>
              <input
                type="text"
                value={config.ip}
                onChange={(e) => setConfig({...config, ip: e.target.value})}
                className="standard-input"
                placeholder="e.g., 10.0.0.100"
              />
            </div>
            
            <div className="form-group">
              <label>Port:</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({...config, port: parseInt(e.target.value)})}
                className="standard-input"
                placeholder="80"
              />
            </div>
            
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig({...config, username: e.target.value})}
                className="standard-input"
                placeholder="admin"
              />
            </div>
            
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig({...config, password: e.target.value})}
                className="standard-input"
                placeholder="admin123"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({...config, enabled: e.target.checked})}
                  />
                  Enable Device
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoSync}
                    onChange={(e) => setConfig({...config, autoSync: e.target.checked})}
                  />
                  Auto-Sync Daily
                </label>
              </div>
            </div>
            
            {config.autoSync && (
              <div className="form-group">
                <label>Auto-Sync Time:</label>
                <input
                  type="time"
                  value={config.syncTime}
                  onChange={(e) => setConfig({...config, syncTime: e.target.value})}
                  className="standard-input"
                />
              </div>
            )}
            
            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            
            {testResult && (
              <div className="test-result">
                <h4>Connection Test Result:</h4>
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
            
            <div className="action-buttons">
              <button
                className="standard-btn standard-btn-primary"
                onClick={handleTestConnection}
                disabled={isLoading}
              >
                Test Connection
              </button>
              
              <button
                className="standard-btn standard-btn-success"
                onClick={handleSaveConfig}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
            
            <div className="instructions">
              <h4>📋 Instructions:</h4>
              <ol>
                <li>Ensure biometric device is connected to network</li>
                <li>Enter the device IP address (can be found in device network settings)</li>
                <li>Default credentials are usually admin/admin123</li>
                <li>Test connection before saving</li>
                <li>Enable auto-sync for automatic daily attendance fetch</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BiometricConfig;