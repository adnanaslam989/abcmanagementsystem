import React, { useState } from 'react';
import './TaskTable.css';

const TaskTable = ({ tasks, onTaskAction, onViewAll, loading }) => {
  const [sortColumn, setSortColumn] = useState('submittedDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterPriority, setFilterPriority] = useState('all');

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return { text: 'Pending', color: '#f59e0b', bg: '#fef3c7' };
      case 'in-progress': return { text: 'In Progress', color: '#3b82f6', bg: '#dbeafe' };
      case 'completed': return { text: 'Completed', color: '#10b981', bg: '#d1fae5' };
      default: return { text: 'Pending', color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredTasks = tasks.filter(task => 
    filterPriority === 'all' || task.priority === filterPriority
  );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortColumn === 'submittedDate') {
      return sortDirection === 'asc' 
        ? new Date(a[sortColumn]) - new Date(b[sortColumn])
        : new Date(b[sortColumn]) - new Date(a[sortColumn]);
    }
    if (sortColumn === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return sortDirection === 'asc'
        ? priorityOrder[a[sortColumn]] - priorityOrder[b[sortColumn]]
        : priorityOrder[b[sortColumn]] - priorityOrder[a[sortColumn]];
    }
    return 0;
  });

  const getDaysAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 'Today' : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="task-table loading">
        <div className="table-header">
          <h3>Pending Tasks</h3>
          <div className="table-controls">
            <div className="filter-btn disabled">All</div>
            <div className="filter-btn disabled">High</div>
            <div className="filter-btn disabled">Medium</div>
          </div>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-table empty">
        <div className="table-header">
          <h3>Pending Tasks</h3>
          <div className="table-controls">
            <div className="filter-btn disabled">All</div>
            <div className="filter-btn disabled">High</div>
            <div className="filter-btn disabled">Medium</div>
          </div>
        </div>
        <div className="empty-content">
          <div className="empty-icon">✅</div>
          <p>No pending tasks</p>
          <p className="empty-subtext">All caught up!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-table">
      <div className="table-header">
        <h3>
          <span className="header-icon">📋</span>
          Pending Tasks & Approvals
          <span className="task-counter">{sortedTasks.length}</span>
        </h3>
        <div className="table-controls">
          <button 
            className={`filter-btn ${filterPriority === 'all' ? 'active' : ''}`}
            onClick={() => setFilterPriority('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filterPriority === 'high' ? 'active' : ''}`}
            onClick={() => setFilterPriority('high')}
          >
            High
          </button>
          <button 
            className={`filter-btn ${filterPriority === 'medium' ? 'active' : ''}`}
            onClick={() => setFilterPriority('medium')}
          >
            Medium
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="tasks-table">
          <thead>
            <tr>
              <th 
                className="sortable"
                onClick={() => handleSort('serial')}>
                S.No
              </th>
              <th>Employee</th>
              <th 
                className="sortable"
                onClick={() => handleSort('priority')}
              >
                Priority
                {sortColumn === 'priority' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('submittedDate')}
              >
                Submitted
                {sortColumn === 'submittedDate' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const status = getStatusBadge(task.status);
              const daysAgo = getDaysAgo(task.submittedDate);
              
              return (
                <tr key={task.id} className="task-row">
                  <td >
                    <div>{task.serial}</div>
                  </td>
                  <td className="employee-cell">
                    <div className="employee-info">
                      <div className="employee-name">{task.employeeName}</div>
                      <div className="employee-id">{task.employeeId}</div>
                      <div className="employee-dept">{task.department}</div>
                    </div>
                  </td>
                  
                  <td className="priority-cell">
                    <div 
                      className="priority-badge"
                      style={{ 
                        backgroundColor: getPriorityColor(task.priority),
                        color: 'white'
                      }}
                    >
                      {task.priority.toUpperCase()}
                    </div>
                  </td>
                  <td className="date-cell">
                    <div className="date-info">
                      <div className="date-value">{new Date(task.submittedDate).toLocaleDateString()}</div>
                      <div className="date-ago">{daysAgo}</div>
                    </div>
                  </td>
                  <td className="action-cell">
                    <button 
                      className="action-button"
                      onClick={() => onTaskAction(task.id)}
                      title={`Review ${task.taskType} for ${task.employeeName}`}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="footer-stats">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{sortedTasks.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High:</span>
            <span className="stat-value high">
              {tasks.filter(t => t.priority === 'high').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending:</span>
            <span className="stat-value pending">
              {tasks.filter(t => t.status === 'pending').length}
            </span>
          </div>
        </div>
        <button className="view-all-btn" onClick={onViewAll}>
          View All Tasks →
        </button>
      </div>
    </div>
  );
};

export default TaskTable;