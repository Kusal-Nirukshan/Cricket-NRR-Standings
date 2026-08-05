const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dls_nrr';

mongoose.set('bufferCommands', false);

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static('public'));

// Mount tournament routes
app.use('/', require('./routes/tournament'));

/* ---------- Start server ---------- */
async function startServer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
    }
}

startServer();
