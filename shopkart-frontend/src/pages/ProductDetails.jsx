import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getProduct } from '../services/products';
import { useCart } from '../context/useCart';
import api from '../services/api';

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

function ProductDetails() {
  const { id } = useParams();
  const [result, setResult] = useState({ id: null, product: null, error: false });
  const [added, setAdded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToCart, cart } = useCart();

  useEffect(() => {
    api.get('/wishlist')
      .then(({ data }) => {
        const wishlist = Array.isArray(data.wishlist) ? data.wishlist.map((item) => item._id || item) : [];
        setIsSaved(wishlist.includes(id));
      })
      .catch(() => setIsSaved(false));
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    getProduct(id, controller.signal)
      .then(({ data }) => setResult({ id, product: data.product, error: false }))
      .catch(() => { if (!controller.signal.aborted) setResult({ id, product: null, error: true }); });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!result.product) return;
    const isInCart = cart.some((item) => item.product === result.product._id);
    setAdded(isInCart);
  }, [cart, result.product]);

  async function handleToggleWishlist() {
    if (!result.product) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        await api.delete(`/wishlist/${result.product._id}`);
        setIsSaved(false);
      } else {
        await api.post('/wishlist', { productId: result.product._id });
        setIsSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddToCart() {
    if (!result.product) return;
    await addToCart(result.product);
    setAdded(true);
  }

  return <div className="app-shell"><Navbar /><main className="details-page">
    <Link className="back-link" to="/products">&larr; Back to products</Link>
    {result.id !== id ? <p className="catalog-state" role="status">Loading product...</p>
      : result.error || !result.product ? <p className="catalog-state catalog-error" role="alert">Something went wrong while loading this product.</p>
        : <article className="product-detail">
          <div className="detail-image"><img src={result.product.image} alt={result.product.name} onError={(event) => { event.currentTarget.hidden = true; }} /></div>
          <div className="detail-copy">
            <p className="eyebrow">{result.product.category}</p>
            <h1>{result.product.name}</h1>
            <p className="detail-price">{formatPrice(result.product.price)}</p>
            <p className="detail-description">{result.product.description}</p>
            <p className={`product-stock${result.product.stock === 0 ? ' is-out' : ''}`}>
              {result.product.stock === 0 ? 'Out of stock' : `${result.product.stock} ${result.product.stock === 1 ? 'unit' : 'units'} available`}
            </p>
            <div className="detail-actions">
              <button className="add-cart-button" type="button" disabled={result.product.stock === 0} onClick={handleAddToCart}>
                {added ? 'Add another' : 'Add to cart'}
              </button>
              <button
                className={`wishlist-button ${isSaved ? 'is-active' : ''}`}
                type="button"
                aria-label={isSaved ? `Remove ${result.product.name} from wishlist` : `Add ${result.product.name} to wishlist`}
                title={isSaved ? `Remove ${result.product.name} from wishlist` : `Add ${result.product.name} to wishlist`}
                disabled={isSaving}
                onClick={handleToggleWishlist}
              >
                <span aria-hidden="true">{isSaved ? '♥' : '♡'}</span>
              </button>
            </div>
          </div>
        </article>}
  </main></div>;
}

export default ProductDetails;