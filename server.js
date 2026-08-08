const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dls_nrr';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

mongoose.set('bufferCommands', false);

/* ---------- Middleware ---------- */
app.use(cors({
    origin: FRONTEND_ORIGIN ? FRONTEND_ORIGIN.split(',').map(origin => origin.trim()) : true
}));
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
    res.json({ ok: true });
});

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
