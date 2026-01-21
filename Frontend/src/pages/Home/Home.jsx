import React, { useState, useEffect } from 'react';
import ImageSlider from '../../components/common/ImageSlider/ImageSlider';
import ModuleCard from '../../components/common/ModuleCard/ModuleCard';
import TaskTable from '../../components/home/TaskTable/TaskTable';
import './Home.css';

const Home = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const modules = [
    {
      title: "HRMS",
      description: "Human Resource Management System for employee and attendance management.",
      image: "/images/modules/hr.jpg",
      link: "/hr",
      color: "blue",
      icon: "👥",
      size: "medium"
    },
    {
      title: "Inventory",
      description: "Track and manage organization inventory, assets, and supplies with real-time monitoring.",
      image: "/images/modules/inventory.jpg",
      link: "/inventory",
      color: "green",
      icon: "📦",
      size: "medium"
    },
    {
      title: "Complaints Management",
      description: "Manage complaints and feedback from employees and customers.",
      image: "/images/modules/complaints.jpg",
      link: "/complaints",
      color: "orange",
      icon: "📝",
      size: "medium"
    },
    {
      title: "Digital Library",
      description: "Manage digital resources, e-books, and research materials efficiently.",
      image: "/images/modules/library.jpg",
      link: "/library",
      color: "purple",
      icon: "📚",
      size: "medium"
    },
    {
      title: "Canteen Management",
      description: "Manage canteen operations, menu planning, orders, and billing efficiently.",
      image: "/images/modules/bills1.jpg",
      link: "/canteen",
      color: "red",
      icon: "🍽️",
      size: "medium"
    },
    {
      title: "Gallery Management",
      description: "Organize and showcase images and media from organizational events.",
      image: "/images/modules/gallery.jpg",
      link: "/gallery",
      color: "pink",
      icon: "🖼️",
      size: "medium"
    }
  ];

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Simulate API call - replace with actual API
        const mockTasks = [
          {
            id: 1,
            serial: '001',
            employeeName: 'M. ALI',
            employeeId: 'EMP-2024-001',
            taskType: 'Leave Approval',
            taskDetail: 'Annual Leave Request for 5 days starting Jan 15',
            department: 'HR',
            submittedDate: '2024-12-20',
            priority: 'high',
            status: 'pending'
          },
          {
            id: 2,
            serial: '002',
            employeeName: 'M. Nafees',
            employeeId: 'EMP-2024-002',
            taskType: 'Expense Approval',
            taskDetail: 'Business travel expenses for December conference',
            department: 'Finance',
            submittedDate: '2024-12-19',
            priority: 'medium',
            status: 'pending'
          },
          {
            id: 3,
            serial: '003',
            employeeName: 'Abdul Niaz',
            employeeId: 'EMP-2024-003',
            taskType: 'Inventory Request',
            taskDetail: 'New laptop and accessories for new team member',
            department: 'IT',
            submittedDate: '2024-12-18',
            priority: 'low',
            status: 'pending'
          },
          {
            id: 4,
            serial: '004',
            employeeName: 'Naseem Shah',
            employeeId: 'EMP-2024-004',
            taskType: 'Training Approval',
            taskDetail: 'Advanced Excel training course request',
            department: 'Training',
            submittedDate: '2024-12-17',
            priority: 'medium',
            status: 'pending'
          },
          {
            id: 5,
            serial: '005',
            employeeName: 'Irbar Hussain',
            employeeId: 'EMP-2024-005',
            taskType: 'Contract Review',
            taskDetail: 'Vendor contract renewal for office supplies',
            department: 'Procurement',
            submittedDate: '2024-12-16',
            priority: 'high',
            status: 'pending'
          },
          {
            id: 6,
            serial: '006',
            employeeName: 'Niaz Ali',
            employeeId: 'EMP-2024-006',
            taskType: 'Equipment Request',
            taskDetail: 'Request for standing desk and ergonomic chair',
            department: 'Facilities',
            submittedDate: '2024-12-15',
            priority: 'medium',
            status: 'pending'
          },
          {
            id: 7,
            serial: '007',
            employeeName: 'Israr',
            employeeId: 'EMP-2024-007',
            taskType: 'Software License',
            taskDetail: 'Adobe Creative Cloud license renewal',
            department: 'IT',
            submittedDate: '2024-12-14',
            priority: 'high',
            status: 'pending'
          },
          {
            id: 8,
            serial: '008',
            employeeName: 'Saqlain',
            employeeId: 'EMP-2024-008',
            taskType: 'Conference Approval',
            taskDetail: 'Tech conference attendance request',
            department: 'Marketing',
            submittedDate: '2024-12-13',
            priority: 'low',
            status: 'pending'
          }
        ];
        setTasks(mockTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleTaskAction = (taskId) => {
    alert(`Opening approval form for task ID: ${taskId}`);
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleViewAllTasks = () => {
    alert('Navigating to Pending Tasks page...');
  };

  return (
    <div className="home-page">
      {/* Full Screen Image Slider */}
      <div className="slider-section">
        <ImageSlider />
      </div>

      {/* Main Content Area with equal spacing */}
      <div className="dashboard-section">
        {/* Left Column: Modules Dashboard (2/3 width) */}
        <div className="modules-column">
          <div className="modules-header">
            <h2 className="section-title">Modules Dashboard</h2>
            <p className="section-subtitle">
              Access all your management tools from one centralized location
            </p>
          </div>
          
          <div className="modules-grid">
            {modules.map((module, index) => (
              <ModuleCard 
                key={index} 
                module={module}
                data-color={module.color}
                data-size={module.size}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Task Table (1/3 width) */}
        <div className="task-column">
          <div className="task-table-container">
            <TaskTable 
              tasks={tasks}
              onTaskAction={handleTaskAction}
              onViewAll={handleViewAllTasks}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;