document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);

    const tournamentId = params.get('id');
    const tournamentName = params.get('tournament');
    const format = params.get('format'); // "roundrobin" or "groups"
    const groupCount = parseInt(params.get('groups'), 10) || null;
    const teams = params.get('teams').split(','); // team names array

    // UI
    const container = document.getElementById('tablesContainer');
    const title = document.getElementById('tournamentName');
    title.textContent = tournamentName;
    document.getElementById('tournamentTitle').textContent = `NRR Table of ${tournamentName}`;

    // Optional: fetch tournament metadata from backend
    try {
        const res = await fetch(`http://localhost:3000/tournament/${tournamentId}/data`);
        const data = await res.json();
        console.log("Tournament data from backend:", data);
    } catch (err) {
        console.warn("Failed to fetch backend data:", err);
    }

    // Render tables
    if (format === 'roundrobin') {
        renderGroup(container, 'League Table', teams);
    } else if (format === 'groups' && groupCount) {
        const teamsPerGroup = teams.length / groupCount;
        for (let i = 0; i < groupCount; i++) {
            const groupTeams = teams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
            renderGroup(container, `Group ${i + 1}`, groupTeams);
        }
    } else {
        console.error("Invalid format or group count");
    }
});

function renderGroup(container, title, teams) {
    const table = document.createElement('table');

    table.innerHTML = `
        <caption>${title}</caption>
        <thead>
            <tr>
                <th>Team</th>
                <th>Played</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Points</th>
                <th>NRR</th>
            </tr>
        </thead>
        <tbody>
            ${teams.map(t => `
                <tr>
                    <td>${t}</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0.000</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}
