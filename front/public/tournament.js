document.addEventListener('DOMContentLoaded', () => {

    // --- Get data from previous page via URL ---
    const params = new URLSearchParams(window.location.search);
    const tournamentName = params.get('tournament');      // Tournament name
    const teamCount = parseInt(params.get('teams'), 10);  // Number of teams
    const overs = params.get('overs');                    // Overs

    // --- Tournament ID from URL path ---
    const tournamentId = window.location.pathname.split('/').pop();

    // --- UI elements ---
    const nameEl = document.getElementById('tournamentName');
    const detailsEl = document.getElementById('tournamentDetails');
    const formatForm = document.getElementById('formatForm');
    const groupInput = document.getElementById('groupInput');
    const numGroupsInput = document.getElementById('numGroups');

    // --- Populate tournament info on page ---
    nameEl.textContent = tournamentName;
    detailsEl.textContent = `Overs: ${overs} | Teams: ${teamCount}`;
    numGroupsInput.max = teamCount;

    // --- Show / hide group input based on format ---
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedFormat = document.querySelector('input[name="format"]:checked').value;
            groupInput.style.display = selectedFormat === 'groups' ? 'block' : 'none';
        });
    });

    // --- Handle form submission ---
    formatForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const format = document.querySelector('input[name="format"]:checked').value;
        let groups = '';

        if (format === 'groups') {
            groups = parseInt(numGroupsInput.value, 10);

            if (!groups || groups < 2 || teamCount % groups !== 0) {
                alert('⚠ Invalid number of groups');
                return;
            }
        }

        const query = new URLSearchParams({
            tournament: tournamentName,
            teams: teamCount,
            overs: overs,
            format: format,
            groups: groups
        });

        window.location.href = `/tournament/${tournamentId}/nrr?${query.toString()}`;
    });
});
