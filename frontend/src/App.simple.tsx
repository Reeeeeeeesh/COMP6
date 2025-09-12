import React from 'react';

// Simple test App component to diagnose the blank page issue
function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>COMP6 Frontend Test</h1>
      <p>If you see this message, React is working correctly.</p>
      <div>
        <p>Testing basic functionality:</p>
        <ul>
          <li>✅ React rendering</li>
          <li>✅ Basic HTML/CSS</li>
          <li>✅ JavaScript execution</li>
        </ul>
      </div>
    </div>
  );
}

export default SimpleApp;