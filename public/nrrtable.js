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

        // Build standingsList from backend teamStats if available
        let standingsList = null;
        if (data.teamStats && typeof data.teamStats === 'object') {
            standingsList = Object.entries(data.teamStats).map(([team, stats]) => ({ team, ...stats }));
        }
        // groups is an object map (Group name => [teams])
        if (data.groups && !Array.isArray(data.groups) && typeof data.groups === 'object') {
            Object.entries(data.groups).forEach(([groupName, teams]) => {
                renderGroup(container, groupName, teams, standingsList);
                // Always use backend's matches array if available, never regenerate
                let matches = (data.matches && data.matches[groupName]) ? data.matches[groupName] : [];
                if (!matches.length) {
                    // fallback only if backend did not provide matches
                    matches = generatePairs(teams);
                }
                renderMatches(matchesContainer, tournamentId, groupName, matches, overs, data.matchResults && data.matchResults[groupName] ? data.matchResults[groupName] : []);
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
                let matches = (data.matches && data.matches[groupName]) ? data.matches[groupName] : generatePairs(teams);
                renderMatches(matchesContainer, tournamentId, groupName, matches, overs, data.matchResults && data.matchResults[groupName] ? data.matchResults[groupName] : []);
            });

        } else if (Array.isArray(data.teamNames) && data.teamNames.length) {
            // no groups provided; render single table for all teams
            renderGroup(container, 'All Teams', data.teamNames, standingsList);
            let matches = (data.matches && data.matches['All Teams']) ? data.matches['All Teams'] : [];
            if (!matches.length) {
                matches = generatePairs(data.teamNames);
            }
            renderMatches(matchesContainer, tournamentId, 'All Teams', matches, overs, data.matchResults && data.matchResults['All Teams'] ? data.matchResults['All Teams'] : []);
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
            // sort by points desc, wins desc, nrr desc, runsFor desc
            groupStandings.sort((x, y) => {
                const px = Number(x.points) || 0;
                const py = Number(y.points) || 0;
                const wx = Number(x.wins) || 0;
                const wy = Number(y.wins) || 0;
                const nx = (typeof x.nrr === 'number') ? x.nrr : (x.runsFor && x.played ? (Number(x.runsFor) - Number(x.runsAgainst)) / Number(x.played) : 0);
                const ny = (typeof y.nrr === 'number') ? y.nrr : (y.runsFor && y.played ? (Number(y.runsFor) - Number(y.runsAgainst)) / Number(y.played) : 0);
                const rfx = Number(x.runsFor) || 0;
                const rfy = Number(y.runsFor) || 0;
                return (py - px) || (wy - wx) || (ny - nx) || (rfy - rfx);
            });

            rowsHtml = groupStandings.map(s => {
                const played = Number(s.played) || 0;
                const runsFor = Number(s.runsFor) || 0;
                const runsAgainst = Number(s.runsAgainst) || 0;
                const ballsFaced = Number(s.ballsFaced) || 0;
                const ballsBowled = Number(s.ballsBowled) || 0;
                // Prefer accurate NRR: runs/over scored - runs/over conceded
                let nrrVal = 0;
                if (ballsFaced > 0 || ballsBowled > 0) {
                    const oversFor = ballsFaced > 0 ? (ballsFaced / 6) : 0;
                    const oversAgainst = ballsBowled > 0 ? (ballsBowled / 6) : 0;
                    const rpoFor = oversFor > 0 ? runsFor / oversFor : 0;
                    const rpoAgainst = oversAgainst > 0 ? runsAgainst / oversAgainst : 0;
                    nrrVal = rpoFor - rpoAgainst;
                } else if (typeof s.nrr === 'number') {
                    nrrVal = s.nrr;
                } else {
                    nrrVal = played ? (runsFor - runsAgainst) / played : 0;
                }
                return `
                <tr>
                    <td>${s.team}</td>
                    <td>${played}</td>
                    <td>${Number(s.wins) || 0}</td>
                    <td>${Number(s.losses) || 0}</td>
                    <td>${Number(s.points) || 0}</td>
                    <td>${Number(nrrVal).toFixed(3)}</td>
                </tr>
            `}).join('');
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

// Generate randomized round-robin pairings avoiding consecutive matches for the same team
function generatePairs(teams) {
    // Shuffle teams to randomize schedule
    const shuffled = teams.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const n = shuffled.length;
    const rounds = (n % 2 === 0) ? n - 1 : n; // for odd n, add a bye
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
        // Rotate teams except the first
        teamsList.splice(1, 0, teamsList.pop());
    }

    // Extra shuffle to avoid rare consecutive matches for the same team
    for (let i = 1; i < matchups.length; i++) {
        if (matchups[i][0] === matchups[i-1][0] || matchups[i][0] === matchups[i-1][1] ||
            matchups[i][1] === matchups[i-1][0] || matchups[i][1] === matchups[i-1][1]) {
            // Swap with a later match if possible
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
        // Try to load match data from backend matchResults
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

// Calculate and update standings for a group using localStorage match data
function updateGroupStandings(tournamentId, groupName, matches) {
    // Gather all teams
    const teamsSet = new Set();
    matches.forEach(([a, b]) => { teamsSet.add(a); teamsSet.add(b); });
    const teams = Array.from(teamsSet);
    // Initialize stats
    const stats = {};
    teams.forEach(team => {
        stats[team] = { team, played: 0, wins: 0, losses: 0, points: 0, nrr: 0, runsFor: 0, runsAgainst: 0 };
    });
    // Process each match
    matches.forEach((pair, idx) => {
        const [a, b] = pair;
        const matchKey = `matchdata_${tournamentId}_${groupName}_${idx}`;
        const local = localStorage.getItem(matchKey);
        if (local) {
            let matchData;
            try { matchData = JSON.parse(local); } catch { return; }
            const runsA = Number(matchData.runsA);
            const runsB = Number(matchData.runsB);
            if (!isNaN(runsA) && !isNaN(runsB)) {
                stats[a].played++;
                stats[b].played++;
                stats[a].runsFor += runsA;
                stats[a].runsAgainst += runsB;
                stats[b].runsFor += runsB;
                stats[b].runsAgainst += runsA;
                if (runsA > runsB) {
                    stats[a].wins++;
                    stats[b].losses++;
                    stats[a].points += 2;
                } else if (runsB > runsA) {
                    stats[b].wins++;
                    stats[a].losses++;
                    stats[b].points += 2;
                } else {
                    // Tie: 1 point each
                    stats[a].points++;
                    stats[b].points++;
                }
            }
        }
    });
    // Helper: parse overs string like "49.3" -> balls
    function oversToBallsLocal(s) {
        if (s === undefined || s === null || s === '') return 0;
        if (typeof s === 'number') return Math.floor(s) * 6;
        const str = String(s).trim();
        if (!str) return 0;
        if (!str.includes('.')) return (Number(str) || 0) * 6;
        const parts = str.split('.');
        const overs = Number(parts[0]) || 0;
        let balls = Number(parts[1]) || 0;
        if (balls > 5) balls = Math.min(balls, 5);
        return overs * 6 + balls;
    }

    // Calculate NRR using runs and balls (if available)
    teams.forEach(team => {
        // ensure numeric fields exist
        stats[team].runsFor = Number(stats[team].runsFor) || 0;
        stats[team].runsAgainst = Number(stats[team].runsAgainst) || 0;
        stats[team].ballsFaced = Number(stats[team].ballsFaced) || 0;
        stats[team].ballsBowled = Number(stats[team].ballsBowled) || 0;
        // compute NRR: runs per over scored - runs per over conceded
        let nrr = 0;
        if (stats[team].ballsFaced > 0 || stats[team].ballsBowled > 0) {
            const oversFor = stats[team].ballsFaced > 0 ? stats[team].ballsFaced / 6 : 0;
            const oversAgainst = stats[team].ballsBowled > 0 ? stats[team].ballsBowled / 6 : 0;
            const rpoFor = oversFor > 0 ? stats[team].runsFor / oversFor : 0;
            const rpoAgainst = oversAgainst > 0 ? stats[team].runsAgainst / oversAgainst : 0;
            nrr = rpoFor - rpoAgainst;
        } else if (stats[team].played > 0) {
            nrr = (stats[team].runsFor - stats[team].runsAgainst) / stats[team].played;
        }
        stats[team].nrr = nrr;
    });

    // Sort standings: points desc, wins desc, nrr desc, runsFor desc
    const standings = teams.map(team => stats[team]);
    standings.sort((a, b) => {
        return (b.points - a.points) || (b.wins - a.wins) || (b.nrr - a.nrr) || (b.runsFor - a.runsFor);
    });
    // Update the group table
    const container = document.getElementById('tablesContainer');
    // Remove old table for this group
    const oldTables = Array.from(container.querySelectorAll('table'));
    oldTables.forEach(tbl => {
        if (tbl.caption && tbl.caption.textContent === groupName) {
            container.removeChild(tbl);
        }
    });
    // Render new table
    const table = document.createElement('table');
    table.innerHTML = `
        <caption>${groupName}</caption>
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
            ${standings.map(s => `
                <tr>
                    <td>${s.team}</td>
                    <td>${s.played}</td>
                    <td>${s.wins}</td>
                    <td>${s.losses}</td>
                    <td>${s.points}</td>
                    <td>${s.nrr.toFixed(3)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}
