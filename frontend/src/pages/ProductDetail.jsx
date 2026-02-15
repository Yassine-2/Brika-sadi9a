import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  QrCode, 
  MapPin, 
  AlertCircle, 
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  Minus,
  X
} from 'lucide-react';
import { productsAPI } from '../services/api';
import '../styles/product-detail.css';
import '../styles/modals.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantityChange, setQuantityChange] = useState(0);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [quantityError, setQuantityError] = useState('');
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', image: '', threshold: 10 });
  
  // Position modal state
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [newPosition, setNewPosition] = useState({ position: '', percentage: 0 });
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productsAPI.getById(id);
      setProduct(response.data);
      // Set default position if available and none selected
      if (response.data.positions?.length > 0 && !selectedPositionId) {
        setSelectedPositionId(response.data.positions[0].id);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityUpdate = async (change) => {
    setQuantityError('');
    
    if (!selectedPositionId) {
      setQuantityError('Please select a position first');
      return;
    }
    
    try {
      await productsAPI.updateQuantity(id, change, selectedPositionId);
      loadProduct();
      setQuantityChange(0);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setQuantityError(error.response?.data?.detail || 'Failed to update quantity');
    }
  };

  // Edit handlers
  const openEditModal = () => {
    setEditFormData({
      name: product.name,
      image: product.image || '',
      threshold: product.threshold
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await productsAPI.update(id, editFormData);
      loadProduct();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      await productsAPI.delete(id);
      navigate('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Position handlers
  const handleAddPosition = async (e) => {
    e.preventDefault();
    if (!newPosition.position.trim()) return;
    
    try {
      await productsAPI.addPosition(id, newPosition);
      loadProduct();
      setShowPositionModal(false);
      setNewPosition({ position: '', percentage: 100 });
    } catch (error) {
      console.error('Error adding position:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="empty-state">
        <Package size={60} />
        <h3>Product not found</h3>
      </div>
    );
  }

  return (
    <div className="product-detail">
      {/* Back Button */}
      <button className="back-button" onClick={() => navigate('/products')}>
        <ArrowLeft size={20} />
        Back to Products
      </button>

      <div className="product-detail-grid">
        {/* Main Info */}
        <div className="product-main card">
          <div className="product-image-large">
            {product.image ? (
              <img src={product.image} alt={product.name} />
            ) : (
              <div className="image-placeholder">
                <Package size={80} />
              </div>
            )}
          </div>
          
          <div className="product-header">
            <h1 className="product-title">{product.name}</h1>
            <div className="product-actions">
              <button className="btn btn-secondary" onClick={openEditModal}>
                <Edit size={18} />
                Edit
              </button>
              <button className="btn btn-ghost delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Status Banner */}
          <div className={`status-banner ${product.threshold_status}`}>
            {product.threshold_status === 'below' ? (
              <>
                <AlertCircle size={24} />
                <div>
                  <h4>Low Stock Warning</h4>
                  <p>Current quantity is below threshold ({product.threshold} units)</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle size={24} />
                <div>
                  <h4>Stock Level OK</h4>
                  <p>Current quantity is above threshold ({product.threshold} units)</p>
                </div>
              </>
            )}
          </div>

          {/* QR Code */}
          {product.qr_code && (
            <div className="qr-section">
              {product.qr_code_image ? (
                <img 
                  src={product.qr_code_image} 
                  alt="QR Code" 
                  className="qr-image"
                />
              ) : (
                <div className="qr-icon">
                  <QrCode size={32} />
                </div>
              )}
              <div className="qr-info">
                <span className="qr-label">QR Code</span>
                <span className="qr-value">{product.qr_code}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quantity Panel */}
        <div className="quantity-panel card">
          <h2>Quantity Management</h2>
          
          <div className="quantity-display">
            <span className="quantity-label">Current Stock</span>
            <span className="quantity-value">{product.quantity}</span>
            <span className="quantity-unit">units</span>
          </div>

          <div className="quantity-controls">
            <div className="quantity-row">
              <div className="quantity-input-group">
                <button 
                  className="qty-btn minus"
                  onClick={() => setQuantityChange(prev => prev - 1)}
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(parseInt(e.target.value) || 0)}
                  className="quantity-input"
                  placeholder="Qty"
                />
                <button 
                  className="qty-btn plus"
                  onClick={() => setQuantityChange(prev => prev + 1)}
                >
                  <Plus size={20} />
                </button>
              </div>
              <select
                className="position-select"
                value={selectedPositionId || ''}
                onChange={(e) => setSelectedPositionId(parseInt(e.target.value) || null)}
              >
                <option value="">Select Position</option>
                {product.positions?.map(pos => (
                  <option key={pos.id} value={pos.id}>
                    {pos.position} ({pos.units || 0}/9 units)
                  </option>
                ))}
              </select>
            </div>
            
            {quantityError && (
              <div className="quantity-error">
                {quantityError}
              </div>
            )}
            
            <button 
              className="btn btn-primary update-btn"
              onClick={() => handleQuantityUpdate(quantityChange)}
              disabled={quantityChange === 0 || !selectedPositionId}
            >
              Update Quantity
            </button>
            
            <p className="position-hint">
              <MapPin size={14} /> Each position can hold max 3 units
            </p>
          </div>

          <div className="threshold-info">
            <span className="threshold-label">Threshold</span>
            <span className="threshold-value">{product.threshold} units</span>
          </div>
        </div>

        {/* Positions */}
        <div className="positions-panel card">
          <div className="card-header">
            <h2 className="card-title">Storage Positions</h2>
            <button className="btn btn-secondary small" onClick={() => setShowPositionModal(true)}>
              <Plus size={16} />
              Add Position
            </button>
          </div>
          
          <div className="positions-list">
            {product.positions?.length === 0 ? (
              <div className="empty-positions">
                <MapPin size={32} />
                <p>No positions assigned</p>
              </div>
            ) : (
              product.positions?.map((pos, index) => (
                <div key={index} className="position-item">
                  <div className="position-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="position-info">
                    <div className="position-header">
                      <span className="position-name">{pos.position}</span>
                      <span className="position-units">{pos.units || 0}/9 units</span>
                    </div>
                    <div className="position-bar">
                      <div 
                        className="position-fill" 
                        style={{ width: `${pos.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="position-percentage">{Math.round(pos.percentage)}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Product</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="modal-form">
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={editFormData.image}
                  onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="form-group">
                <label>Threshold</label>
                <input
                  type="number"
                  value={editFormData.threshold}
                  onChange={(e) => setEditFormData({ ...editFormData, threshold: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Product</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-form">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Are you sure you want to delete "{product.name}"? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {showPositionModal && (
        <div className="modal-overlay" onClick={() => setShowPositionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Position</h2>
              <button className="modal-close" onClick={() => setShowPositionModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddPosition} className="modal-form">
              <div className="form-group">
                <label>Position Name</label>
                <input
                  type="text"
                  value={newPosition.position}
                  onChange={(e) => setNewPosition({ ...newPosition, position: e.target.value })}
                  placeholder="e.g., Aisle A, Shelf 3"
                  required
                />
              </div>
              <div className="form-group">
                <label>Percentage (%)</label>
                <input
                  type="number"
                  value={newPosition.percentage}
                  onChange={(e) => setNewPosition({ ...newPosition, percentage: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPositionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
