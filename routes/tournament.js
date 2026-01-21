const express = require('express');
const router = express.Router();
const Tournament = require('../models/tournament');

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

router.get('/tournament/:id/data', async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    res.json({
        tournamentName: tournament.tournamentName,
        overs: tournament.overs,
        teams: tournament.teams
    });
});

// routes/tournament.js
router.post('/tournament/:id/format', async (req, res) => {
    try {
        const { format, numGroups, teamNames } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ error: "Tournament not found" });

        tournament.format = format;
        tournament.teamNames = teamNames;

        if (format === 'groups' && numGroups) {
            const teamsPerGroup = Math.floor(teamNames.length / numGroups);
            const groups = [];
            for (let i = 0; i < numGroups; i++) {
                groups.push({
                    name: (i + 1).toString(),
                    teams: teamNames.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup)
                });
            }
            tournament.groups = groups;
        }

        await tournament.save();
        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});


module.exports = router;
