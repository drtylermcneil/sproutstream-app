import React from 'react'
import ReactDOM from 'react-dom/client'
import SproutStream from './SproutStream'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SproutStream />
  </React.StrictMode>,
)
