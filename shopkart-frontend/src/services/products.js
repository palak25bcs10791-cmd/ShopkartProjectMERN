import axios from 'axios';

const productsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

export function getProducts(params, signal) {
  return productsApi.get('/products', { params, signal });
}

export function getProduct(id, signal) {
  return productsApi.get(`/products/${id}`, { signal });
}