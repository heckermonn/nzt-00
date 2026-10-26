import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

history.scrollRestoration = 'manual';
const q = location.search, root = createRoot(document.getElementById('root')!);

// `?lab` keeps the earlier scroll lab reachable for comparison; the Reserve is the site
if (q.includes('lab')) {
  Promise.all([import('./App'), import('./state/lab'), import('./styles.css')]).then(([{ App }, { lab, useUI }]) => {
    if (q.includes('skip')) { lab.entry.phase = 'lab'; useUI.setState({ phase: 'lab' }); }
    if (q.includes('test')) Object.assign(window, { __lab: lab, __ui: useUI });
    root.render(<StrictMode><App /></StrictMode>);
  });
} else {
  Promise.all([import('./reserve/App'), import('./reserve/state'), import('./reserve/cart')]).then(([{ ReserveApp }, { rv, useReserve }, { useCart }]) => {
    // `?skip` starts inside the hall (returning members, tests)
    if (q.includes('skip')) { useReserve.getState().setPhase('hall'); rv.tp = 10; }
    if (q.includes('test')) Object.assign(window, { __rv: rv, __reserve: useReserve, __cart: useCart });
    root.render(<StrictMode><ReserveApp /></StrictMode>);
  });
}
