import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { CartContext } from './cart-context';

function normalizeCart(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && item.product)
    .map((item) => {
      const product = item.product;
      const productId = product?._id || item.productId || item.product;

      return {
        product: productId,
        name: product?.name || item.name || 'Product',
        price: Number(product?.price ?? item.price ?? 0),
        image: product?.image || item.image || '',
        stock: Number(product?.stock ?? item.stock ?? 0),
        quantity: Number(item.quantity) || 1,
      };
    });
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState('');

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    setCartError('');

    try {
      const { data } = await api.get('/cart');
      setCart(normalizeCart(data.cart));
    } catch {
      setCart([]);
      setCartError('Unable to load your cart.');
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function addToCart(product) {
    if (!product || !product._id) return;

    try {
      const { data } = await api.post(`/cart/${product._id}`);
      setCart(normalizeCart(data.cart));
      setCartError('');
    } catch (error) {
      setCartError(error?.response?.data?.message || 'Unable to add item to cart.');
      throw error;
    }
  }

  async function updateQuantity(productId, quantity) {
    const nextQuantity = Number(quantity);
    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) return;

    try {
      const { data } = await api.patch(`/cart/${productId}`, { quantity: nextQuantity });
      setCart(normalizeCart(data.cart));
      setCartError('');
    } catch (error) {
      setCartError(error?.response?.data?.message || 'Unable to update cart quantity.');
      throw error;
    }
  }

  async function removeFromCart(productId) {
    try {
      const { data } = await api.delete(`/cart/${productId}`);
      setCart(normalizeCart(data.cart));
      setCartError('');
    } catch (error) {
      setCartError(error?.response?.data?.message || 'Unable to remove item from cart.');
      throw error;
    }
  }

  function clearCart() {
    setCart([]);
  }

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0), [cart]);

  return <CartContext.Provider value={{
    cart,
    itemCount,
    subtotal,
    cartLoading,
    cartError,
    loadCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }}>
    {children}
  </CartContext.Provider>;
}
