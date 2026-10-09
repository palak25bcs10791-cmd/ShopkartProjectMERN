# ShopKart

Palak Agarwal -- 25bcs10791 -- Shopkart Project MERN Lab Assignments

ShopKart is an online store built with MongoDB, Express, React, and Node.js. Customers can browse products, save items to a wishlist, manage a cart, check out with Razorpay Test Mode, and view their orders.

## What happens when a customer checks out?

1. The customer opens the cart and chooses **Proceed to Checkout**.
2. The checkout page checks that the shipping fields are filled in and that the phone number and pincode have the expected format.
3. The backend reads the customer's saved cart and loads the latest product records from MongoDB. It checks that the products still exist and have enough stock.
4. The backend calculates the total using the current product prices. It does not use a total sent by the browser.
5. The backend saves an order as `PENDING_PAYMENT`, creates a Razorpay order, and sends the checkout details to the frontend.
6. Razorpay Checkout handles the test payment. If the payment succeeds, the frontend sends Razorpay's order ID, payment ID, and signature to the backend.
7. The backend checks the signature using the secret stored on the server. Only after verification does it mark the order `PAID` and `PLACED` and clear the customer's cart.
8. The customer sees the confirmation page and can find the purchase in **My Orders**.

If payment is cancelled or fails, the cart is kept so the customer can try again.

## Project layout

```text
ShopKart/
├── shopkart-backend/
│   ├── config/          # Razorpay client configuration
│   ├── controllers/     # Request handling and application logic
│   ├── middlewares/     # Authentication checks
│   ├── models/          # MongoDB/Mongoose schemas
│   ├── routes/          # API endpoint definitions
│   └── index.js         # Express server setup
└── shopkart-frontend/
    └── src/
        ├── components/  # Shared interface components
        ├── context/     # Shared cart state
        ├── pages/       # Screens such as Cart, Checkout, and Orders
        └── services/    # Frontend API requests
```

## Run it locally

You need Node.js, npm, MongoDB, and a Razorpay account with **Test Mode** keys.

### 1. Configure the backend

Copy `shopkart-backend/.env.example` to `shopkart-backend/.env`. Set the values for MongoDB, JWT authentication, and Razorpay:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
PORT=3000
NODE_ENV=development
```

Keep the Razorpay secret in the backend `.env` file. Do not commit it, share it, or put it in frontend code. The `.env` file is ignored by Git.

### 2. Start the backend

In a terminal:

```powershell
cd shopkart-backend
npm install
npm run dev
```

The API runs on `http://localhost:3000` by default.

### 3. Start the frontend

Open a second terminal:

```powershell
cd shopkart-frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The frontend uses `http://localhost:3000` as its API by default. If your backend runs at another address, set `VITE_API_URL` in `shopkart-frontend/.env`.

Use Razorpay's Test Mode payment flow for this project. Test transactions simulate payment and do not charge real money.

## Main backend files

- `models/order.model.js` defines the order data saved in MongoDB. An order stores product details as a snapshot, so later product edits do not change the order history.
- `controllers/order.controller.js` creates orders, checks stock and prices, verifies payments, and returns order history.
- `config/razorpay.js` creates the Razorpay client from backend environment variables. It returns no client if the keys are missing, so checkout reports a configuration error instead of pretending a payment succeeded.
- `routes/order.routes.js` connects the order URLs to controller functions and protects them with authentication.
- `middlewares/auth.middleware.js` verifies the customer's JWT cookie before allowing access to protected routes.
- `index.js` starts Express, connects MongoDB, enables JSON and cookies, configures CORS, and mounts the API routes.

## Main frontend files

- `src/App.jsx` defines the page URLs and protects pages that require a signed-in customer.
- `src/pages/Cart.jsx` shows cart items and links to checkout.
- `src/pages/Checkout.jsx` validates the shipping form, requests a payment order, opens Razorpay Checkout, and sends the payment result for verification.
- `src/context/CartContext.jsx` keeps the cart available across pages, including the count shown in the navbar.
- `src/pages/Orders.jsx` shows order history and its loading, empty, and error states.
- `src/pages/OrderDetails.jsx` and `src/pages/OrderSuccess.jsx` show an individual order and its confirmation.
- `src/services/orders.js` contains the frontend requests for order-related APIs.

## Order API

All order endpoints require the customer to be signed in.

| Method | URL | Purpose |
|---|---|---|
| `POST` | `/orders/create-payment-order` | Validate shipping and cart, calculate the total, save a pending order, and create the Razorpay order. |
| `POST` | `/orders/verify-payment` | Verify Razorpay's signature, mark the order paid, and clear the cart. |
| `GET` | `/orders` | Return the signed-in customer's orders, newest first. |
| `GET` | `/orders/:id` | Return one order only if it belongs to the signed-in customer. |
| `PATCH` | `/orders/dev/:id/advance-status` | In development, advance a paid order to its next fulfillment status. |

The create-payment endpoint returns `shopKartOrderId`, `razorpayOrderId`, `amount`, `currency`, and `key`. Razorpay expects the amount in paise; for example, ₹100 is sent as `10000`.

## Order and payment statuses

- `PENDING_PAYMENT`: the order is saved, but payment has not been verified.
- `PLACED`: payment was verified successfully.
- `CONFIRMED`, `SHIPPED`, `DELIVERED`: later fulfillment stages shown in the order history.
- `PENDING` and `PAID` are payment statuses stored separately from the fulfillment status.

The development status endpoint is for demonstrating the bonus status progression. It only works when `NODE_ENV=development`, requires authentication, checks order ownership, and only advances paid orders. It is not an admin system.

## Important design choices

- **The backend is trusted for prices and stock.** Browser data can be changed, so the server reloads products and recalculates the total.
- **Orders keep item snapshots.** The purchased name, price, quantity, and image are stored on the order for reliable history.
- **The cart is cleared only after verification.** A cancelled or failed payment leaves the cart available.
- **The Razorpay secret stays on the server.** The browser receives only the Key ID needed to open Razorpay Checkout.
- **Test Mode is not production payment processing.** Use live credentials and complete the appropriate setup before accepting real payments.

## Checks

From `shopkart-frontend`, run:

```powershell
npm run lint
npm run build
```

Lint may report warnings in React effects; the build command checks that the frontend compiles for production.
