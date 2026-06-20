const express = require('express');
const router = express.Router();
const Tournament = require('../models/tournament');

function createEmptyTeamStats() {
    return {
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

function normalizeGroups(tournament) {
    if (tournament.groups && !Array.isArray(tournament.groups) && typeof tournament.groups === 'object') {
        return tournament.groups;
    }

    if (Array.isArray(tournament.groups) && tournament.groups.length) {
        return { 'All Teams': tournament.groups };
    }

    if (Array.isArray(tournament.teamNames) && tournament.teamNames.length) {
        return { 'All Teams': tournament.teamNames };
    }

    return {};
}

// Tournament data endpoint: always return matches object for frontend
router.get('/tournament/:id/data', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        const groupsObj = normalizeGroups(tournament);

        // Ensure a stable, persisted schedule for each group.
        const matchesObj = (tournament.matches && typeof tournament.matches === 'object') ? tournament.matches : {};
        let changed = false;
        Object.entries(groupsObj).forEach(([groupName, teams]) => {
            if (!Array.isArray(matchesObj[groupName]) || matchesObj[groupName].length === 0) {
                const pairs = generatePairs(Array.isArray(teams) ? teams : []);
                shuffleArray(pairs);
                matchesObj[groupName] = pairs;
                changed = true;
            }
        });

        // Ensure teamStats has all teams, including teams that have not played yet.
        tournament.teamStats = (tournament.teamStats && typeof tournament.teamStats === 'object') ? tournament.teamStats : {};
        const allTeams = Array.isArray(tournament.teamNames) ? tournament.teamNames : [];
        allTeams.forEach((team) => {
            if (!team) return;
            if (!tournament.teamStats[team]) {
                tournament.teamStats[team] = createEmptyTeamStats();
                changed = true;
            }
        });

        if (changed) {
            tournament.groups = groupsObj;
            tournament.matches = matchesObj;
            await tournament.save();
        }

        const teamStats = (tournament.teamStats && typeof tournament.teamStats === 'object') ? tournament.teamStats : {};
        const standings = Object.keys(teamStats).map((teamName) => {
            const s = teamStats[teamName] || {};
            const runsFor = Number(s.runsFor) || 0;
            const runsAgainst = Number(s.runsAgainst) || 0;
            const ballsFaced = Number(s.ballsFaced) || 0;
            const ballsBowled = Number(s.ballsBowled) || 0;

            const oversFaced = ballsFaced / 6;
            const oversBowled = ballsBowled / 6;
            const rpoFor = oversFaced > 0 ? runsFor / oversFaced : 0;
            const rpoAgainst = oversBowled > 0 ? runsAgainst / oversBowled : 0;
            const nrr = rpoFor - rpoAgainst;

            return {
                team: teamName,
                played: Number(s.played) || 0,
                wins: Number(s.wins) || 0,
                losses: Number(s.losses) || 0,
                ties: Number(s.ties) || 0,
                points: Number(s.points) || 0,
                runsFor,
                runsAgainst,
                ballsFaced,
                ballsBowled,
                nrr: Number(nrr.toFixed(3))
            };
        });

        standings.sort((A, B) => {
            if (B.points !== A.points) return B.points - A.points;
            if (B.nrr !== A.nrr) return B.nrr - A.nrr;
            if (B.wins !== A.wins) return B.wins - A.wins;
            return B.runsFor - A.runsFor;
        });

        res.json({
            tournamentName: tournament.tournamentName,
            overs: tournament.overs,
            teamNames: tournament.teamNames,
            format: tournament.format,
            groups: groupsObj,
            matches: matchesObj,
            matchResults: tournament.matchResults,
            teamStats: tournament.teamStats,
            standings
        });
    } catch (err) {
        console.error('Error fetching tournament data', err);
        res.status(500).json({ error: 'Server error' });
    }
});

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


        // Only generate and shuffle matches if not already present
        if (!tournament.matches || Object.keys(tournament.matches).length === 0) {
            const matchesObj = {};
            if (Object.keys(groupsObj).length) {
                Object.entries(groupsObj).forEach(([gname, teams]) => {
                    const pairs = generatePairs(teams);
                    shuffleArray(pairs);
                    matchesObj[gname] = pairs;
                });
            }
            tournament.matches = matchesObj;
        }

        tournament.markModified('matchResults');
        tournament.markModified('teamStats');

        await Tournament.updateOne(
            { _id: tournament._id },
            {
                $set: {
                    matchResults: tournament.matchResults,
                    teamStats: tournament.teamStats
                }
            }
        );
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
        const { group, a, b, resultType } = payload;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        // Work with plain objects to avoid Mixed serialization edge cases.
        const matchResults = JSON.parse(JSON.stringify(tournament.matchResults || {}));
        const teamStats = JSON.parse(JSON.stringify(tournament.teamStats || {}));

        // Record result object
        const resultObj = Object.assign({}, payload, { recordedAt: new Date() });

        // store under group
        const grp = group || 'All Teams';
        matchResults[grp] = Array.isArray(matchResults[grp]) ? matchResults[grp] : [];


        // prevent duplicate recording for same match number, group, and teams (order-insensitive)
        const already = matchResults[grp].some(r => (
            String(r.m) === String(payload.m) &&
            ((r.a === a && r.b === b) || (r.a === b && r.b === a))
        ));
        if (already) {
            // respond with conflict
            return res.status(409).json({ error: 'Match result already recorded for this match number and teams' });
        }

        matchResults[grp].push(resultObj);

        // Ensure teamStats entries exist
        function ensureTeam(t) {
            if (!teamStats[t]) {
                teamStats[t] = {
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
        teamStats[a].played += 1;
        teamStats[b].played += 1;

        // runs and balls: only update when numeric scores/overs provided
        if (typeof payload.teamAScore !== 'undefined' && payload.teamAOvers) {
            teamStats[a].runsFor += taScore;
            teamStats[a].runsAgainst += tbScore;
            teamStats[a].ballsFaced += taOversBalls;
            teamStats[a].wicketsLost += taW;
            // bowling side stats
            teamStats[b].runsFor += tbScore;
            teamStats[b].runsAgainst += taScore;
            teamStats[b].ballsFaced += tbOversBalls;
            teamStats[b].wicketsLost += tbW;
            // wickets taken
            teamStats[a].wicketsTaken += tbW;
            teamStats[b].wicketsTaken += taW;
            // ballsBowled (for NRR denominator when bowling)
            teamStats[a].ballsBowled += tbOversBalls;
            teamStats[b].ballsBowled += taOversBalls;
        }

        // Points: Win=2, Tie/No Result=1, Loss=0
        if (resultType === 'A') {
            teamStats[a].wins += 1;
            teamStats[b].losses += 1;
            teamStats[a].points += 2;
        } else if (resultType === 'B') {
            teamStats[b].wins += 1;
            teamStats[a].losses += 1;
            teamStats[b].points += 2;
        } else if (resultType === 'tie' || resultType === 'noresult' || resultType === 'abandoned') {
            teamStats[a].ties += 1;
            teamStats[b].ties += 1;
            teamStats[a].points += 1;
            teamStats[b].points += 1;
        }

        await Tournament.updateOne(
            { _id: tournament._id },
            {
                $set: {
                    matchResults,
                    teamStats
                }
            }
        );

        res.json({ success: true, teamStats: teamStats[a], teamStatsB: teamStats[b] });

    } catch (err) {
        console.error('Error saving match result', err);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;
