const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/tournamentDB')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const tournamentRoutes = require('./routes/tournament');
app.use('/', tournamentRoutes);

// Start server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
