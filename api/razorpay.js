// ─────────────────────────────────────────────────────────────
// api/razorpay.js — Razorpay order/verify/refund in ONE function.
//
// This single function replaces three separate serverless
// functions (create-order, verify-payment, refund) so the project
// stays within Vercel's Hobby-plan limit of 12 functions. The old
// URLs are kept working via rewrites in vercel.json:
//   /api/create-order    → /api/razorpay?action=create-order
//   /api/verify-payment  → /api/razorpay?action=verify-payment
//   /api/refund          → /api/razorpay?action=refund
//
// Actions (via ?action=):
//   create-order    { amount }                → { order_id, amount, currency, key_id }
//   verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature } → { valid }
//   refund          { orderId, paymentRef, amount } → { refunded, refundId, status, ... }
// ─────────────────────────────────────────────────────────────
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Credentials come from Vercel → Settings → Environment Variables only.
// RAZORPAY_KEY_ID      public key id (rzp_live_… / rzp_test_…)
// RAZORPAY_KEY_SECRET  secret — must NEVER be exposed to the browser.
// Missing values fail the request instead of silently using a baked-in key.
const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || '').trim();

function razorpayClient() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const missing = [
      !RAZORPAY_KEY_ID ? 'RAZORPAY_KEY_ID' : null,
      !RAZORPAY_KEY_SECRET ? 'RAZORPAY_KEY_SECRET' : null,
    ].filter(Boolean);
    const error = new Error(`Razorpay is not configured. Set ${missing.join(' and ')} in Vercel environment variables.`);
    error.status = 500;
    throw error;
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

async function createOrder(req, res) {
  const amountInRupees = Number(req.body?.amount);
  if (!amountInRupees || amountInRupees <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  const options = {
    amount: Math.round(amountInRupees * 100), // paise
    currency: 'INR',
    receipt: 'rcpt_' + Date.now(),
    payment_capture: 1,
  };
  const order = await razorpayClient().orders.create(options);
  return res.json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: RAZORPAY_KEY_ID,
  });
}

function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }
  if (!RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ valid: false, error: 'RAZORPAY_KEY_SECRET is not configured in Vercel environment variables.' });
  }
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected === razorpay_signature) {
    return res.json({ valid: true });
  }
  return res.status(400).json({ valid: false, error: 'Invalid signature' });
}

async function refund(req, res) {
  const { orderId, paymentRef, amount } = req.body || {};
  if (!orderId || !paymentRef || !amount) {
    return res.status(400).json({ refunded: false, error: 'Missing orderId, paymentRef, or amount' });
  }
  const amountInRupees = Number(amount);
  if (!amountInRupees || amountInRupees <= 0) {
    return res.status(400).json({ refunded: false, error: 'Invalid amount' });
  }
  // Only real captured Razorpay payments can be refunded (ref looks like pay_xxx).
  if (!String(paymentRef).startsWith('pay_')) {
    return res.json({
      refunded: false,
      reason: 'no_online_payment',
      message: 'No Razorpay payment to refund. This order was COD or a demo payment - no money was charged.',
    });
  }
  const refund = await razorpayClient().payments.refund(paymentRef, {
    amount: Math.round(amountInRupees * 100), // paise
    receipt: 'refund_' + String(orderId),
    notes: { orderId: String(orderId) },
  });
  console.log('[refund] success:', refund.id, refund.status, 'order', orderId);
  return res.json({
    refunded: true,
    refundId: refund.id,
    amount: refund.amount,
    status: refund.status,
    message: 'Refund initiated. The money will be credited back to your account in 5-7 working days.',
  });
}
  async function refundStatus(req, res) {
    const { refundId, paymentRef } = req.body || {};
    if (!refundId && !paymentRef) {
      return res.status(400).json({ ok: false, error: 'Missing refundId or paymentRef' });
    }

    let refund = null;
    let lastErr = null;

    if (refundId) {
      try {
        refund = await razorpayClient().refunds.fetch(refundId);
      } catch (e) {
        lastErr = e;
      }
    }

    if (!refund && paymentRef && String(paymentRef).startsWith('pay_')) {
      try {
        const list = await razorpayClient().refunds.all({ payment_id: paymentRef, count: 10 });
        const items = Array.isArray(list?.items)
          ? list.items
          : (Array.isArray(list) ? list : []);
        refund = items
          .slice()
          .sort((a, b) => Number(b?.created_at || 0) - Number(a?.created_at || 0))[0] || null;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!refund) {
      const message =
        lastErr?.error?.description ||
        lastErr?.details?.description ||
        lastErr?.response?.description ||
        lastErr?.message ||
        'No refund found on Razorpay for this order.';
      return res.status(404).json({ ok: false, error: message });
    }

    return res.json({
      ok: true,
      refunded: refund.status === 'processed' || refund.status === 'refunded',
      refundId: refund.id,
      paymentId: refund.payment_id || paymentRef || null,
      amount: refund.amount,
      status: refund.status,
    });
  }



const ACTIONS = {
  'create-order': createOrder,
  'verify-payment': verifyPayment,
  refund,
  'refund-status': refundStatus,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const action = String(req.query?.action || '');
  const fn = ACTIONS[action];
  if (!fn) {
    return res.status(404).json({ error: 'Unknown action: ' + (action || '(none)') });
  }
  try {
    return await fn(req, res);
  } catch (err) {
    const message =
      err?.error?.description ||
      err?.details?.description ||
      err?.response?.description ||
      err?.message ||
      'Request failed';
    console.error(`[razorpay:${action}] error:`, message);
    return res.status(err?.status || 500).json({ error: message });
  }
}
