import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Dev sanity check: surface in-browser whether the entry executed.
console.log('[BonusCalculator] main.tsx loaded');

const rootEl = document.getElementById('root')!
const root = ReactDOM.createRoot(rootEl)

async function boot() {
  try {
    // Try to dynamically import the full App. If module fetch fails due to
    // any browser cache transport issue, we catch and render a minimal app
    // so the user sees immediate feedback instead of a blank screen.
    const mod = await import('./App.tsx')
    const App = mod.default
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (err) {
    console.error('[BonusCalculator] Failed to load full App, falling back:', err)
    const { default: SimpleApp } = await import('./App.simple.tsx')
    const Fallback = () => (
      <div>
        <div style={{background:'#fee2e2',color:'#991b1b',padding:'8px',border:'1px solid #fecaca',borderRadius:6,marginBottom:12}}>
          <strong>Diagnostic mode:</strong> Loaded fallback UI. Check DevTools console for details.
        </div>
        <SimpleApp />
      </div>
    )
    root.render(
      <React.StrictMode>
        <Fallback />
      </React.StrictMode>,
    )
  }
}

boot()