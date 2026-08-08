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
        const res = await AppLoading.fetch(`/tournament/${encodeURIComponent(tournamentId)}/data`, undefined, {
            title: 'Loading table...',
            message: 'The free server may be waking up. This can take a few seconds.'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        titleEl.textContent = "NRR Table - " + (data.tournamentName || 'Tournament');

        const overs = data.overs || 50;

        // Build standingsList from backend standings
        let standingsList = [];
        if (Array.isArray(data.standings)) {
            standingsList = data.standings;
        }

        // Render groups if provided
        if (data.groups && !Array.isArray(data.groups) && typeof data.groups === 'object') {
            Object.entries(data.groups).forEach(([groupName, teams]) => {
                renderGroup(container, groupName, teams, standingsList, overs);
                let matches = (data.matches && data.matches[groupName]) ? data.matches[groupName] : [];
                if (!matches.length) {
                    matches = generatePairs(teams);
                }
                renderMatches(matchesContainer, tournamentId, groupName, matches, overs, data.matchResults && data.matchResults[groupName] ? data.matchResults[groupName] : []);
            });
        } else if (Array.isArray(data.teamNames) && data.teamNames.length) {
            // No groups provided; render single table for all teams
            renderGroup(container, 'All Teams', data.teamNames, standingsList, overs);
            let matches = (data.matches && data.matches['All Teams']) ? data.matches['All Teams'] : [];
            if (!matches.length) {
                matches = generatePairs(data.teamNames);
            }
            renderMatches(matchesContainer, tournamentId, 'All Teams', matches, overs, data.matchResults && data.matchResults['All Teams'] ? data.matchResults['All Teams'] : []);
        } else {
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
function renderGroup(container, title, teams, standingsList, tournamentOvers = 50) {
    const table = document.createElement('table');
    let rowsHtml = '';

    if (Array.isArray(standingsList)) {
        const groupStandings = standingsList.filter(s => teams.includes(s.team));
        if (groupStandings.length) {
            // backend already sorts them, but we make sure:
            groupStandings.sort((x, y) => {
                const px = Number(x.points) || 0;
                const py = Number(y.points) || 0;
                const wx = Number(x.wins) || 0;
                const wy = Number(y.wins) || 0;
                const nx = Number(x.nrr) || 0;
                const ny = Number(y.nrr) || 0;
                const rfx = Number(x.runsFor) || 0;
                const rfy = Number(y.runsFor) || 0;
                return (py - px) || (wy - wx) || (ny - nx) || (rfy - rfx);
            });

            rowsHtml = groupStandings.map(s => {
                const played = Number(s.played) || 0;
                const runsFor = Number(s.runsFor) || 0;
                const runsAgainst = Number(s.runsAgainst) || 0;
                const nrrVal = Number(s.nrr) || 0;
                return `
                <tr>
                    <td>${s.team}</td>
                    <td>${played}</td>
                    <td>${Number(s.wins) || 0}</td>
                    <td>${Number(s.losses) || 0}</td>
                    <td>${Number(s.ties) || 0}</td>
                    <td>${Number(s.noResults) || 0}</td>
                    <td>${Number(s.points) || 0}</td>
                    <td>${nrrVal.toFixed(3)}</td>
                </tr>
            `}).join('');
        }
    }

    if (!rowsHtml) {
        rowsHtml = teams.map(t => `
            <tr>
                <td>${t}</td>
                <td>0</td>
                <td>0</td>
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
                <th>Ties</th>
                <th>N/R</th>
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

// Generate randomized round-robin pairings avoiding consecutive matches for the same team
function generatePairs(teams) {
    const shuffled = teams.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const n = shuffled.length;
    const rounds = (n % 2 === 0) ? n - 1 : n;
    const teamsList = n % 2 === 0 ? shuffled.slice() : shuffled.concat(['BYE']);
    const matchups = [];

    for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < teamsList.length / 2; i++) {
            const teamA = teamsList[i];
            const teamB = teamsList[teamsList.length - 1 - i];
            if (teamA !== 'BYE' && teamB !== 'BYE') {
                matchups.push([teamA, teamB]);
            }
        }
        teamsList.splice(1, 0, teamsList.pop());
    }

    for (let i = 1; i < matchups.length; i++) {
        if (matchups[i][0] === matchups[i-1][0] || matchups[i][0] === matchups[i-1][1] ||
            matchups[i][1] === matchups[i-1][0] || matchups[i][1] === matchups[i-1][1]) {
            for (let j = i + 1; j < matchups.length; j++) {
                if (matchups[j][0] !== matchups[i-1][0] && matchups[j][0] !== matchups[i-1][1] &&
                    matchups[j][1] !== matchups[i-1][0] && matchups[j][1] !== matchups[i-1][1]) {
                    [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
                    break;
                }
            }
        }
    }

    return matchups;
}

// Render clickable match buttons for a group
function renderMatches(container, tournamentId, groupName, matches, overs, matchResults) {
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
        let matchData = null;
        if (Array.isArray(matchResults)) {
            matchData = matchResults.find(r => (r.a === a && r.b === b && String(r.m) === String(idx+1)) || (r.a === b && r.b === a && String(r.m) === String(idx+1)));
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'match-btn';
        btn.textContent = `Match ${idx + 1}: ${a} vs ${b}`;
        if (matchData) {
            btn.classList.add('match-completed');
            btn.title = `Result saved: ${matchData.teamAScore} / ${matchData.teamAOvers} (${a}) vs ${matchData.teamBScore} / ${matchData.teamBOvers} (${b})`;
        }
        btn.addEventListener('click', () => {
            const url = `/match.html?id=${encodeURIComponent(tournamentId)}&group=${encodeURIComponent(groupName)}&a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&m=${idx+1}&overs=${encodeURIComponent(overs)}`;
            window.location.href = url;
        });

        list.appendChild(btn);
    });

    section.appendChild(list);
    container.appendChild(section);
}
