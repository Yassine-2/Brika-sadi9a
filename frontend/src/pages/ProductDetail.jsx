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
  Minus
} from 'lucide-react';
import { productsAPI } from '../services/api';
import '../styles/product-detail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantityChange, setQuantityChange] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productsAPI.getById(id);
      setProduct(response.data);
    } catch (error) {
      console.error('Error loading product:', error);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityUpdate = async (change) => {
    try {
      await productsAPI.updateQuantity(id, change);
      loadProduct();
      setQuantityChange(0);
    } catch (error) {
      console.error('Error updating quantity:', error);
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
              <button className="btn btn-secondary">
                <Edit size={18} />
                Edit
              </button>
              <button className="btn btn-ghost delete-btn">
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
              />
              <button 
                className="qty-btn plus"
                onClick={() => setQuantityChange(prev => prev + 1)}
              >
                <Plus size={20} />
              </button>
            </div>
            <button 
              className="btn btn-primary update-btn"
              onClick={() => handleQuantityUpdate(quantityChange)}
              disabled={quantityChange === 0}
            >
              Update Quantity
            </button>
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
            <button className="btn btn-secondary small">
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
                    <span className="position-name">{pos.position}</span>
                    <div className="position-bar">
                      <div 
                        className="position-fill" 
                        style={{ width: `${pos.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="position-percentage">{pos.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
