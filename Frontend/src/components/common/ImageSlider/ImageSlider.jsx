import React, { useState, useEffect } from 'react';
import './ImageSlider.css';

const ImageSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      image: '/images/slider/1.jpg',
      title: 'Welcome to Our Organization',
      description: 'Managing excellence through innovative solutions'
    },
    {
      image: '/images/slider/2.jpg',
      title: 'Team Collaboration',
      description: 'Working together for better results'
    },
    {
      image: '/images/slider/3.jpg',
      title: 'Modern Management',
      description: 'Streamlined processes for maximum efficiency'
    },
    {
      image: '/images/slider/4.jpg',
      title: 'Modern Management',
      description: 'Streamlined processes for maximum efficiency'
    },{
      image: '/images/slider/5.jpg',
      title: 'Modern Management',
      description: 'Streamlined processes for maximum efficiency'
    }
  ];

 useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="image-slider">
      <div className="slider-container">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
          >
            <img 
              src={slide.image} 
              alt={slide.title}
              className="slide-image"
              onError={(e) => {
                e.target.style.display = 'none';
                // Fallback background color if image fails to load
                e.target.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
              }}
            />
            <div className="slide-content">
              <h2  style={{color:'White'}}>{slide.title}</h2>
              <p>{slide.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <button className="slider-btn prev" onClick={prevSlide}>‹</button>
      <button className="slider-btn next" onClick={nextSlide}>›</button>
      
      <div className="slider-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlider;