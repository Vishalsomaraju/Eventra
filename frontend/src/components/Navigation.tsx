import React from 'react';

export const Navigation: React.FC = () => {
  return (
    <header className="site-header">
      <a href="#planner" className="skip-link">
        Skip to main planner
      </a>
      <div className="header-container">
        <a href="#planner" className="brand-logo" aria-label="Eventra Home">
          Eventra
        </a>
        <nav aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <a href="#planner">Planner</a>
            </li>
            <li>
              <a href="#how-it-works">How It Works</a>
            </li>
            <li>
              <a href="#licenses">Licenses</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};
