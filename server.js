const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 3000;

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static('public'));

// Mount tournament routes
app.use('/', require('./routes/tournament'));

/* ---------- MongoDB ---------- */
mongoose.connect('mongodb://127.0.0.1:27017/dls_nrr')
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

/* ---------- Start server ---------- */
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
