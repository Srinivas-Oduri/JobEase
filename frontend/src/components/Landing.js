import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);
  return (
    <div className="landing">
      <div className="dark-overlay">
        <div className="landing-inner">
          <div className="landing-card">
            <p className="lead">Be lazy to work smart</p>
            <div className="buttons">
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
              <Link to="/login" className="btn btn-light">Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
