import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/wishlist')
      .then(({ data }) => {
        setWishlist(Array.isArray(data.wishlist) ? data.wishlist : []);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(productId) {
    try {
      const { data } = await api.delete(`/wishlist/${productId}`);
      setWishlist(Array.isArray(data.wishlist) ? data.wishlist : []);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="wishlist-page">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">YOUR SAVED FINDS</p>
            <h1>Wishlist.</h1>
          </div>
          <Link className="back-link" to="/products">Continue shopping</Link>
        </div>

        {loading ? (
          <p className="catalog-state" role="status">Loading wishlist...</p>
        ) : error ? (
          <p className="catalog-state catalog-error" role="alert">Unable to load wishlist.</p>
        ) : wishlist.length === 0 ? (
          <section className="empty-state">
            <h2>Your wishlist is empty.</h2>
            <p>Save products you love and they will stay here.</p>
            <Link className="details-link" to="/products">Browse products</Link>
          </section>
        ) : (
          <section className="wishlist-grid" aria-label="Wishlist items">
            {wishlist.map((product) => (
              <article className="product-card wishlist-card" key={product._id}>
                <Link className="product-card-image" to={`/products/${product._id}`} aria-label={`View ${product.name}`}>
                  <img src={product.image} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />
                </Link>
                <div className="product-card-content">
                  <p className="product-category">{product.category}</p>
                  <h2>{product.name}</h2>
                  <p className="product-price">{formatPrice(product.price)}</p>
                  <p className={`product-stock${product.stock === 0 ? ' is-out' : ''}`}>
                    {product.stock === 0 ? 'Out of stock' : `${product.stock} ${product.stock === 1 ? 'unit' : 'units'} left`}
                  </p>
                  <div className="wishlist-actions">
                    <Link className="details-link" to={`/products/${product._id}`}>View details</Link>
                    <button className="secondary-button" type="button" onClick={() => handleRemove(product._id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

export default Wishlist;
