const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const Tournament = require('./models/tournament');

const app = express();
const PORT = 3000;

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static('public'));

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

        // If client passed a numeric group count, split teamNames into groups object
        if (format === 'groups' && groups && Number.isFinite(Number(groups))) {
            const groupCount = Number(groups);
            const groupsMap = {};

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
            // store whatever was provided (could be null or an existing object)
            tournament.groups = groups;
        }

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
        res.json(tournament);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tournament' });
    }
});

/* ---------- Start server ---------- */
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
