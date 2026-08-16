import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { applyTheme, getStoredTheme } from './theme';

// Applied synchronously, before the first paint - a React effect would run after mount, causing a
// visible flash of the wrong theme for anyone who's overridden the OS default via Settings.
applyTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
