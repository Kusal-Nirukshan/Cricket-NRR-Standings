document.addEventListener('DOMContentLoaded', async () => {
    const tournamentId = window.location.pathname.split('/').pop(); // get ID from URL
    const nameEl = document.getElementById('tournamentName');
    const detailsEl = document.getElementById('tournamentDetails');
    const tablesContainer = document.getElementById('tablesContainer');
    const groupInput = document.getElementById('groupInput');
    const formatForm = document.getElementById('formatForm');

    // Fetch tournament data
    try {
        const res = await fetch(`http://localhost:3000/tournament/${tournamentId}/data`);
        const data = await res.json();
        nameEl.textContent = data.tournamentName;
        detailsEl.textContent = `Overs: ${data.overs} | Teams: ${data.teams}`;

        // Update max of number input for groups
        document.getElementById('numGroups').max = data.teams;

        // Event listeners for format selection
        formatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            tablesContainer.innerHTML = '';
            const format = document.querySelector('input[name="format"]:checked').value;

            if(format === 'roundrobin'){
                const table = document.createElement('table');
                table.innerHTML = '<tr><th>Round-Robin Schedule</th></tr>';
                for(let i=1; i<=data.teams; i++){
                    table.innerHTML += `<tr><td>Team ${i}</td></tr>`;
                }
                tablesContainer.appendChild(table);
            } else {
                const numGroups = parseInt(document.getElementById('numGroups').value);
                const teamsPerGroup = Math.ceil(data.teams / numGroups);
                for(let g=1; g<=numGroups; g++){
                    const table = document.createElement('table');
                    table.innerHTML = `<tr><th>Group ${g}</th></tr>`;
                    for(let t=1; t<=teamsPerGroup; t++){
                        const teamNum = (g-1)*teamsPerGroup + t;
                        if(teamNum > data.teams) break;
                        table.innerHTML += `<tr><td>Team ${teamNum}</td></tr>`;
                    }
                    tablesContainer.appendChild(table);
                }
            }
        });

        // Show/hide group input
        document.querySelectorAll('input[name="format"]').forEach(radio => {
            radio.addEventListener('change', () => {
                groupInput.style.display = document.querySelector('input[name="format"]:checked').value === 'groups' ? 'block' : 'none';
            });
        });

    } catch(err) {
        nameEl.textContent = "Failed to load tournament data";
        console.error(err);
    }
});
