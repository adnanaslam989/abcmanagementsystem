import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ModuleCard.css';

const ModuleCard = ({ module }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(module.link || module.route);
  };

  return (
    <div className="module-card" onClick={handleClick}>
      <div className="card-inner">
        <div className="card-front">
          <div className="image-container">
            <img 
              src={module.image} 
              alt={module.title || module.name}
              className="module-image"
              onError={(e) => {
                // If image fails to load, show fallback
                e.target.style.display = 'none';
              }}
            />
            <div className="image-overlay">
              <div className="module-icon">
                {module.icon || '📊'}
              </div>
              <h3 className="module-name" style={{color:'White'}}>{module.title || module.name}</h3>
              <p className="module-short-desc">Click to explore</p>
            </div>
          </div>
        </div>
        <div className="card-back">
          <h3>{module.title || module.name}</h3>
          <button className="enter-btn">Enter Module</button>
        </div>
      </div>
    </div>
  );
};

export default ModuleCard;