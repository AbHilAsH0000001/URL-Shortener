const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const ShortUrl = require('./models/shortUrl');
const User = require('./models/user');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost/urlShortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

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
    return res.redirect('/login');
  }
  next();
}

// Dashboard - user-specific
app.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const shortUrls = await ShortUrl.find({ user: user._id });
    res.render('index', { shortUrls, username: user.username });
  } catch (err) {
    console.error("❌ Error loading dashboard:", err);
    res.send("Error loading dashboard");
  }
});

// Signup
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
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Shorten URL
app.post('/shortUrls', requireLogin, async (req, res) => {
  try {
    await ShortUrl.create({
      full: req.body.fullUrl,
      user: req.session.userId
    });
    res.redirect('/');
  } catch (err) {
    console.error("❌ Error creating short URL:", err);
    res.send("Error creating URL");
  }
});

// Delete a short URL (only if owned by the user)
app.post('/delete/:id', requireLogin, async (req, res) => {
  try {
    const url = await ShortUrl.findById(req.params.id);
    if (!url) return res.status(404).send("URL not found");

    if (url.user.toString() !== req.session.userId.toString()) {
      return res.status(403).send("Not authorized to delete this URL");
    }

    await ShortUrl.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.send("Error deleting URL");
  }
});

// Redirect handler
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
