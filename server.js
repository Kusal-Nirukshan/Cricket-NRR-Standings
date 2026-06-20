const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const Tournament = require('./models/tournament');

const app = express();
const PORT = 3000;

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

function generatePairs(teams) {
    const pairs = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }
    return pairs;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static('public'));

// Mount tournament routes (contains format and match-result endpoints)
app.use('/', require('./routes/tournament'));

/* ---------- MongoDB ---------- */
mongoose.connect('mongodb://127.0.0.1:27017/dls_nrr', {
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

/* ---------- Create tournament ---------- */
app.post('/create-tournament', async (req, res) => {
    try {
        const { tournamentName, overs, teams } = req.body;

        const tournament = new Tournament({
            tournamentName,
            overs,
            teams,
            teamNames: [],
            format: '',
            groups: null
        });

        await tournament.save();

        res.json({ success: true, id: tournament._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

/* ---------- Save setup (THIS FIXES YOUR ERROR) ---------- */
app.put('/tournament/:id/setup', async (req, res) => {
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

/* ---------- Get tournament data ---------- */
app.get('/tournament/:id/data', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        // compute standings (points + NRR) from persisted teamStats
        const teamStats = (tournament.teamStats && typeof tournament.teamStats === 'object') ? tournament.teamStats : {};
        const standings = Object.keys(teamStats).map(teamName => {
            const s = teamStats[teamName] || {};
            const ballsFaced = Number(s.ballsFaced) || 0;
            const ballsBowled = Number(s.ballsBowled) || 0;
            const runsFor = Number(s.runsFor) || 0;
            const runsAgainst = Number(s.runsAgainst) || 0;

            const oversFaced = ballsFaced / 6;
            const oversBowled = ballsBowled / 6;
            const rpoFor = oversFaced > 0 ? runsFor / oversFaced : 0;
            const rpoAgainst = oversBowled > 0 ? runsAgainst / oversBowled : 0;
            const nrr = rpoFor - rpoAgainst;

            return {
                team: teamName,
                played: s.played || 0,
                wins: s.wins || 0,
                losses: s.losses || 0,
                ties: s.ties || 0,
                points: s.points || 0,
                runsFor,
                runsAgainst,
                ballsFaced,
                ballsBowled,
                nrr: Number(nrr.toFixed(3))
            };
        });

        // sort: points desc, then nrr desc, then wins desc, then runsFor desc
        standings.sort((A, B) => {
            if (B.points !== A.points) return B.points - A.points;
            if (B.nrr !== A.nrr) return B.nrr - A.nrr;
            if (B.wins !== A.wins) return B.wins - A.wins;
            return B.runsFor - A.runsFor;
        });

        res.json({
            tournamentName: tournament.tournamentName,
            overs: tournament.overs,
            teams: tournament.teams,
            teamNames: tournament.teamNames,
            format: tournament.format,
            groups: tournament.groups,
            matches: tournament.matches,
            matchResults: tournament.matchResults,
            teamStats: tournament.teamStats,
            standings
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tournament' });
    }
});

/* ---------- Start server ---------- */
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
