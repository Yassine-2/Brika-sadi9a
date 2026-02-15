import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { productsAPI, tasksAPI } from '../services/api';
import '../styles/modals.css';

const AddTaskModal = ({ isOpen, onClose, onTaskCreated, products: externalProducts }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity_needed: 1, task_type: 'out' }]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Use external products if provided, otherwise load them
      if (externalProducts && externalProducts.length > 0) {
        setProducts(externalProducts);
      } else {
        loadProducts();
      }
      // Reset form
      setTitle('');
      setDescription('');
      setItems([{ product_id: '', quantity_needed: 1, task_type: 'out' }]);
      setError('');
    }
  }, [isOpen, externalProducts]);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity_needed: 1, task_type: 'out' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'quantity_needed' ? parseInt(value) || 0 : value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    const validItems = items.filter(item => item.product_id && item.quantity_needed > 0);
    if (validItems.length === 0) {
      setError('Please add at least one product with valid quantity');
      return;
    }

    setLoading(true);
    try {
      await tasksAPI.create({
        title: title || null,
        description: description || null,
        items: validItems.map(item => ({
          product_id: parseInt(item.product_id),
          quantity_needed: item.quantity_needed,
          task_type: item.task_type
        }))
      });
      onTaskCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Task</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Task Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Order Fulfillment #1234"
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description..."
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Products</label>
            <div className="task-items-list">
              {items.map((item, index) => (
                <div key={index} className="task-item-row">
                  <select
                    value={item.product_id}
                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    className="product-select"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={item.quantity_needed}
                    onChange={(e) => updateItem(index, 'quantity_needed', e.target.value)}
                    className="quantity-input"
                    placeholder="Qty"
                  />

                  <div className="type-toggle">
                    <button
                      type="button"
                      className={`type-btn ${item.task_type === 'in' ? 'active in' : ''}`}
                      onClick={() => updateItem(index, 'task_type', 'in')}
                      title="Incoming"
                    >
                      <ArrowDownCircle size={18} />
                      In
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${item.task_type === 'out' ? 'active out' : ''}`}
                      onClick={() => updateItem(index, 'task_type', 'out')}
                      title="Outgoing"
                    >
                      <ArrowUpCircle size={18} />
                      Out
                    </button>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" className="add-item-btn" onClick={addItem}>
              <Plus size={18} />
              Add Another Product
            </button>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
