const express = require('express');
const router = express.Router();
const Tournament = require('../models/tournament');

function createEmptyTeamStats() {
    return {
        played: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        noResults: 0,
        points: 0,
        runsFor: 0,
        runsAgainst: 0,
        ballsFaced: 0,
        ballsBowled: 0,
        wicketsLost: 0,
        wicketsTaken: 0
    };
}

function oversToBalls(s) {
    if (s === null || typeof s === 'undefined' || s === '') return 0;
    const str = String(s).trim();
    if (!str) return 0;
    if (!str.includes('.')) return (Number(str) || 0) * 6;
    const parts = str.split('.');
    const overs = Number(parts[0]) || 0;
    let balls = Number(parts[1]) || 0;
    if (balls > 5) balls = 5;
    return overs * 6 + balls;
}

function inningsBalls(oversValue, wickets, maxOvers) {
    const maxBalls = (Number(maxOvers) || 0) * 6;
    if ((Number(wickets) || 0) >= 10 && maxBalls > 0) return maxBalls;
    return oversToBalls(oversValue);
}

function ensureTeamStatsEntry(statsMap, teamName) {
    if (!teamName) return;
    if (!statsMap[teamName]) {
        statsMap[teamName] = createEmptyTeamStats();
    }
}

function deriveTeamStatsFromResults(teamNames, matchResults, maxOvers) {
    const statsMap = {};

    (Array.isArray(teamNames) ? teamNames : []).forEach((team) => ensureTeamStatsEntry(statsMap, team));

    Object.values(matchResults || {}).forEach((results) => {
        if (!Array.isArray(results)) return;

        results.forEach((payload) => {
            const a = payload && payload.a;
            const b = payload && payload.b;
            if (!a || !b) return;

            ensureTeamStatsEntry(statsMap, a);
            ensureTeamStatsEntry(statsMap, b);

            const teamAScore = Number(payload.teamAScore) || 0;
            const teamBScore = Number(payload.teamBScore) || 0;
            const teamAWickets = Number(payload.teamAWickets) || 0;
            const teamBWickets = Number(payload.teamBWickets) || 0;
            const teamABallsFaced = inningsBalls(payload.teamAOvers, teamAWickets, maxOvers);
            const teamBBallsFaced = inningsBalls(payload.teamBOvers, teamBWickets, maxOvers);

            statsMap[a].played += 1;
            statsMap[b].played += 1;

            const hasInningsData = (
                typeof payload.teamAScore !== 'undefined' &&
                (payload.teamAOvers || payload.teamBOvers || teamAWickets >= 10 || teamBWickets >= 10)
            );

            if (hasInningsData) {
                statsMap[a].runsFor += teamAScore;
                statsMap[a].runsAgainst += teamBScore;
                statsMap[a].ballsFaced += teamABallsFaced;
                statsMap[a].wicketsLost += teamAWickets;

                statsMap[b].runsFor += teamBScore;
                statsMap[b].runsAgainst += teamAScore;
                statsMap[b].ballsFaced += teamBBallsFaced;
                statsMap[b].wicketsLost += teamBWickets;

                statsMap[a].wicketsTaken += teamBWickets;
                statsMap[b].wicketsTaken += teamAWickets;

                statsMap[a].ballsBowled += teamBBallsFaced;
                statsMap[b].ballsBowled += teamABallsFaced;
            }

            if (payload.resultType === 'A') {
                statsMap[a].wins += 1;
                statsMap[b].losses += 1;
                statsMap[a].points += 2;
            } else if (payload.resultType === 'B') {
                statsMap[b].wins += 1;
                statsMap[a].losses += 1;
                statsMap[b].points += 2;
            } else if (payload.resultType === 'tie') {
                statsMap[a].ties += 1;
                statsMap[b].ties += 1;
                statsMap[a].points += 1;
                statsMap[b].points += 1;
            } else if (payload.resultType === 'noresult' || payload.resultType === 'abandoned') {
                statsMap[a].noResults = (Number(statsMap[a].noResults) || 0) + 1;
                statsMap[b].noResults = (Number(statsMap[b].noResults) || 0) + 1;
                statsMap[a].points += 1;
                statsMap[b].points += 1;
            }
        });
    });

    return statsMap;
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

        const teamStats = deriveTeamStatsFromResults(tournament.teamNames, tournament.matchResults, tournament.overs);
        
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
                noResults: Number(s.noResults) || 0,
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
            teamStats,
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
        const oversNumber = Number(overs);
        const teamsNumber = Number(teams);

        if (!tournamentName || !Number.isFinite(oversNumber) || !Number.isFinite(teamsNumber)) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        if (oversNumber <= 0 || teamsNumber < 2) {
            return res.status(400).json({ success: false, error: "Overs must be greater than 0 and teams must be at least 2" });
        }

        const tournament = await Tournament.create({
            tournamentName: String(tournamentName).trim(),
            overs: oversNumber,
            teams: teamsNumber
        });
        res.json({ success: true, id: tournament._id });

    } catch (err) {
        console.error("Error creating tournament:", err);
        res.status(500).json({
            success: false,
            error: "Server error while creating tournament",
            detail: process.env.NODE_ENV === 'production' ? undefined : err.message
        });
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

/* ---------- Save setup ---------- */
router.put('/tournament/:id/setup', async (req, res) => {
    try {
        const { id } = req.params;
        const { format, teamNames, groups } = req.body;

        const tournament = await Tournament.findById(id);

        if (!tournament) {
            return res.status(404).json({ success: false, error: 'Tournament not found' });
        }

        tournament.format = format;
        tournament.teamNames = teamNames;

        const groupsMap = {};

        // If client passed a numeric group count, split teamNames into groups object
        if (format === 'groups' && groups && Number.isFinite(Number(groups))) {
            const groupCount = Number(groups);

            // create empty arrays
            for (let i = 0; i < groupCount; i++) {
                // Name groups as Group 1, Group 2, ...
                groupsMap[`Group ${i + 1}`] = [];
            }

            // distribute teams round-robin into groups
            for (let i = 0; i < (teamNames || []).length; i++) {
                const grpIndex = i % groupCount;
                const grpName = `Group ${grpIndex + 1}`;
                groupsMap[grpName].push(teamNames[i]);
            }

            tournament.groups = groupsMap;
        } else {
            groupsMap['All Teams'] = Array.isArray(teamNames) ? teamNames.slice() : [];
            tournament.groups = null;
        }

        // Persist a stable schedule once during setup.
        const matchesObj = {};
        Object.entries(groupsMap).forEach(([groupName, teams]) => {
            const pairs = generatePairs(Array.isArray(teams) ? teams : []);
            shuffleArray(pairs);
            matchesObj[groupName] = pairs;
        });
        tournament.matches = matchesObj;

        // Initialize stats for all teams so unplayed teams appear in standings.
        const statsObj = (tournament.teamStats && typeof tournament.teamStats === 'object') ? tournament.teamStats : {};
        (Array.isArray(teamNames) ? teamNames : []).forEach((team) => {
            if (!team) return;
            if (!statsObj[team]) statsObj[team] = createEmptyTeamStats();
        });
        tournament.teamStats = statsObj;

        // Keep result container initialized for each group.
        const resultObj = (tournament.matchResults && typeof tournament.matchResults === 'object') ? tournament.matchResults : {};
        Object.keys(groupsMap).forEach((groupName) => {
            if (!Array.isArray(resultObj[groupName])) resultObj[groupName] = [];
        });
        tournament.matchResults = resultObj;

        await tournament.save();

        res.json({ success: true });

    } catch (err) {
        console.error('❌ SETUP ERROR:', err);
        res.status(500).json({ success: false });
    }
});

// Save a match result and update per-team stats (supports editing/replacing results)
router.post('/tournament/:id/match-result', async (req, res) => {
    try {
        const payload = req.body || {};
        console.log('Received match-result for tournament', req.params.id, payload);
        const { group, a, b, resultType } = payload;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        // Work with plain objects to avoid Mixed serialization edge cases.
        const matchResults = JSON.parse(JSON.stringify(tournament.matchResults || {}));

        // store under group
        const grp = group || 'All Teams';
        matchResults[grp] = Array.isArray(matchResults[grp]) ? matchResults[grp] : [];

        // Check if a result already exists for this match number and teams (order-insensitive)
        const existingIdx = matchResults[grp].findIndex(r => (
            String(r.m) === String(payload.m) &&
            ((r.a === a && r.b === b) || (r.a === b && r.b === a))
        ));

        const resultObj = Object.assign({}, payload, { recordedAt: new Date() });

        if (existingIdx !== -1) {
            matchResults[grp][existingIdx] = resultObj;
        } else {
            matchResults[grp].push(resultObj);
        }

        // Re-derive teamStats from all match results to ensure 100% correct, consistent statistics
        const teamStats = deriveTeamStatsFromResults(tournament.teamNames, matchResults, tournament.overs);

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
