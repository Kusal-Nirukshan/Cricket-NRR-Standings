document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);

    const tournamentName = params.get('tournament');
    const teamCount = parseInt(params.get('teams'), 10);
    const format = params.get('format');
    const groupCount = parseInt(params.get('groups'), 10);

    const tournamentId = window.location.pathname.split('/').slice(-2)[0];
    const container = document.getElementById('tablesContainer');
    const title = document.getElementById('tournamentName');

    const res = await fetch(`http://localhost:3000/tournament/${tournamentId}/nrr-data`);
    const data = await res.json();

    title.textContent = data.tournamentName;
    document.getElementById('tournamentTitle').textContent = `NRR Table of ${tournamentName}`;

    if (data.format === 'roundrobin') {
        renderGroup(container, 'League Table', data.teams);
    } else {
        data.groups.forEach(group => {
            renderGroup(container, `Group ${group.name}`, group.teams);
        });
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
