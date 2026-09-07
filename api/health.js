const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'REDACTED';

export default async function handler(req, res) {
  res.json({ ok: true, keyId: RAZORPAY_KEY_ID });
}
