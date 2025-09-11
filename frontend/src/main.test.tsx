import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('[TEST] main.test.tsx loaded');
console.log('[TEST] React:', React);
console.log('[TEST] ReactDOM:', ReactDOM);

const rootEl = document.getElementById('root')
console.log('[TEST] Root element:', rootEl);

if (!rootEl) {
  console.error('[TEST] Root element not found!');
} else {
  console.log('[TEST] Root element found, creating React root...');
  
  try {
    const root = ReactDOM.createRoot(rootEl);
    console.log('[TEST] React root created:', root);
    
    const TestApp = () => (
      <div style={{
        padding: '20px',
        backgroundColor: '#4CAF50',
        color: 'white',
        fontSize: '24px',
        textAlign: 'center'
      }}>
        ✅ MINIMAL REACT TEST WORKING!
        <div style={{fontSize: '16px', marginTop: '10px'}}>
          If you see this, React mounting is working fine.
        </div>
      </div>
    );
    
    console.log('[TEST] Rendering TestApp...');
    root.render(<TestApp />);
    console.log('[TEST] TestApp rendered!');
    
  } catch (err) {
    console.error('[TEST] Error creating/rendering:', err);
    // Fallback to innerHTML
    rootEl.innerHTML = `
      <div style="padding: 20px; background: red; color: white; text-align: center;">
        ❌ REACT MOUNTING FAILED: ${err}
      </div>
    `;
  }
}