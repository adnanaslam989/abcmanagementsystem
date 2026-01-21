import React, { useState, useEffect } from 'react';
import './NewsTicker.css';

const NewsTicker = ({ newsItems, onViewAll, loading }) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [expandedNews, setExpandedNews] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay || newsItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentNewsIndex((prevIndex) => (prevIndex + 1) % newsItems.length);
    }, 5000); // Change news every 5 seconds

    return () => clearInterval(interval);
  }, [newsItems, autoPlay]);

  const handleNext = () => {
    setCurrentNewsIndex((prevIndex) => (prevIndex + 1) % newsItems.length);
  };

  const handlePrev = () => {
    setCurrentNewsIndex((prevIndex) => (prevIndex - 1 + newsItems.length) % newsItems.length);
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };

  const toggleExpand = (id) => {
    setExpandedNews(expandedNews === id ? null : id);
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'HR': return '#3b82f6';
      case 'IT': return '#8b5cf6';
      case 'Policy': return '#10b981';
      case 'Event': return '#f59e0b';
      case 'Security': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="news-ticker loading">
        <div className="ticker-header">
          <h3>Latest News</h3>
          <div className="ticker-controls">
            <div className="control-btn disabled">⏸️</div>
            <div className="control-btn disabled">❮</div>
            <div className="control-btn disabled">❯</div>
          </div>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading news...</p>
        </div>
      </div>
    );
  }

  if (newsItems.length === 0) {
    return (
      <div className="news-ticker empty">
        <div className="ticker-header">
          <h3>Latest News</h3>
          <div className="ticker-controls">
            <div className="control-btn disabled">⏸️</div>
            <div className="control-btn disabled">❮</div>
            <div className="control-btn disabled">❯</div>
          </div>
        </div>
        <div className="empty-content">
          <div className="empty-icon">📰</div>
          <p>No news available</p>
          <button className="view-all-btn" onClick={onViewAll}>
            Add News
          </button>
        </div>
      </div>
    );
  }

  const currentNews = newsItems[currentNewsIndex];

  return (
    <div className="news-ticker">
      <div className="ticker-header">
        <h3>
          <span className="header-icon">📢</span>
          Latest News & Announcements
          <span className="news-counter">
            {currentNewsIndex + 1}/{newsItems.length}
          </span>
        </h3>
        <div className="ticker-controls">
          <button 
            className={`control-btn ${autoPlay ? 'active' : ''}`}
            onClick={toggleAutoPlay}
            title={autoPlay ? "Pause Auto-play" : "Start Auto-play"}
          >
            {autoPlay ? '⏸️' : '▶️'}
          </button>
          <button className="control-btn" onClick={handlePrev} title="Previous News">
            ❮
          </button>
          <button className="control-btn" onClick={handleNext} title="Next News">
            ❯
          </button>
        </div>
      </div>

      <div className="ticker-content">
        <div className="news-item">
          <div className="news-header">
            <div className="news-category" style={{ backgroundColor: getCategoryColor(currentNews.category) }}>
              {currentNews.category}
            </div>
            <div className="news-priority">
              {getPriorityIcon(currentNews.priority)} {currentNews.priority}
            </div>
          </div>

          <div className="news-date">
            📅 {new Date(currentNews.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>

          <h4 className="news-title">{currentNews.title}</h4>

          <div className="news-preview">
            {expandedNews === currentNews.id ? (
              <div className="news-full-content">
                <p>{currentNews.content}</p>
                <button 
                  className="read-less-btn"
                  onClick={() => toggleExpand(currentNews.id)}
                >
                  Read Less
                </button>
              </div>
            ) : (
              <>
                <p className="news-summary">
                  {currentNews.content.length > 150 
                    ? `${currentNews.content.substring(0, 150)}...` 
                    : currentNews.content}
                </p>
                {currentNews.content.length > 150 && (
                  <button 
                    className="read-more-btn"
                    onClick={() => toggleExpand(currentNews.id)}
                  >
                    Read More
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="ticker-footer">
        <div className="news-list">
          {newsItems.map((news, index) => (
            <div 
              key={news.id}
              className={`news-bullet ${index === currentNewsIndex ? 'active' : ''}`}
              onClick={() => setCurrentNewsIndex(index)}
              title={news.title}
            >
              <div className="bullet-indicator"></div>
              <span className="bullet-title">{news.title}</span>
            </div>
          ))}
        </div>
        <button className="view-all-btn" onClick={onViewAll}>
          View All News →
        </button>
      </div>
    </div>
  );
};

export default NewsTicker;