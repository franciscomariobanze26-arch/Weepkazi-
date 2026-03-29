import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Error Shield to prevent white screen on Android
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #fee2e2; color: #991b1b; font-family: sans-serif; border-radius: 12px; margin: 20px;">
        <h1 style="font-size: 20px; margin-bottom: 10px;">Ops! Ocorreu um erro ao carregar o app</h1>
        <p style="font-size: 14px; margin-bottom: 15px;">${message}</p>
        <p style="font-size: 12px; opacity: 0.7;">${source}:${lineno}:${colno}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #991b1b; color: white; border: none; border-radius: 8px; font-weight: bold;">Tentar Novamente</button>
      </div>
    `;
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
