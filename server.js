const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const ShortUrl = require('./models/shortUrl');
const User = require('./models/user');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost/urlShortener');

// Set view engine and middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false
}));

// Auth middleware
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    console.log("🔒 Not logged in, redirecting to login");
    return res.redirect('/login');
  }
  console.log("✅ Logged in as:", req.session.userId);
  next();
}

// Default route → go to /signup if not logged in
app.get('/', requireLogin, async (req, res) => {
  try {
    const shortUrls = await ShortUrl.find();
    res.render('index', { shortUrls: shortUrls });
  } catch (err) {
    console.error("❌ Error loading dashboard:", err);
    res.send("Error loading dashboard");
  }
});

// Signup page
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    await user.save();
    res.redirect('/login');
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.redirect('/signup');
  }
});

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (user && await bcrypt.compare(req.body.password, user.password)) {
    req.session.userId = user._id;
    console.log("✅ Login successful, redirecting to dashboard");
    res.redirect('/');
  } else {
    console.log("❌ Login failed");
    res.redirect('/login');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// URL Shorten route
app.post('/shortUrls', requireLogin, async (req, res) => {
  await ShortUrl.create({ full: req.body.fullUrl });
  res.redirect('/');
});

// Redirect short link
app.get('/:shortUrl', async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
  if (!shortUrl) return res.sendStatus(404);

  shortUrl.clicks++;
  await shortUrl.save();

  res.redirect(shortUrl.full);
});

// Start server
app.listen(5000, () => {
  console.log("🚀 Server started at http://localhost:5000");
});
