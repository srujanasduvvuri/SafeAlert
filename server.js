const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('DB error:', err));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/sos',     require('./routes/sos'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin',   require('./routes/admin'));

// Serve all HTML pages
app.get('/login',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/sos',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'sos.html')));
app.get('/profile',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/helplines',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'helplines.html')));
app.get('/admin-login',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/admin',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/safewalk',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'safewalk.html')));
app.get('/fakecall',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'fakecall.html')));
app.get('/nearby',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'nearby.html')));
app.get('*',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));