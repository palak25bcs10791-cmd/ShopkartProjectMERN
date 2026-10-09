import { ordersApi } from './api';

export function createPaymentOrder(payload) {
  return ordersApi.post('/orders/create-payment-order', payload);
}

export function verifyPayment(payload) {
  return ordersApi.post('/orders/verify-payment', payload);
}

export function getOrders() {
  return ordersApi.get('/orders');
}

export function getOrderById(orderId) {
  return ordersApi.get(`/orders/${orderId}`);
}

export function advanceOrderStatus(orderId) {
  return ordersApi.patch(`/orders/dev/${orderId}/advance-status`);
}
