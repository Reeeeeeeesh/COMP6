console.log('[BASIC] JavaScript is executing!');

// Test 1: Basic console logging
console.log('[BASIC] Testing basic functionality...');

// Test 2: DOM manipulation without React
try {
  const rootEl = document.getElementById('root');
  console.log('[BASIC] Root element:', rootEl);
  
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="
        padding: 40px;
        background: linear-gradient(45deg, #2196F3, #21CBF3);
        color: white;
        text-align: center;
        font-family: Arial, sans-serif;
        font-size: 24px;
        border-radius: 10px;
        margin: 20px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      ">
        ✅ BASIC JAVASCRIPT WORKING!
        <div style="font-size: 18px; margin-top: 15px; opacity: 0.9;">
          This means DOM manipulation is working.<br>
          The issue is likely with React or module imports.
        </div>
        <div style="font-size: 14px; margin-top: 20px; color: #B3E5FC;">
          Timestamp: ${new Date().toLocaleString()}
        </div>
      </div>
    `;
    console.log('[BASIC] DOM content updated successfully!');
  } else {
    console.error('[BASIC] Root element not found!');
  }
} catch (error) {
  console.error('[BASIC] Error during DOM manipulation:', error);
}

// Test 3: Try to show we can access window and document
console.log('[BASIC] Window object:', typeof window);
console.log('[BASIC] Document object:', typeof document);
console.log('[BASIC] Document ready state:', document.readyState);

// Test 4: Add error handler for unhandled errors  
window.addEventListener('error', (event) => {
  console.error('[BASIC] Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[BASIC] Unhandled promise rejection:', event.reason);
});

console.log('[BASIC] All tests completed!');