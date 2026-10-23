import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { lab, useUI } from './state/lab';
import './styles.css';

history.scrollRestoration = 'manual';
// `?skip` starts inside the lab (returning visitors, tests)
if (location.search.includes('skip')) { lab.entry.phase = 'lab'; useUI.setState({ phase: 'lab' }); }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// test hook: headless screenshots read the scroll state
if (location.search.includes('test')) Object.assign(window, { __lab: lab, __ui: useUI });
