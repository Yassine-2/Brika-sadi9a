import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import { productsAPI } from '../services/api';
import '../styles/modals.css';

const AddProductModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    quantity: 0,
    threshold: 10,
    positions: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setFormData({
        name: '',
        image: '',
        quantity: 0,
        threshold: 10,
        positions: []
      });
      setError('');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'threshold' ? parseInt(value) || 0 : value
    }));
  };

  const addPosition = () => {
    setFormData(prev => ({
      ...prev,
      positions: [...prev.positions, { position: '', percentage: 100 }]
    }));
  };

  const removePosition = (index) => {
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.filter((_, i) => i !== index)
    }));
  };

  const updatePosition = (index, field, value) => {
    const newPositions = [...formData.positions];
    newPositions[index][field] = field === 'percentage' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, positions: newPositions }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    setLoading(true);
    try {
      await productsAPI.create({
        name: formData.name,
        image: formData.image || null,
        quantity: formData.quantity,
        threshold: formData.threshold,
        positions: formData.positions.filter(p => p.position.trim())
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Product</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              required
            />
            <span className="form-hint">QR code will be auto-generated</span>
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Initial Quantity</label>
              <input
                type="number"
                name="quantity"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Low Stock Threshold</label>
              <input
                type="number"
                name="threshold"
                min="0"
                value={formData.threshold}
                onChange={handleChange}
              />
              <span className="form-hint">Alert when stock falls below this</span>
            </div>
          </div>

          <div className="form-group">
            <label>Storage Positions</label>
            <div className="positions-list">
              {formData.positions.map((pos, index) => (
                <div key={index} className="position-row">
                  <input
                    type="text"
                    value={pos.position}
                    onChange={(e) => updatePosition(index, 'position', e.target.value)}
                    placeholder="e.g., Shelf-A1"
                    className="position-input"
                  />
                  <div className="percentage-input">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pos.percentage}
                      onChange={(e) => updatePosition(index, 'percentage', e.target.value)}
                    />
                    <span>%</span>
                  </div>
                  <button
                    type="button"
                    className="remove-item-btn"
                    onClick={() => removePosition(index)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="add-item-btn" onClick={addPosition}>
              <Plus size={18} />
              Add Position
            </button>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
