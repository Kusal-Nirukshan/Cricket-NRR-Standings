document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('id');

    if (!tournamentId) {
        alert('Tournament ID missing');
        return;
    }

    const container = document.getElementById('tablesContainer');
    const matchesContainer = document.getElementById('matchesContainer');
    const titleEl = document.getElementById('tournamentTitle');

    try {
        const res = await fetch(`/tournament/${tournamentId}/data`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        titleEl.textContent = "NRR Table - " + (data.tournamentName || 'Tournament');

        // Render groups if provided
        // determine tournament overs (fallbacks)
        const overs = data.overs || data.maxOvers || data.oversPerSide || 50;

        const standingsList = Array.isArray(data.standings) ? data.standings : null;
        // groups is an object map (Group name => [teams])
        if (data.groups && !Array.isArray(data.groups) && typeof data.groups === 'object') {
            Object.entries(data.groups).forEach(([groupName, teams]) => {
                renderGroup(container, groupName, teams, standingsList);
                const matches = (data.matches && data.matches[groupName]) ? data.matches[groupName] : generatePairs(teams);
                renderMatches(matchesContainer, tournamentId, groupName, matches, overs);
            });

        // legacy: groups is a numeric count and teamNames provided
        } else if (data.groups && Number.isFinite(Number(data.groups)) && Array.isArray(data.teamNames)) {
            const groupCount = Number(data.groups);
            const groupsMap = {};
            for (let i = 0; i < groupCount; i++) groupsMap[`Group ${i + 1}`] = [];
            for (let i = 0; i < data.teamNames.length; i++) {
                const grpIndex = i % groupCount;
                groupsMap[`Group ${grpIndex + 1}`].push(data.teamNames[i]);
            }
            Object.entries(groupsMap).forEach(([groupName, teams]) => {
                renderGroup(container, groupName, teams, standingsList);
                const matches = (data.matches && data.matches[groupName]) ? data.matches[groupName] : generatePairs(teams);
                renderMatches(matchesContainer, tournamentId, groupName, matches, overs);
            });

        // groups explicitly provided as an array of team names (single group)
        } else if (Array.isArray(data.groups) && data.groups.length) {
            renderGroup(container, 'All Teams', data.groups, standingsList);
            const matches = (data.matches && data.matches['All Teams']) ? data.matches['All Teams'] : generatePairs(data.groups);
            renderMatches(matchesContainer, tournamentId, 'All Teams', matches, overs);

        } else if (Array.isArray(data.teamNames) && data.teamNames.length) {
            // no groups provided; render single table for all teams
            renderGroup(container, 'All Teams', data.teamNames, standingsList);
            const matches = (data.matches && data.matches['All Teams']) ? data.matches['All Teams'] : generatePairs(data.teamNames);
            renderMatches(matchesContainer, tournamentId, 'All Teams', matches, overs);
        } else {
            // no team data available
            const msg = document.createElement('p');
            msg.textContent = 'No teams available for this tournament.';
            container.appendChild(msg);
        }

    } catch (err) {
        console.error(err);
        alert('Failed to load tournament data');
    }
});

// Render single group table
function renderGroup(container, title, teams, standingsList) {
    const table = document.createElement('table');
    // build tbody rows: prefer standingsList filtered to this group's teams if available
    let rowsHtml = '';
    if (Array.isArray(standingsList)) {
        const groupStandings = standingsList.filter(s => teams.includes(s.team));
        if (groupStandings.length) {
            rowsHtml = groupStandings.map(s => `
                <tr>
                    <td>${s.team}</td>
                    <td>${s.played}</td>
                    <td>${s.wins}</td>
                    <td>${s.losses}</td>
                    <td>${s.points}</td>
                    <td>${s.nrr.toFixed ? s.nrr.toFixed(3) : Number(s.nrr).toFixed(3)}</td>
                </tr>
            `).join('');
        }
    }

    // fallback to simple team list if no standings available for these teams
    if (!rowsHtml) {
        rowsHtml = teams.map(t => `
            <tr>
                <td>${t}</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0.000</td>
            </tr>
        `).join('');
    }

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
            ${rowsHtml}
        </tbody>
    `;
    container.appendChild(table);
}

// Generate all unique pairings (simple combination C(n,2))
function generatePairs(teams) {
    const pairs = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }
    
    return pairs;
}

// Render clickable match buttons for a group
function renderMatches(container, tournamentId, groupName, matches, overs) {
    if (!container) return;
    const section = document.createElement('section');
    section.className = 'matches-group';
    const h = document.createElement('h3');
    h.textContent = `${groupName} - Matches`;
    section.appendChild(h);

    const list = document.createElement('div');
    list.className = 'matches-list';

    matches.forEach((pair, idx) => {
        const [a, b] = pair;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'match-btn';
        btn.textContent = `Match ${idx + 1}: ${a} vs ${b}`;
        btn.addEventListener('click', () => {
            const url = `/match.html?id=${encodeURIComponent(tournamentId)}&group=${encodeURIComponent(groupName)}&a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&m=${idx+1}&overs=${encodeURIComponent(overs)}`;
            window.location.href = url;
        });
        list.appendChild(btn);
    });

    section.appendChild(list);
    container.appendChild(section);
}
