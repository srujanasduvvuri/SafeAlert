const express      = require('express');
const router       = express.Router();
const Alert        = require('../models/Alert');
const User         = require('../models/User');
const authMiddleware = require('../middleware/auth');
const nodemailer   = require('nodemailer');

// Send email to emergency contacts
async function sendEmergencyEmails(user, alert) {
  if (!user.emergencyContacts || user.emergencyContacts.length === 0) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mapsLink = `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`;
  const time     = new Date(alert.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  for (const contact of user.emergencyContacts) {
    if (!contact.email) continue;
    try {
      await transporter.sendMail({
        from:    `"SafeAlert 🚨" <${process.env.EMAIL_USER}>`,
        to:      contact.email,
        subject: `🚨 EMERGENCY SOS from ${user.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:2px solid #e53e3e;border-radius:12px;overflow:hidden">
            <div style="background:#e53e3e;padding:24px;text-align:center">
              <h1 style="color:white;margin:0;font-size:28px">🚨 SOS ALERT</h1>
              <p style="color:#ffe;margin:8px 0 0;font-size:16px">Emergency help needed!</p>
            </div>
            <div style="padding:24px">
              <p style="font-size:16px;color:#333">Dear <strong>${contact.name || 'Emergency Contact'}</strong>,</p>
              <p style="font-size:15px;color:#333"><strong>${user.name}</strong> has triggered an SOS emergency alert and needs immediate help.</p>
              <div style="background:#fff5f5;border:1px solid #e53e3e;border-radius:8px;padding:16px;margin:20px 0">
                <p style="margin:0 0 8px;color:#333">📍 <strong>Live Location:</strong></p>
                <p style="margin:0 0 8px;color:#666">Latitude: ${alert.latitude}</p>
                <p style="margin:0 0 8px;color:#666">Longitude: ${alert.longitude}</p>
                <p style="margin:0;color:#666">🕐 Time: ${time}</p>
              </div>
              <div style="text-align:center;margin:24px 0">
                <a href="${mapsLink}" style="background:#e53e3e;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold">
                  📍 View Live Location on Map
                </a>
              </div>
              <p style="font-size:13px;color:#999;text-align:center">Please contact ${user.name} immediately or alert local authorities.<br/>Phone: ${user.phone || 'Not provided'}</p>
            </div>
          </div>
        `
      });
    } catch (err) {
      console.error('Email error:', err.message);
    }
  }
}

// POST /api/sos — trigger SOS
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ msg: 'Location required' });

    const user  = await User.findById(req.user.id);
    const alert = new Alert({ userId: req.user.id, userName: user.name, latitude, longitude });
    await alert.save();

    // Send emails in background (don't block response)
    sendEmergencyEmails(user, alert).catch(console.error);

    res.json({ msg: 'SOS alert sent successfully', alert });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/sos/my-alerts — user's own alert history
router.get('/my-alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user.id }).sort({ timestamp: -1 }).limit(10);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/sos/alerts — admin only
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    const alerts = await Alert.find({ status: 'active' }).sort({ timestamp: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PATCH /api/sos/alerts/:id/resolve
router.patch('/alerts/:id/resolve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    await Alert.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.json({ msg: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;

// PATCH /api/sos/my-alerts/:id/safe — user marks themselves safe
router.patch('/my-alerts/:id/safe', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findOne({ _id: req.params.id, userId: req.user.id });
    if (!alert) return res.status(404).json({ msg: 'Alert not found' });
    alert.status = 'safe';
    await alert.save();
    res.json({ msg: 'You have been marked as safe', alert });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/sos/all-alerts — admin gets all alerts
router.get('/all-alerts', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    const alerts = await Alert.find().sort({ timestamp: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/nearby — fetch nearby places from Overpass API
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ msg: 'lat and lng required' });

    const radius = 3000;
    const query = `[out:json][timeout:10];(node["amenity"="police"](around:${radius},${lat},${lng});node["amenity"="hospital"](around:${radius},${lat},${lng});node["amenity"="clinic"](around:${radius},${lat},${lng});node["social_facility"="shelter"](around:${radius},${lat},${lng}););out 20;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Overpass error:', err.message);
    res.status(500).json({ msg: 'Failed to fetch nearby places' });
  }
});