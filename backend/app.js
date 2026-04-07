require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var cors = require('cors');
var http = require('http');
var { Server } = require('socket.io');

var app = express();
var server = http.createServer(app);
var io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/facilities', require('./routes/facilities'));
app.use('/api/v1/fields', require('./routes/fields'));
app.use('/api/v1/price-rules', require('./routes/priceRules'));
app.use('/api/v1/extra-services', require('./routes/extraServices'));
app.use('/api/v1/blocked-times', require('./routes/blockedTimes'));
app.use('/api/v1/bookings', require('./routes/bookings'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/reviews', require('./routes/reviews'));
app.use('/api/v1/favorites', require('./routes/favorites'));
app.use('/api/v1/notifications',  require('./routes/notifications'));
app.use('/api/v1/invoices', require('./routes/invoices'));
app.use('/api/v1/admin', require('./routes/admin'));


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('connected', function () {
  console.log('MongoDB connected');
});
mongoose.connection.on('error', function (err) {
  console.error('MongoDB connection error:', err);
});

// Socket.io setup
require('./utils/socketHandler')(io);

// 404 handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = { app, server, io };