const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    tournamentName: String,
    overs: Number,
    teams: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
