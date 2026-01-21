// models/tournament.js
const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    tournamentName: String,
    overs: Number,
    teams: Number,
    teamNames: [String],      // new
    format: String,           // "roundrobin" or "groups"
    groups: [{                // new
        name: String,
        teams: [String]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
