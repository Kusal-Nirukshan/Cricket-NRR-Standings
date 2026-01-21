document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('id');

    if (!tournamentId) {
        alert('Tournament ID missing');
        return;
    }

    // UI elements
    const nameEl = document.getElementById('tournamentName');
    const detailsEl = document.getElementById('tournamentDetails');
    const formatForm = document.getElementById('formatForm');
    const groupInput = document.getElementById('groupInput');
    const numGroupsInput = document.getElementById('numGroups');

    let teamCount = 0;

    // 🔹 Fetch tournament data from backend
    try {
        const res = await fetch(`/tournament/${tournamentId}/data`);
        const data = await res.json();

        nameEl.textContent = data.tournamentName;
        detailsEl.textContent = `Overs: ${data.overs} | Teams: ${data.teams}`;
        teamCount = data.teams;

        numGroupsInput.max = teamCount;

    } catch (err) {
        console.error(err);
        alert('Failed to load tournament data');
        return;
    }

    // Show / hide group input
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const selected = document.querySelector('input[name="format"]:checked').value;
            groupInput.style.display = selected === 'groups' ? 'block' : 'none';
        });
    });

    // Handle submit → go to NRR table
    formatForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const format = document.querySelector('input[name="format"]:checked').value;
        let groups = '';

        if (format === 'groups') {
            groups = parseInt(numGroupsInput.value, 10);

            if (!groups || groups < 2 || teamCount % groups !== 0) {
                alert('Invalid number of groups');
                return;
            }
        }

        let url = `/nrrtable.html?id=${tournamentId}&format=${format}`;
        if (format === 'groups') {
            url += `&groups=${groups}`;
        }

        window.location.href = url;
    });
});
