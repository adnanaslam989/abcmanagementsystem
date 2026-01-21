import React, { useState } from 'react';
import './TestPassword.css';

const TestPassword = () => {
  const [pak, setPak] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkPasswordFormat = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/check-password-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pak })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, message: 'Network error: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pak, password })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, message: 'Network error: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetToPlainText = async () => {
    if (!pak || !password) {
      setResult({ success: false, message: 'Please enter both PAK and password' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/reset/reset-to-plain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pak, newPassword: password })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, message: 'Reset failed: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const listUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/reset/users');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, message: 'Failed to fetch users: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-password-container">
      <h1>🔧 Password Diagnostic Tool</h1>
      <p className="subtitle">Use this tool to debug login issues (for development only)</p>
      
      <div className="input-section">
        <div className="input-group">
          <label htmlFor="pak">PAK Number</label>
          <input
            type="text"
            id="pak"
            placeholder="Enter PAK (e.g., PAK001)"
            value={pak}
            onChange={(e) => setPak(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="button-group">
        <button 
          onClick={checkPasswordFormat} 
          disabled={loading || !pak}
          className="btn btn-info"
        >
          Check Password Format
        </button>
        
        <button 
          onClick={testLogin} 
          disabled={loading || !pak || !password}
          className="btn btn-primary"
        >
          Test Login
        </button>
        
        <button 
          onClick={resetToPlainText} 
          disabled={loading || !pak || !password}
          className="btn btn-warning"
          title="Reset password to plain text (INSECURE - for testing only)"
        >
          Reset to Plain Text
        </button>
        
        <button 
          onClick={listUsers} 
          disabled={loading}
          className="btn btn-secondary"
        >
          List Users (First 10)
        </button>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      )}

      {result && (
        <div className={`result-section ${result.success ? 'success' : 'error'}`}>
          <h3>{result.success ? '✅ Success' : '❌ Error'}</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="instructions">
        <h4>How to use:</h4>
        <ol>
          <li>Enter a PAK number from your database</li>
          <li>Click "Check Password Format" to see how the password is stored</li>
          <li>Enter the password and click "Test Login" to test authentication</li>
          <li>If login fails, use "Reset to Plain Text" to convert to simple password (for testing)</li>
          <li>Check the Node.js console for detailed debug logs</li>
        </ol>
      </div>
    </div>
  );
};

export default TestPassword;