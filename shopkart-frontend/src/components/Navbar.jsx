import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/useCart';

function Navbar() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    api.get('/wishlist')
      .then(({ data }) => setWishlistCount(Array.isArray(data.wishlist) ? data.wishlist.length : 0))
      .catch(() => setWishlistCount(0));
  }, []);

  async function handleLogout() {
    await api.post('/logout');
    navigate('/login', { replace: true });
  }

  return (
    <header className="navbar">
      <Link className="brand" to="/home">SHOPKART<span>.</span></Link>
      <nav className="navbar-actions" aria-label="Main navigation">
        <Link className="catalog-nav-link" to="/products">Shop products</Link>
        <Link className="catalog-nav-link" to="/wishlist">Wishlist ({wishlistCount})</Link>
        <Link className="catalog-nav-link" to="/orders">Orders</Link>
        <Link className="cart-link" to="/cart">Cart ({itemCount})</Link>
        <button className="logout-button" type="button" onClick={handleLogout}>Log out</button>
      </nav>
    </header>
  );
}

export default Navbar;
