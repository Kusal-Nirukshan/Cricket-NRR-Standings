document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('tournamentNameInput');
    const oversInput = document.getElementById('oversInput');
    const teamInputsContainer = document.getElementById('teamInputsContainer');
    const formatForm = document.getElementById('formatForm');
    const groupInput = document.getElementById('groupInput');
    const numGroupsInput = document.getElementById('numGroups');

    // Show / hide group input
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', () => {
            groupInput.style.display = radio.value === 'groups' ? 'block' : 'none';
        });
    });

    function getTeamNames() {
        const inputs = teamInputsContainer.querySelectorAll('input');
        return [...inputs].map(i => i.value.trim()).filter(n => n);
    }

    formatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tournamentName = nameInput.value.trim();
        const overs = parseInt(oversInput.value, 10);
        const teamsArray = getTeamNames();

        if (!tournamentName || !overs || teamsArray.length < 2) {
            alert('Fill name, overs, and at least 2 teams.');
            return;
        }

        const format = document.querySelector('input[name="format"]:checked').value;
        let groupCount = null;

        if (format === 'groups') {
            groupCount = parseInt(numGroupsInput.value, 10);
            if (!groupCount || groupCount < 2 || teamsArray.length % groupCount !== 0) {
                alert('Invalid number of groups.');
                return;
            }
        }

        try {
            // 1️⃣ Create tournament
            const resCreate = await fetch('/tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: tournamentName,
                    overs,
                    teams: teamsArray.length,
                    teamNames: teamsArray
                })
            });

            const savedTournament = await resCreate.json();
            const tournamentId = savedTournament._id;

            // 2️⃣ Save format/groups
            await fetch(`/tournament/${tournamentId}/format`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format, groupCount })
            });

            // 3️⃣ Redirect to NRR page
            window.location.href = `/nrrtable.html?id=${tournamentId}`;

        } catch (err) {
            console.error(err);
            alert('Failed to create tournament. See console.');
        }
    });
});
