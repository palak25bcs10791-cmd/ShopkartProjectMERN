import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/me')
      .then(() => navigate('/home', { replace: true }))
      .catch(() => undefined);
  }, [navigate]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError('Please complete all fields.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro"><p className="eyebrow">SHOPKART / MEMBERSHIP</p><h1>Make room for the good stuff.</h1><p>Join a considered marketplace for everyday finds, delivered without the noise.</p></section>
      <section className="form-panel"><p className="eyebrow">NEW CUSTOMER</p><h2>Create your account</h2><p className="muted">A few details, then you are ready to shop.</p>
        <form onSubmit={handleSubmit} noValidate>
          <label>Full name<input required type="text" name="fullName" autoComplete="name" value={formData.fullName} onChange={handleChange} /></label>
          <label>Email<input required type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} /></label>
          <label>Password<input required type="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} /></label>
          <label>Phone number<input required type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handleChange} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="form-link">Already a customer? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}

export default Register;