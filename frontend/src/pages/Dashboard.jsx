import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Package, ArrowRight, X, Truck, CheckCircle2, Wrench, Play, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { productsAPI, tasksAPI, forkliftsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddTaskModal from '../components/AddTaskModal';
import '../styles/dashboard.css';

// Forklift animation paths with waypoints (defined outside component for stability)
const FORKLIFT_PATHS = {
  'forklift3': [
    { x: 26, y: 45 },
    { x: 26, y: 65 },
    { x: 63, y: 65 }
  ],
  'forklift11': [
    { x: 49, y: 26 },
    { x: 46, y: 26 },
    { x: 46, y: 17 },
    { x: 26, y: 17 }
  ],
  'forklift12': [
    { x: 68, y: 85 },
    { x: 49, y: 85 },
    { x: 49, y: 91 },
    { x: 26, y: 91 }
  ]
};

const Dashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  
  // Industrial mode state
  const [forklifts, setForklifts] = useState([]);
  const [forkliftSummary, setForkliftSummary] = useState(null);
  const [selectedForklift, setSelectedForklift] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [forkliftPositions, setForkliftPositions] = useState({});

  const isIndustrialMode = user?.modes?.includes('industrial');

  useEffect(() => {
    loadData();
  }, []);

  // Smooth animation effect for forklifts
  useEffect(() => {
    if (!isIndustrialMode || forklifts.length === 0) return;

    // Animation state for each forklift
    const animationState = {};
    forklifts.forEach((forklift, index) => {
      const pathKey = index === 0 ? 'forklift3' : index === 1 ? 'forklift11' : 'forklift12';
      const path = FORKLIFT_PATHS[pathKey];
      if (path) {
        animationState[forklift.id] = {
          pathKey,
          segmentIndex: 0,
          progress: 0, // 0 to 1 within current segment
          speed: 0.002 + Math.random() * 0.001 // Slower speeds for realistic forklift movement
        };
      }
    });

    // Initialize positions
    const initialPositions = {};
    forklifts.forEach((forklift, index) => {
      const pathKey = index === 0 ? 'forklift3' : index === 1 ? 'forklift11' : 'forklift12';
      const path = FORKLIFT_PATHS[pathKey];
      if (path) {
        initialPositions[forklift.id] = { x: path[0].x, y: path[0].y };
      }
    });
    setForkliftPositions(initialPositions);

    let animationFrameId;
    let lastTime = performance.now();

    const animate = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 16.67; // Normalize to ~60fps
      lastTime = currentTime;

      setForkliftPositions(prev => {
        const newPositions = { ...prev };

        Object.keys(animationState).forEach(forkliftId => {
          const state = animationState[forkliftId];
          const path = FORKLIFT_PATHS[state.pathKey];

          if (!path || state.segmentIndex >= path.length - 1) return;

          // Update progress along current segment
          state.progress += state.speed * deltaTime;

          if (state.progress >= 1) {
            // Move to next segment
            state.progress = 0;
            state.segmentIndex++;

            // If reached end of path, stay at final position
            if (state.segmentIndex >= path.length - 1) {
              state.segmentIndex = path.length - 2;
              state.progress = 1;
            }
          }

          // Interpolate position between current and next waypoint
          const from = path[state.segmentIndex];
          const to = path[state.segmentIndex + 1];

          // Smooth easing function (ease-in-out)
          const easeProgress = state.progress < 0.5
            ? 2 * state.progress * state.progress
            : 1 - Math.pow(-2 * state.progress + 2, 2) / 2;

          newPositions[forkliftId] = {
            x: from.x + (to.x - from.x) * easeProgress,
            y: from.y + (to.y - from.y) * easeProgress
          };
        });

        return newPositions;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isIndustrialMode, forklifts]);

  const loadData = async () => {
    try {
      const [productsRes, tasksRes] = await Promise.all([
        productsAPI.getAll(),
        tasksAPI.getAll({ state: 'ongoing' })
      ]);
      
      setProducts(productsRes.data);
      setTasks(tasksRes.data);
      setLowStockProducts(productsRes.data.filter(p => p.threshold_status === 'below'));

      // Load forklift data for industrial mode
      if (isIndustrialMode) {
        const [forkliftsRes, summaryRes] = await Promise.all([
          forkliftsAPI.getAll(),
          forkliftsAPI.getSummary()
        ]);
        setForklifts(forkliftsRes.data);
        setForkliftSummary(summaryRes.data);
      }
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
    { name: 'Used', value: usedStorage || 1, color: '#a855f7' },
    { name: 'Available', value: Math.max(1, totalCapacity - usedStorage), color: '#334155' }
  ];

  // Mock warehouse map positions
  const warehousePositions = [
    { id: 'A1', uniqueId: 'WH-A1-001', x: 10, y: 10, filled: 80, products: ['Widget A', 'Widget B'] },
    { id: 'A2', uniqueId: 'WH-A2-002', x: 35, y: 10, filled: 45, products: ['Gadget X'] },
    { id: 'A3', uniqueId: 'WH-A3-003', x: 60, y: 10, filled: 100, products: ['Component Y', 'Part Z'] },
    { id: 'B1', uniqueId: 'WH-B1-004', x: 10, y: 40, filled: 20, products: ['Item C'] },
    { id: 'B2', uniqueId: 'WH-B2-005', x: 35, y: 40, filled: 60, products: ['Product D'] },
    { id: 'B3', uniqueId: 'WH-B3-006', x: 60, y: 40, filled: 0, products: [] },
    { id: 'C1', uniqueId: 'WH-C1-007', x: 10, y: 70, filled: 90, products: ['Item E', 'Item F'] },
    { id: 'C2', uniqueId: 'WH-C2-008', x: 35, y: 70, filled: 30, products: ['Product G'] },
    { id: 'C3', uniqueId: 'WH-C3-009', x: 60, y: 70, filled: 55, products: ['Component H'] },
  ];

  const handlePositionClick = (position) => {
    setSelectedPosition(position);
  };

  const getPositionColor = (filled) => {
    if (filled === 0) return 'rgba(148, 163, 184, 0.2)';
    if (filled < 30) return 'rgba(52, 211, 153, 0.7)';  // Emerald
    if (filled < 70) return 'rgba(251, 191, 36, 0.7)';  // Amber
    return 'rgba(248, 113, 113, 0.7)';  // Rose
  };

  // Industrial mode helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const troubleForklifts = forklifts.filter(f => f.state === 'trouble');

  const openForkliftVideo = (forklift) => {
    setSelectedForklift(forklift);
    setShowVideoModal(true);
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Warehouse overview and management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
          <Plus size={20} />
          Add Task
        </button>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        products={products}
        onTaskCreated={loadData}
      />

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

      {/* Industrial Mode: Forklift Trouble Alert */}
      {isIndustrialMode && troubleForklifts.length > 0 && (
        <div className="alert-banner trouble">
          <div className="alert-icon">
            <Truck size={24} />
          </div>
          <div className="alert-content">
            <h3>Forklift Alert</h3>
            <p>
              {troubleForklifts.length} forklift{troubleForklifts.length > 1 ? 's' : ''} in trouble: 
              {' '}{troubleForklifts.map(f => f.name).join(', ')}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/forklifters'}>
            View Forklifters
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Warehouse Map - Different view based on mode */}
        <div className="card warehouse-map-card">
          <div className="card-header">
            <h2 className="card-title">Warehouse Map</h2>
            {isIndustrialMode ? (
              <div className="map-legend">
                <span className="legend-item">
                  <div className="legend-color blinking sane"></div>
                  Operational
                </span>
                <span className="legend-item">
                  <div className="legend-color blinking trouble"></div>
                  Trouble
                </span>
              </div>
            ) : (
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
            )}
          </div>
          
          {isIndustrialMode ? (
            /* Industrial Mode: Map.png with forklift points */
            <div className="forklift-map">
              <div className="map-container">
                <div className="map-background with-image">
                  <img src="/map.png" alt="Warehouse Map" className="warehouse-map-image" />
                  
                  {/* Forklift Points */}
                  {forklifts.map((forklift) => {
                    const pos = forkliftPositions[forklift.id];
                    if (!pos) return null;

                    return (
                      <div
                        key={forklift.id}
                        className={`forklift-point ${forklift.state} ${forklift.video_url ? 'clickable' : ''}`}
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`
                        }}
                        onClick={() => forklift.video_url && openForkliftVideo(forklift)}
                        title={`${forklift.name} - ${forklift.state === 'sane' ? 'Operational' : 'Trouble'}`}
                      >
                        <span className="point-pulse"></span>
                        <Truck size={12} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Business Mode: SVG warehouse map */
            <div className="warehouse-map">
              <svg viewBox="0 0 100 100" className="map-svg">
                {warehousePositions.map(pos => (
                  <g 
                    key={pos.id} 
                    className="map-position"
                    onClick={() => handlePositionClick(pos)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width="20"
                      height="20"
                      rx="3"
                      fill={getPositionColor(pos.filled)}
                      stroke={selectedPosition?.id === pos.id ? '#a855f7' : 'rgba(148, 163, 184, 0.3)'}
                      strokeWidth={selectedPosition?.id === pos.id ? '1.5' : '0.5'}
                      className="position-rect"
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
              
              {/* Position Details Popup */}
              {selectedPosition && (
                <div className="position-popup">
                  <div className="popup-header">
                    <h4>Position {selectedPosition.id}</h4>
                    <button className="popup-close" onClick={() => setSelectedPosition(null)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="popup-content">
                    <div className="popup-row">
                      <span className="popup-label">Unique ID:</span>
                      <span className="popup-value">{selectedPosition.uniqueId}</span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Capacity Used:</span>
                      <span className="popup-value">{selectedPosition.filled}%</span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Products:</span>
                      <span className="popup-value">
                        {selectedPosition.products.length > 0 
                          ? selectedPosition.products.join(', ') 
                          : 'Empty'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
            <div className="chart-wrapper">
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
            </div>
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

      {/* Industrial Mode Section */}
      {isIndustrialMode && (
        <>
          <div className="industrial-section">
            <h2 className="section-title"><Truck size={24} /> Fleet Overview</h2>

            {/* Forklift Summary Cards */}
            {forkliftSummary && (
              <div className="forklift-summary-cards">
                <div className="summary-card total">
                  <div className="summary-icon">
                    <Truck size={24} />
                  </div>
                  <div className="summary-info">
                    <span className="summary-value">{forkliftSummary.total}</span>
                    <span className="summary-label">Total Fleet</span>
                  </div>
                </div>
                <div className="summary-card sane">
                  <div className="summary-icon">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="summary-info">
                    <span className="summary-value">{forkliftSummary.sane_count}</span>
                    <span className="summary-label">Operational</span>
                  </div>
                </div>
                <div className="summary-card trouble">
                  <div className="summary-icon">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="summary-info">
                    <span className="summary-value">{forkliftSummary.trouble_count}</span>
                    <span className="summary-label">In Trouble</span>
                  </div>
                </div>
                <div className="summary-card maintenance">
                  <div className="summary-icon">
                    <Calendar size={24} />
                  </div>
                  <div className="summary-info">
                    <span className="summary-value">
                      {forkliftSummary.closest_maintenance 
                        ? formatDate(forkliftSummary.closest_maintenance) 
                        : 'None scheduled'}
                    </span>
                    <span className="summary-label">Next Maintenance</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Modal */}
          {showVideoModal && selectedForklift && (
            <div className="modal-overlay" onClick={() => setShowVideoModal(false)}>
              <div className="modal video-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{selectedForklift.name} - Live Feed (QR Detection)</h2>
                  <button className="close-btn" onClick={() => setShowVideoModal(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="video-container">
                  {/* Processed stream with QR detection from FastAPI */}
                  <img
                    src="http://localhost:8000/video/feed"
                    alt={`${selectedForklift.name} live feed with QR detection`}
                    className="video-stream"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
