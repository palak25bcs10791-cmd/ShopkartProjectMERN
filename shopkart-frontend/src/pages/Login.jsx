import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/me')
      .then(() => navigate('/home', { replace: true }))
      .catch(() => undefined);
  }, [navigate]);

  function handleChange(e) { setFormData({ ...formData, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    if (!formData.email || !formData.password) { setError('Enter your email and password.'); return; }
    try { setIsSubmitting(true); await api.post('/login', formData); navigate('/home'); }
    catch (err) { setError(err.response?.data?.message || 'Invalid Credentials'); }
    finally { setIsSubmitting(false); }
  }

  return <main className="auth-page login-page">
    <section className="auth-intro"><p className="eyebrow">WELCOME BACK</p><h1>Your cart remembers you.</h1><p>Sign in to pick up where you left off and keep your ShopKart experience in one place.</p></section>
    <section className="form-panel"><p className="eyebrow">CUSTOMER LOGIN</p><h2>Sign in</h2><p className="muted">Use the email connected to your account.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label>Email<input required type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} /></label>
        <label>Password<input required type="password" name="password" autoComplete="current-password" value={formData.password} onChange={handleChange} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p className="form-link">New to ShopKart? <Link to="/register">Create an account</Link></p>
    </section>
  </main>;
}

export default Login;