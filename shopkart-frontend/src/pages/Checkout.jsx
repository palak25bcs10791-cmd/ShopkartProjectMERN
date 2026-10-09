import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useCart } from '../context/useCart';
import { createPaymentOrder, verifyPayment } from '../services/orders';

const initialForm = {
  fullName: '',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
};

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        reject(new Error('Razorpay checkout could not be initialized'));
      }
    };
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

function Checkout() {
  const navigate = useNavigate();
  const { cart, subtotal, cartLoading, cartError, loadCart, clearCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderItems = useMemo(
    () => cart.map((item) => ({ ...item, itemTotal: Number(item.price || 0) * Number(item.quantity || 1) })),
    [cart],
  );

  function updateField(event) {
    const { name, value } = event.target;
    setShippingAddress((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: '' }));
  }

  function validateForm() {
    const nextErrors = {};
    const requiredFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];

    requiredFields.forEach((field) => {
      const value = shippingAddress[field]?.trim();
      if (!value) {
        nextErrors[field] = 'This field is required.';
      }
    });

    if (shippingAddress.phone && !/^\d{10}$/.test(shippingAddress.phone.replace(/\s+/g, ''))) {
      nextErrors.phone = 'Phone number must contain 10 digits.';
    }

    if (shippingAddress.pincode && !/^\d{6}$/.test(shippingAddress.pincode)) {
      nextErrors.pincode = 'Pincode must contain 6 digits.';
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateForm();
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await loadRazorpayScript();
      const { data } = await createPaymentOrder({ shippingAddress });
      const razorpayOptions = {
        key: data.key,
        amount: Number(data.amount),
        currency: data.currency || 'INR',
        name: 'ShopKart',
        description: 'Order payment',
        order_id: data.razorpayOrderId,
        handler: async function handlePaymentSuccess(response) {
          try {
            const verification = await verifyPayment({
              shopKartOrderId: data.shopKartOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearCart();
            navigate(`/order-success/${verification.data.order._id || data.shopKartOrderId}`);
          } catch (verifyError) {
            setErrorMessage(verifyError.response?.data?.message || 'Payment verification failed.');
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: shippingAddress.fullName,
          contact: shippingAddress.phone,
        },
        theme: { color: '#1d4ed8' },
        modal: {
          ondismiss: () => {
            setErrorMessage('Payment cancelled. Your cart is still safe.');
            setIsSubmitting(false);
          },
        },
      };

      const razorpayCheckout = new window.Razorpay(razorpayOptions);
      razorpayCheckout.on('payment.failed', (response) => {
        setErrorMessage(response.error?.description || 'Payment failed. Your cart is still safe.');
        setIsSubmitting(false);
      });
      razorpayCheckout.open();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'Unable to place your order. Please try again.');
      setIsSubmitting(false);
    }
  }

  if (cartLoading) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="checkout-page">
          <p className="catalog-state" role="status">Loading your cart...</p>
        </main>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="checkout-page">
          <div className="empty-state">
            <h2>Unable to load your cart.</h2>
            <button type="button" className="details-link" onClick={loadCart}>Try Again</button>
          </div>
        </main>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="checkout-page">
          <div className="empty-state">
            <h2>Your cart is empty.</h2>
            <Link className="details-link" to="/products">Start Shopping</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="checkout-page">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">SECURE CHECKOUT</p>
            <h1>Checkout</h1>
          </div>
          <Link className="back-link" to="/cart">Back to cart</Link>
        </div>

        <div className="checkout-layout">
          <form className="checkout-panel" onSubmit={handleSubmit} noValidate>
            <h2>Shipping details</h2>
            <div className="checkout-form-grid">
              <label>
                Full Name
                <input name="fullName" value={shippingAddress.fullName} onChange={updateField} />
                {formErrors.fullName && <span className="form-error">{formErrors.fullName}</span>}
              </label>

              <label>
                Phone
                <input name="phone" value={shippingAddress.phone} onChange={updateField} />
                {formErrors.phone && <span className="form-error">{formErrors.phone}</span>}
              </label>

              <label className="checkout-full-width">
                Address Line
                <input name="addressLine1" value={shippingAddress.addressLine1} onChange={updateField} />
                {formErrors.addressLine1 && <span className="form-error">{formErrors.addressLine1}</span>}
              </label>

              <label>
                City
                <input name="city" value={shippingAddress.city} onChange={updateField} />
                {formErrors.city && <span className="form-error">{formErrors.city}</span>}
              </label>

              <label>
                State
                <input name="state" value={shippingAddress.state} onChange={updateField} />
                {formErrors.state && <span className="form-error">{formErrors.state}</span>}
              </label>

              <label>
                Pincode
                <input name="pincode" value={shippingAddress.pincode} onChange={updateField} />
                {formErrors.pincode && <span className="form-error">{formErrors.pincode}</span>}
              </label>
            </div>

            {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Placing order...' : 'Place Order'}
            </button>
          </form>

          <aside className="checkout-panel">
            <p className="eyebrow">ORDER SUMMARY</p>
            <h2>Review order</h2>
            <div className="cart-items">
              {orderItems.map((item) => (
                <div className="summary-item" key={item.product}>
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="order-total">
              <span>Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Checkout;
