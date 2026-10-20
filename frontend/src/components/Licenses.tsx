import React from 'react';

export const Licenses: React.FC = () => {
  return (
    <section id="licenses" className="content-section" aria-labelledby="licenses-heading">
      <div className="section-header">
        <h2 id="licenses-heading" className="section-title">
          Licenses
        </h2>
        <p className="section-subtitle">
          Open-source software license declarations for verified core project dependencies.
        </p>
      </div>

      <div className="licenses-card">
        <h3 className="licenses-subtitle">Verified Core Dependencies</h3>
        <ul className="licenses-list">
          <li className="license-item">
            <span className="dependency-name">React</span>
            <span className="license-tag">MIT License</span>
            <span className="license-desc">A JavaScript library for building user interfaces.</span>
          </li>
          <li className="license-item">
            <span className="dependency-name">React-DOM</span>
            <span className="license-tag">MIT License</span>
            <span className="license-desc">Entry point to the DOM and server renderers for React.</span>
          </li>
          <li className="license-item">
            <span className="dependency-name">Vite</span>
            <span className="license-tag">MIT License</span>
            <span className="license-desc">Next-generation frontend tooling and development server.</span>
          </li>
        </ul>

        <div className="license-notice">
          <p>
            <strong>License Audit Notice:</strong> Additional indirect and development dependency license information will be documented after comprehensive automated auditing in future releases.
          </p>
        </div>
      </div>
    </section>
  );
};
