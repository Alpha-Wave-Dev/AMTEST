import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// localStorage-backed storage shim (used by ThesisAgentRoom for thesis persistence)
window.storage = {
  list: (prefix) => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return Promise.resolve({ keys });
  },
  get: (key) => {
    const val = localStorage.getItem(key);
    return Promise.resolve(val ? { value: val } : null);
  },
  set: (key, value) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  delete: (key) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
