import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

function Home() {
  const [customer, setCustomer] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api.get('/me').then(({ data }) => setCustomer(data.customer)).catch(() => navigate('/login', { replace: true })); }, [navigate]);
  if (!customer) return <p className="page-message">Loading your account...</p>;
  return <div className="app-shell"><Navbar /><main className="home-content"><p className="eyebrow">YOUR SHOPKART</p><h1>Welcome, {customer.fullName.split(' ')[0]}.</h1><p className="home-lede">Everything is ready for your next find.</p><Link className="details-link home-shop-link" to="/products">Explore the product catalog</Link><section className="profile-card"><div><span>Name</span><strong>{customer.fullName}</strong></div><div><span>Email</span><strong>{customer.email}</strong></div><div><span>Phone</span><strong>{customer.phone}</strong></div></section></main></div>;
}

export default Home;