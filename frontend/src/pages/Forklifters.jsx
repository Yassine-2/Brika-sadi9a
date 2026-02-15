import { useState, useEffect } from 'react';
import { forkliftsAPI } from '../services/api';
import { 
  Truck, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Wrench,
  MapPin,
  X,
  Play,
  Calendar
} from 'lucide-react';
import '../styles/forklifters.css';

const Forklifters = () => {
  const [forklifts, setForklifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedForklift, setSelectedForklift] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    image: '',
    video_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [forkliftsRes, summaryRes] = await Promise.all([
        forkliftsAPI.getAll(),
        forkliftsAPI.getSummary()
      ]);
      setForklifts(forkliftsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      setError('Failed to load forklifters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await forkliftsAPI.create(formData);
      setShowAddModal(false);
      setFormData({ name: '', position: '', image: '', video_url: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to add forklift:', err);
    }
  };

  const handleRecordMaintenance = async (id) => {
    try {
      await forkliftsAPI.recordMaintenance(id);
      fetchData();
    } catch (err) {
      console.error('Failed to record maintenance:', err);
    }
  };

  const handleToggleTask = async (forklift) => {
    try {
      if (forklift.has_ongoing_task) {
        await forkliftsAPI.completeTask(forklift.id);
      } else {
        await forkliftsAPI.assignTask(forklift.id);
      }
      fetchData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleToggleState = async (forklift) => {
    try {
      const newState = forklift.state === 'sane' ? 'trouble' : 'sane';
      await forkliftsAPI.update(forklift.id, { state: newState });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle state:', err);
    }
  };

  const openVideoModal = (forklift) => {
    setSelectedForklift(forklift);
    setShowVideoModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const getDaysUntilMaintenance = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    const maintenance = new Date(dateStr);
    const diffTime = maintenance - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="forklifters-page">
        <div className="loading">Loading forklifters...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forklifters-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="forklifters-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Truck size={28} /> Forklifters</h1>
          <p>Manage your industrial fleet</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Forklift
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card total">
            <Truck size={24} />
            <div className="summary-info">
              <span className="summary-value">{summary.total}</span>
              <span className="summary-label">Total Forklifts</span>
            </div>
          </div>
          <div className="summary-card sane">
            <CheckCircle2 size={24} />
            <div className="summary-info">
              <span className="summary-value">{summary.sane_count}</span>
              <span className="summary-label">Operational</span>
            </div>
          </div>
          <div className="summary-card trouble">
            <AlertTriangle size={24} />
            <div className="summary-info">
              <span className="summary-value">{summary.trouble_count}</span>
              <span className="summary-label">In Trouble</span>
            </div>
          </div>
          <div className="summary-card maintenance">
            <Calendar size={24} />
            <div className="summary-info">
              <span className="summary-value">
                {summary.closest_maintenance ? formatDate(summary.closest_maintenance) : 'None'}
              </span>
              <span className="summary-label">Next Maintenance</span>
            </div>
          </div>
        </div>
      )}

      {/* Forklifts Grid */}
      <div className="forklifts-grid">
        {forklifts.length === 0 ? (
          <div className="empty-state">
            <Truck size={48} />
            <p>No forklifters yet. Add your first one!</p>
          </div>
        ) : (
          forklifts.map((forklift) => {
            const daysUntil = getDaysUntilMaintenance(forklift.next_maintenance);
            const maintenanceSoon = daysUntil !== null && daysUntil <= 7;
            const maintenanceOverdue = daysUntil !== null && daysUntil < 0;

            return (
              <div 
                key={forklift.id} 
                className={`forklift-card ${forklift.state}`}
              >
                <div className="forklift-header">
                  <div className="forklift-image">
                    {forklift.image ? (
                      <img src={forklift.image} alt={forklift.name} />
                    ) : (
                      <Truck size={48} />
                    )}
                  </div>
                  <div className={`state-badge ${forklift.state}`}>
                    {forklift.state === 'sane' ? (
                      <><CheckCircle2 size={14} /> Operational</>
                    ) : (
                      <><AlertTriangle size={14} /> Trouble</>
                    )}
                  </div>
                </div>

                <div className="forklift-body">
                  <h3>{forklift.name}</h3>
                  
                  <div className="forklift-details">
                    <div className="detail-item">
                      <MapPin size={16} />
                      <span>{forklift.position || 'Unknown'}</span>
                    </div>
                    
                    <div className="detail-item">
                      <Clock size={16} />
                      <span className={forklift.has_ongoing_task ? 'busy' : 'free'}>
                        {forklift.has_ongoing_task ? 'Busy' : 'Available'}
                      </span>
                    </div>

                    <div className={`detail-item maintenance ${maintenanceOverdue ? 'overdue' : maintenanceSoon ? 'soon' : ''}`}>
                      <Wrench size={16} />
                      <span>
                        {maintenanceOverdue 
                          ? `Overdue by ${Math.abs(daysUntil)} days`
                          : maintenanceSoon 
                            ? `Due in ${daysUntil} days`
                            : `Next: ${formatDate(forklift.next_maintenance)}`
                        }
                      </span>
                    </div>

                    <div className="detail-item">
                      <Calendar size={16} />
                      <span>Last: {formatDate(forklift.last_maintenance)}</span>
                    </div>
                  </div>
                </div>

                <div className="forklift-actions">
                  {forklift.video_url && (
                    <button 
                      className="btn-icon video"
                      onClick={() => openVideoModal(forklift)}
                      title="View Camera Feed"
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button 
                    className="btn-icon maintenance"
                    onClick={() => handleRecordMaintenance(forklift.id)}
                    title="Record Maintenance"
                  >
                    <Wrench size={16} />
                  </button>
                  <button 
                    className={`btn-icon task ${forklift.has_ongoing_task ? 'active' : ''}`}
                    onClick={() => handleToggleTask(forklift)}
                    title={forklift.has_ongoing_task ? 'Complete Task' : 'Assign Task'}
                  >
                    <Clock size={16} />
                  </button>
                  <button 
                    className={`btn-icon state ${forklift.state}`}
                    onClick={() => handleToggleState(forklift)}
                    title="Toggle State"
                  >
                    {forklift.state === 'sane' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Forklift</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Forklift name or ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., Zone A, Dock 3"
                />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="form-group">
                <label>Video Feed URL</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://example.com/video-feed"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Forklift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <img
                src="http://192.168.1.185:5001/video_feed"
                alt={`${selectedForklift.name} live feed`}
                className="video-stream"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forklifters;
