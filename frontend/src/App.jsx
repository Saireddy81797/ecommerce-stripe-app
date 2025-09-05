import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4242";

export default function App() {
  const [products, setProducts] = useState([]);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(setProducts)
      .catch(err => {
        console.error("Failed to fetch products", err);
      });
  }, []);

  const handleBuy = async (productId) => {
    setLoading(true);
    try {
      // send one product with quantity 1
      const res = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: productId, quantity: 1 }] })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
      } else {
        alert("Failed to create checkout session");
        console.error(data);
      }
    } catch (err) {
      console.error(err);
      alert("Error creating checkout session");
    } finally {
      setLoading(false);
    }
  };

  // If landing on /success?session_id=...
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  if (sessionId) {
    return <Success sessionId={sessionId} />;
  }

  return (
    <div className="container">
      <h1>E-commerce Demo (Stripe Checkout)</h1>
      <div className="product-grid">
        {products.map(p => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <div className="price">${(p.price / 100).toFixed(2)}</div>
            <button onClick={() => handleBuy(p.id)} disabled={isLoading}>
              {isLoading ? "Processing..." : "Buy"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Success({ sessionId }) {
  const [session, setSession] = useState(null);
  useEffect(() => {
    fetch(`${API_URL}/api/checkout-session?session_id=${sessionId}`)
      .then(res => res.json())
      .then(setSession)
      .catch(err => {
        console.error(err);
      });
  }, [sessionId]);

  if (!session) return <div className="container">Loading order details...</div>;

  return (
    <div className="container">
      <h1>Payment successful ✅</h1>
      <p>Session id: {session.id}</p>
      <p>Amount total: ${(session.amount_total / 100).toFixed(2)}</p>
      <p>Payment status: {session.payment_status}</p>
      <p>
        You can view the full order in your Stripe Dashboard (test mode) or implement server-side order saving.
      </p>
    </div>
  );
}
