import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { productsAPI } from '../services/api';
import AddProductModal from '../components/AddProductModal';
import '../styles/products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.qr_code?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/products/${productId}`);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="products-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your warehouse inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowProductModal(true)}>
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onProductCreated={loadProducts}
      />

      {/* Search Bar */}
      <div className="search-bar">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search products by name or QR code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="empty-state full-width">
            <Package size={60} />
            <h3>No products found</h3>
            <p>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Start by adding your first product'}
            </p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => handleProductClick(product.id)}
            >
              <div className="product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <Package size={48} />
                )}
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-meta">
                  <span className="product-quantity">
                    Qty: {product.quantity}
                  </span>
                  <span className={`product-status ${product.threshold_status}`}>
                    {product.threshold_status === 'below' ? (
                      <>
                        <AlertCircle size={14} />
                        Low Stock
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        In Stock
                      </>
                    )}
                  </span>
                </div>
                {product.qr_code && (
                  <span className="product-qr">QR: {product.qr_code}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Products;
