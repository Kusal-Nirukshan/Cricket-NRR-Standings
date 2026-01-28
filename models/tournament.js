const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    tournamentName: String,
    overs: Number,
    teams: Number,
    teamNames: [String],
    format: String,
    groups: mongoose.Schema.Types.Mixed,
    // matches: stored randomized match lists per group (array of [a,b] or objects)
    matches: mongoose.Schema.Types.Mixed,
    // matchResults: per-group array of result objects {a,b,m,played,resultType,teamAScore,teamBScore,...}
    matchResults: mongoose.Schema.Types.Mixed,
    // teamStats: map teamName -> stats for NRR and table calculations
    teamStats: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
