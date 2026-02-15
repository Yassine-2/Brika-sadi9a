import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, MapPin } from 'lucide-react';
import { productsAPI } from '../services/api';
import '../styles/modals.css';

const MAX_UNITS_PER_POSITION = 9;

const AddProductModal = ({ isOpen, onClose, onProductCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    threshold: 10,
    positions: [{ position: '', units: 0 }]  // Start with one position
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form with one empty position
      setFormData({
        name: '',
        image: '',
        threshold: 10,
        positions: [{ position: '', units: 0 }]
      });
      setError('');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'threshold' ? parseInt(value) || 0 : value
    }));
  };

  const addPosition = () => {
    setFormData(prev => ({
      ...prev,
      positions: [...prev.positions, { position: '', units: 0 }]
    }));
  };

  const removePosition = (index) => {
    if (formData.positions.length <= 1) {
      setError('At least one position is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.filter((_, i) => i !== index)
    }));
  };

  const updatePosition = (index, field, value) => {
    const newPositions = [...formData.positions];
    if (field === 'units') {
      const units = parseInt(value) || 0;
      newPositions[index][field] = Math.min(Math.max(0, units), MAX_UNITS_PER_POSITION);
    } else {
      newPositions[index][field] = value;
    }
    setFormData(prev => ({ ...prev, positions: newPositions }));
  };

  // Calculate total quantity from all positions
  const totalQuantity = formData.positions.reduce((sum, pos) => sum + (pos.units || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    // Validate positions
    const validPositions = formData.positions.filter(p => p.position.trim());
    if (validPositions.length === 0) {
      setError('At least one position with a name is required');
      return;
    }

    // Check if any position has units
    const hasUnits = validPositions.some(p => p.units > 0);
    if (!hasUnits) {
      setError('At least one position must have units');
      return;
    }

    setLoading(true);
    try {
      await productsAPI.create({
        name: formData.name,
        image: formData.image || null,
        quantity: totalQuantity,
        threshold: formData.threshold,
        positions: validPositions.map(p => ({
          position: p.position,
          units: p.units,
          percentage: (p.units / MAX_UNITS_PER_POSITION) * 100
        }))
      });
      onProductCreated?.();
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

          <div className="form-group">
            <label><MapPin size={16} /> Storage Positions *</label>
            <span className="form-hint">Each position can hold max {MAX_UNITS_PER_POSITION} units</span>
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
                  <div className="units-input">
                    <input
                      type="number"
                      min="0"
                      max={MAX_UNITS_PER_POSITION}
                      value={pos.units}
                      onChange={(e) => updatePosition(index, 'units', e.target.value)}
                    />
                    <span>/{MAX_UNITS_PER_POSITION}</span>
                  </div>
                  <button
                    type="button"
                    className="remove-item-btn"
                    onClick={() => removePosition(index)}
                    disabled={formData.positions.length <= 1}
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
