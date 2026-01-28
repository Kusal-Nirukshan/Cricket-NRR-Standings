const express = require('express');
const router = express.Router();
const Tournament = require('../models/tournament');

// Helper: generate all unique pairs for a team list
function generatePairs(teams) {
    const pairs = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }
    return pairs;
}

// Helper: Fisher-Yates shuffle in-place
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const r = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[r];
        arr[r] = tmp;
    }
}

// Create tournament
router.post('/create-tournament', async (req, res) => {
    try {
        const { tournamentName, overs, teams } = req.body;

        if (!tournamentName || !overs || !teams) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const tournament = await Tournament.create({ tournamentName, overs, teams });
        res.json({ success: true, id: tournament._id });

    } catch (err) {
        console.error("Error creating tournament:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// Custom tournament page
router.get('/tournament/:id', async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.send('Tournament not found');

    res.send(`
        <h1>${tournament.tournamentName}</h1>
        <p>Overs: ${tournament.overs}</p>
        <p>Teams: ${tournament.teams}</p>
    `);
});

// Accept either POST or PUT for backwards compatibility
async function handleFormat(req, res) {
    try {
        const { format, numGroups, teamNames, groupCount } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ error: "Tournament not found" });

        tournament.format = format;
        tournament.teamNames = teamNames || tournament.teamNames || [];

        const groupsObj = {};
        const ng = numGroups || groupCount || 0;

        if (format === 'groups' && ng && Array.isArray(tournament.teamNames) && tournament.teamNames.length) {
            const teamsPerGroup = Math.floor(tournament.teamNames.length / ng);
            for (let i = 0; i < ng; i++) {
                const groupName = `Group ${i + 1}`;
                groupsObj[groupName] = tournament.teamNames.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
            }
            tournament.groups = groupsObj;
        } else if (Array.isArray(tournament.teamNames) && tournament.teamNames.length) {
            // No groups requested — treat as single group 'All Teams'
            groupsObj['All Teams'] = tournament.teamNames.slice();
            tournament.groups = groupsObj['All Teams'];
        }

        // Generate and persist matches for each group (randomized once)
        const matchesObj = {};
        if (Object.keys(groupsObj).length) {
            Object.entries(groupsObj).forEach(([gname, teams]) => {
                const pairs = generatePairs(teams);
                shuffleArray(pairs);
                matchesObj[gname] = pairs;
            });
        }
        tournament.matches = matchesObj;

        await tournament.save();
        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
}

router.post('/tournament/:id/format', handleFormat);
router.put('/tournament/:id/format', handleFormat);

// Helper to parse overs string like "49.3" -> balls (49 overs and 3 balls = 49*6+3)
function oversToBalls(s) {
    if (!s && s !== 0) return 0;
    if (typeof s === 'number') return Math.floor(s) * 6;
    const str = String(s).trim();
    if (!str) return 0;
    if (!str.includes('.')) return (Number(str) || 0) * 6;
    const parts = str.split('.');
    const overs = Number(parts[0]) || 0;
    let balls = Number(parts[1]) || 0;
    // guard: balls should be 0-5
    if (balls > 5) balls = Math.min(balls, 5);
    return overs * 6 + balls;
}

// Save a match result and update per-team stats
router.post('/tournament/:id/match-result', async (req, res) => {
    try {
        const payload = req.body || {};
        console.log('Received match-result for tournament', req.params.id, payload);
        const { group, a, b, m, resultType } = payload;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        // initialize containers
        tournament.matchResults = tournament.matchResults || {};
        tournament.matches = tournament.matches || {};
        tournament.teamStats = tournament.teamStats || {};

        // Record result object
        const resultObj = Object.assign({}, payload, { recordedAt: new Date() });

        // store under group
        const grp = group || 'All Teams';
        tournament.matchResults[grp] = tournament.matchResults[grp] || [];

        // prevent duplicate recording for same match number or same pair
        const already = tournament.matchResults[grp].some(r => (r.m && payload.m && r.m === payload.m) || (r.a === a && r.b === b) || (r.a === b && r.b === a));
        if (already) {
            // continue but respond with conflict
            return res.status(409).json({ error: 'Match result already recorded' });
        }

        tournament.matchResults[grp].push(resultObj);

        // Ensure teamStats entries exist
        function ensureTeam(t) {
            if (!tournament.teamStats[t]) {
                tournament.teamStats[t] = {
                    played: 0,
                    wins: 0,
                    losses: 0,
                    ties: 0,
                    points: 0,
                    runsFor: 0,
                    runsAgainst: 0,
                    ballsFaced: 0,
                    ballsBowled: 0,
                    wicketsLost: 0,
                    wicketsTaken: 0
                };
            }
        }

        ensureTeam(a);
        ensureTeam(b);

        // Update stats depending on resultType
        const taScore = Number(payload.teamAScore) || 0;
        const tbScore = Number(payload.teamBScore) || 0;
        const taOversBalls = oversToBalls(payload.teamAOvers);
        const tbOversBalls = oversToBalls(payload.teamBOvers);
        const taW = Number(payload.teamAWickets) || 0;
        const tbW = Number(payload.teamBWickets) || 0;

        // increment played for a and b (even for noresult/abandoned we'll mark as played)
        tournament.teamStats[a].played += 1;
        tournament.teamStats[b].played += 1;

        // runs and balls: only update when numeric scores/overs provided
        if (typeof payload.teamAScore !== 'undefined' && payload.teamAOvers) {
            tournament.teamStats[a].runsFor += taScore;
            tournament.teamStats[a].runsAgainst += tbScore;
            tournament.teamStats[a].ballsFaced += taOversBalls;
            tournament.teamStats[a].wicketsLost += taW;
            // bowling side stats
            tournament.teamStats[b].runsFor += tbScore;
            tournament.teamStats[b].runsAgainst += taScore;
            tournament.teamStats[b].ballsFaced += tbOversBalls;
            tournament.teamStats[b].wicketsLost += tbW;
            // wickets taken
            tournament.teamStats[a].wicketsTaken += tbW;
            tournament.teamStats[b].wicketsTaken += taW;
            // ballsBowled (for NRR denominator when bowling)
            tournament.teamStats[a].ballsBowled += tbOversBalls;
            tournament.teamStats[b].ballsBowled += taOversBalls;
        }

        // Points: Win=2, Tie/No Result=1, Loss=0
        if (resultType === 'A') {
            tournament.teamStats[a].wins += 1;
            tournament.teamStats[b].losses += 1;
            tournament.teamStats[a].points += 2;
        } else if (resultType === 'B') {
            tournament.teamStats[b].wins += 1;
            tournament.teamStats[a].losses += 1;
            tournament.teamStats[b].points += 2;
        } else if (resultType === 'tie' || resultType === 'noresult' || resultType === 'abandoned') {
            tournament.teamStats[a].ties += 1;
            tournament.teamStats[b].ties += 1;
            tournament.teamStats[a].points += 1;
            tournament.teamStats[b].points += 1;
        }

        await tournament.save();

        res.json({ success: true, teamStats: tournament.teamStats[ a ], teamStatsB: tournament.teamStats[ b ] });

    } catch (err) {
        console.error('Error saving match result', err);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;
