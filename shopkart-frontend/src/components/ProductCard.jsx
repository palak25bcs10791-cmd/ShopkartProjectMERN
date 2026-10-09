import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

function ProductCard({ product, isSaved, onToggleWishlist, isSaving }) {
  const { addToCart, cart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const inCart = cart.some((item) => item.product === product._id);

  async function handleAddToCart() {
    setIsAdding(true);
    try {
      await addToCart(product);
    } finally {
      setIsAdding(false);
    }
  }

  return <article className="product-card">
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
      <div className="product-actions">
        <Link className="details-link" to={`/products/${product._id}`}>View details</Link>
        <button
          className={`wishlist-button ${isSaved ? 'is-active' : ''}`}
          type="button"
          aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          title={isSaved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          disabled={isSaving}
          onClick={() => onToggleWishlist(product)}
        >
          <span aria-hidden="true">{isSaved ? '♥' : '♡'}</span>
        </button>
      </div>
      <button className="secondary-button" type="button" disabled={product.stock === 0 || isAdding} onClick={handleAddToCart}>
        {product.stock === 0 ? 'Out of stock' : isAdding ? 'Adding...' : inCart ? 'Add Another' : 'Add to cart'}
      </button>
    </div>
  </article>;
}

export default ProductCard;