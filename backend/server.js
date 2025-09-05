require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4242;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

app.use(cors({
  origin: CLIENT_URL,
}));

// Simple product catalog (id, name, price in cents)
const PRODUCTS = [
  { id: 'prod_1', name: 'Classic T-Shirt', description: '100% cotton tee', price: 1999 },
  { id: 'prod_2', name: 'Hoodie', description: 'Cozy hoodie', price: 3999 },
  { id: 'prod_3', name: 'Sticker Pack', description: '5 stickers', price: 499 }
];

// GET /api/products
app.get('/api/products', (req, res) => {
  res.json(PRODUCTS);
});

// POST /api/create-checkout-session
// body: { items: [{ id: 'prod_1', quantity: 2 }, ...] }
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const items = req.body.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Map incoming items to Stripe line_items
    const line_items = items.map(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) throw new Error(`Product ${item.id} not found`);
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description
          },
          unit_amount: product.price
        },
        quantity: item.quantity || 1
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/`
    });

    // Return the session URL to the frontend
    res.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/checkout-session?session_id=cs_test_...
app.get('/api/checkout-session', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json(session);
  } catch (err) {
    console.error('retrieve session error', err);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// health
app.get('/', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on port ${PORT}`);
});
