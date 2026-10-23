import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { lab } from './state/lab';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// test hook: headless screenshots read the scroll state
if (location.search.includes('test')) (window as unknown as { __lab: typeof lab }).__lab = lab;
