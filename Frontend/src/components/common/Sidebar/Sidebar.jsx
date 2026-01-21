import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import './Sidebar.css';

const Sidebar = ({ isCollapsed: propIsCollapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useApp();
  const { theme: currentTheme, themes, toggleTheme } = useTheme();

  const [menuItems, setMenuItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedItems, setPinnedItems] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(true); // Default to collapsed
  const searchRef = useRef(null);
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Determine if sidebar should be collapsed
  const shouldBeCollapsed = isManuallyCollapsed && !isHovered;

  const iconMap = {
    'D': '📊', 'H': '👥', 'I': '📦', 'C': '🍽️',
    'dashboard': '📊', 'group': '👥', 'inventory': '📦',
    'canteen': '🍽️', 'settings': '⚙️', 'reports': '📈',
    'analytics': '📊', 'users': '👤', 'employee': '👨‍💼',
    'attendance': '📅', 'payroll': '💰', 'documents': '📄',
    '👨‍✈️': '👨‍✈️', '👨‍💼': '👨‍💼', '📅': '📅', '🔧': '🔧', '⏰': '⏰'
  };

  useEffect(() => {
    const fetchUserMenu = async () => {
      if (!state.user?.pak) {
        setMenuItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`http://10.0.0.7:5000/api/roles/user-menu/${state.user.pak}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMenuItems(data.menuItems || []);
            const topLevelKeys = (data.menuItems || [])
              .filter(item => item.key && !item.path)
              .map(item => item.key);
            setExpandedItems(topLevelKeys);

            const savedPinned = localStorage.getItem(`pinnedItems_${state.user.pak}`);
            if (savedPinned) setPinnedItems(JSON.parse(savedPinned));
          } else {
            throw new Error(data.message);
          }
        } else {
          throw new Error(`HTTP error: ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
        setError(error.message);
        setMenuItems(getFallbackMenu());
      } finally {
        setLoading(false);
      }
    };

    fetchUserMenu();
  }, [state.user]);

  useEffect(() => {
    // Apply collapsed state to parent component if callback exists
    if (onToggleCollapse) {
      onToggleCollapse(shouldBeCollapsed);
    }
  }, [shouldBeCollapsed, onToggleCollapse]);

  const getFallbackMenu = () => [
    {
      key: 'main-dashboard', title: 'Main Dashboard', icon: 'D', path: '/'
    },
    {
      key: 'hr-menu', title: 'HR Management', icon: 'H',
      subItems: [
        {
          key: 'paf-hr', title: 'PAF HR', icon: '👨‍✈️',
          subItems: [
            { key: 'paf-assign-roles', title: 'Assign User Roles', path: '/hr/paf/assign-roles', icon: '🔧' },
            { key: 'paf-strength', title: 'Strength Reports', path: '/hr/paf/total-strength', icon: '📊' }
          ]
        }
      ]
    },
    { key: 'inventory', title: 'Inventory', icon: 'I', path: '/inventory' },
    { key: 'canteen', title: 'Canteen', icon: 'C', path: '/canteen' }
  ];

  const getDisplayIcon = (iconText) => iconMap[iconText] || '📄';

  const handleNavigation = (path) => {
    if (path) {
      navigate(path);
      if (window.innerWidth <= 768) {
        setIsManuallyCollapsed(true);
        setIsHovered(false);
      }
    }
  };

  const toggleExpanded = (key, event) => {
    event?.stopPropagation();
    setExpandedItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeoutRef.current);
    if (window.innerWidth > 768) { // Only auto-expand on desktop
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth > 768) { // Only auto-collapse on desktop
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 300); // Small delay to prevent flickering
    }
  };

  const toggleManualCollapse = (event) => {
    event?.stopPropagation();
    setIsManuallyCollapsed(!isManuallyCollapsed);
    // Reset hover state when manually toggling
    setIsHovered(false);
  };

  const togglePinItem = (item, event) => {
    event?.stopPropagation();
    if (!state.user?.pak) return;

    // Allow pinning for items with paths OR for top-level menu items
    const canBePinned = item.path || (item.subItems && item.subItems.length > 0);
    if (!canBePinned) return;

    const itemKey = item.key;
    setPinnedItems(prev => {
      const isPinned = prev.includes(itemKey);
      const newPinned = isPinned ? prev.filter(k => k !== itemKey) : [...prev, itemKey];
      localStorage.setItem(`pinnedItems_${state.user.pak}`, JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const isPinned = (itemKey) => pinnedItems.includes(itemKey);
  const isActive = (path) => path && (location.pathname === path || location.pathname.startsWith(path + '/'));

  const filteredMenuItems = () => {
    if (!searchQuery.trim()) return menuItems;

    const searchLower = searchQuery.toLowerCase();
    const filterItems = (items) => items.filter(item => {
      const matches = item.title.toLowerCase().includes(searchLower);
      const childMatches = item.subItems ? filterItems(item.subItems).length > 0 : false;
      if (childMatches && item.key && !expandedItems.includes(item.key)) {
        setExpandedItems(prev => [...prev, item.key]);
      }
      return matches || childMatches;
    });

    return filterItems(menuItems);
  };

  const getPinnedItems = () => {
    // Find all items that are pinnable (have path or are top-level with subItems)
    const findAllPinnableItems = (items) => {
      let result = [];
      items.forEach(item => {
        const canBePinned = item.path || (item.subItems && item.subItems.length > 0);
        if (canBePinned) {
          result.push(item);
        }
        if (item.subItems) {
          result = [...result, ...findAllPinnableItems(item.subItems)];
        }
      });
      return result;
    };

    const allPinnableItems = findAllPinnableItems(menuItems);
    return allPinnableItems.filter(item => isPinned(item.key));
  };
  const renderMenuItems = (items, level = 0) => {
    if (!items || items.length === 0) return null;

    return items.map((item) => {
      const hasSubItems = item.subItems?.length > 0;
      const isExpanded = expandedItems.includes(item.key);
      const active = isActive(item.path);
      const pinned = isPinned(item.key);

      return (
        <li key={item.key} className={`menu-item level-${level}`}>
          <div
            className={`menu-link ${active ? 'active' : ''} ${hasSubItems ? 'has-submenu' : ''}`}
            onClick={(e) => item.path ? handleNavigation(item.path) : hasSubItems && toggleExpanded(item.key, e)}
            style={{ paddingLeft: shouldBeCollapsed ? '15px' : `${10 + (level * 15)}px` }}
            title={shouldBeCollapsed ? item.title : undefined}
          >
            <span className="menu-icon">{getDisplayIcon(item.icon)}</span>

            {!shouldBeCollapsed && (
              <>
                <span className="menu-text">{item.title}</span>
                <div className="menu-actions">
                  {item.path || (item.subItems && item.subItems.length > 0) ? (
                    <button
                      className={`pin-btn ${pinned ? 'pinned' : ''}`}
                      onClick={(e) => togglePinItem(item, e)}
                      title={pinned ? "Unpin" : "Pin"}
                    >
                      📌
                    </button>
                  ) : null}
                  {hasSubItems && (
                    <span className="expand-icon">{isExpanded ? '▼' : '►'}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {hasSubItems && isExpanded && !shouldBeCollapsed && (
            <ul className="submenu-list">{renderMenuItems(item.subItems, level + 1)}</ul>
          )}
        </li>
      );
    });
  };

  const renderCollapsedMenu = () => {
    // Get only top-level menu items (no submenus)
    const topLevelItems = menuItems.filter(item =>
      !item.path?.includes('/') || item.path === '/' ||
      ['/inventory', '/canteen'].includes(item.path)
    );

    return topLevelItems.map((item) => {
      const active = isActive(item.path);
      return (
        <div
          key={item.key}
          className={`collapsed-menu-item ${active ? 'active' : ''}`}
          onClick={() => item.path ? handleNavigation(item.path) : alert(`Expand sidebar to view ${item.title} menu`)}
          title={item.title}
        >
          <span className="collapsed-icon">{getDisplayIcon(item.icon)}</span>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div
        className={`sidebar loading ${shouldBeCollapsed ? 'collapsed' : ''} ${currentTheme}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={sidebarRef}
      >
        <div className="sidebar-content">
          <div className="loading-menu">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const availableThemes = ['blue', 'dark', 'green', 'purple'];
  const nextTheme = availableThemes[(availableThemes.indexOf(currentTheme) + 1) % availableThemes.length];

  return (
    <>
      {!shouldBeCollapsed && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={() => {
          setIsManuallyCollapsed(true);
          setIsHovered(false);
        }}></div>
      )}

      <div
        className={`sidebar ${shouldBeCollapsed ? 'collapsed' : ''} ${currentTheme}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={sidebarRef}
      >
        <div className="sidebar-header">
          {!shouldBeCollapsed && (
            <>
              <div className="header-main">
                <div className="app-logo">
                  <h3 className="app-title">CryptoDiv</h3>
                </div>

                <div className="header-controls">
                  <button
                    className="sidebar-btn search-btn"
                    onClick={() => setShowSearch(!showSearch)}
                    title="Search"
                  >
                    🔍
                  </button>
                  <button
                    className="sidebar-btn theme-btn"
                    onClick={() => toggleTheme(nextTheme)}
                    title={`Theme: ${currentTheme} (Click for ${nextTheme})`}
                  >
                    {currentTheme === 'blue' ? '🔵' :
                      currentTheme === 'dark' ? '🌙' :
                        currentTheme === 'green' ? '🌿' : '🟣'}
                  </button>
                </div>
              </div>

              {showSearch && (
                <div className="search-container">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    autoFocus
                  />
                  <button className="clear-search" onClick={() => setSearchQuery('')}>
                    ✕
                  </button>
                </div>
              )}


            </>
          )}
        </div>



        <div className="sidebar-content">
          {!shouldBeCollapsed && error && (
            <div className="menu-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          {!shouldBeCollapsed && pinnedItems.length > 0 && (
            <ul className="menu-list pinned-list">
              {renderMenuItems(getPinnedItems())}
            </ul>
          )}

          <div className="menu-section">
            {menuItems.length === 0 ? (
              <div className="no-access">
                <p>No menu access</p>
                <p className="small">Contact administrator</p>
              </div>
            ) : shouldBeCollapsed ? (
              <div className="collapsed-menu">{renderCollapsedMenu()}</div>
            ) : (
              <ul className="menu-list">
                {renderMenuItems(filteredMenuItems())}
                {searchQuery && filteredMenuItems().length === 0 && (
                  <li className="no-results">No results for "{searchQuery}"</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;