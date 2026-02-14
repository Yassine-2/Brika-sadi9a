import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { productsAPI, tasksAPI } from '../services/api';
import '../styles/dashboard.css';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, tasksRes] = await Promise.all([
        productsAPI.getAll(),
        tasksAPI.getAll({ state: 'ongoing' })
      ]);
      
      setProducts(productsRes.data);
      setTasks(tasksRes.data);
      setLowStockProducts(productsRes.data.filter(p => p.threshold_status === 'below'));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate storage data
  const totalCapacity = 1000; // Example capacity
  const usedStorage = products.reduce((sum, p) => sum + p.quantity, 0);
  const storagePercentage = Math.round((usedStorage / totalCapacity) * 100);

  const storageData = [
    { name: 'Used', value: usedStorage, color: '#a855f7' },
    { name: 'Available', value: Math.max(0, totalCapacity - usedStorage), color: '#1e293b' }
  ];

  // Mock warehouse map positions
  const warehousePositions = [
    { id: 'A1', x: 10, y: 10, filled: 80 },
    { id: 'A2', x: 35, y: 10, filled: 45 },
    { id: 'A3', x: 60, y: 10, filled: 100 },
    { id: 'B1', x: 10, y: 40, filled: 20 },
    { id: 'B2', x: 35, y: 40, filled: 60 },
    { id: 'B3', x: 60, y: 40, filled: 0 },
    { id: 'C1', x: 10, y: 70, filled: 90 },
    { id: 'C2', x: 35, y: 70, filled: 30 },
    { id: 'C3', x: 60, y: 70, filled: 55 },
  ];

  const getPositionColor = (filled) => {
    if (filled === 0) return 'rgba(148, 163, 184, 0.2)';
    if (filled < 30) return 'rgba(34, 197, 94, 0.6)';
    if (filled < 70) return 'rgba(250, 204, 21, 0.6)';
    return 'rgba(239, 68, 68, 0.6)';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Warehouse overview and management</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} />
          Add Task
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="alert-banner">
          <div className="alert-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="alert-content">
            <h3>Low Stock Alert</h3>
            <p>
              {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} below threshold: 
              {' '}{lowStockProducts.map(p => p.name).join(', ')}
            </p>
          </div>
          <button className="btn btn-secondary">
            View Products
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Warehouse Map */}
        <div className="card warehouse-map-card">
          <div className="card-header">
            <h2 className="card-title">Warehouse Map</h2>
            <div className="map-legend">
              <span className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(34, 197, 94, 0.6)' }}></div>
                Low
              </span>
              <span className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(250, 204, 21, 0.6)' }}></div>
                Medium
              </span>
              <span className="legend-item">
                <div className="legend-color" style={{ background: 'rgba(239, 68, 68, 0.6)' }}></div>
                High
              </span>
            </div>
          </div>
          <div className="warehouse-map">
            <svg viewBox="0 0 100 100" className="map-svg">
              {warehousePositions.map(pos => (
                <g key={pos.id}>
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width="20"
                    height="20"
                    rx="3"
                    fill={getPositionColor(pos.filled)}
                    stroke="rgba(148, 163, 184, 0.3)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={pos.x + 10}
                    y={pos.y + 12}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="4"
                    fontWeight="600"
                  >
                    {pos.id}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Tasks In Progress */}
        <div className="card tasks-card">
          <div className="card-header">
            <h2 className="card-title">Tasks In Progress</h2>
            <span className="task-count">{tasks.length} active</span>
          </div>
          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <Package size={40} />
                <p>No active tasks</p>
              </div>
            ) : (
              tasks.slice(0, 5).map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-info">
                    <h4>{task.title || `Task #${task.id}`}</h4>
                    <p>{task.items?.length || 0} items</p>
                  </div>
                  <div className="task-status">
                    <span className="status-badge ongoing">Ongoing</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {tasks.length > 5 && (
            <button className="btn btn-ghost view-all">
              View all tasks
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Storage Chart */}
        <div className="card storage-card">
          <div className="card-header">
            <h2 className="card-title">Storage Capacity</h2>
          </div>
          <div className="storage-chart">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={storageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {storageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="storage-percentage">
              <span className="percentage-value">{storagePercentage}%</span>
              <span className="percentage-label">Used</span>
            </div>
          </div>
          <div className="storage-details">
            <div className="storage-stat">
              <span className="stat-label">Used</span>
              <span className="stat-value">{usedStorage.toLocaleString()} units</span>
            </div>
            <div className="storage-stat">
              <span className="stat-label">Available</span>
              <span className="stat-value">{(totalCapacity - usedStorage).toLocaleString()} units</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
