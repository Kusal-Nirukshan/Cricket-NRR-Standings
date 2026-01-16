document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('tournamentForm');
    const errorBox = document.getElementById('errorMessage');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const overs = document.getElementById('overs').value.trim();
        const teams = document.getElementById('teams').value.trim();

 
        errorBox.style.display = 'none';
        errorBox.textContent = '';

        if (!name || !overs || !teams) {
            errorBox.textContent = "⚠ Please fill in all fields before proceeding.";
            errorBox.style.display = 'block';
            return; 
        }

        const data = {
            tournamentName: name,
            overs: overs,
            teams: teams
        };

        try {
            const res = await fetch('/create-tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                window.location.href = `/tournament/${encodeURIComponent(result.id)}`;
            } else {
                errorBox.textContent = "❌ " + (result.error || "Error saving tournament");
                errorBox.style.display = "block";
            }
        } catch (err) {
            console.error("Failed to parse JSON:", err);
            errorBox.textContent = "❌ Server returned invalid response";
            errorBox.style.display = "block";
        }
    });

    document.querySelectorAll('#tournamentForm input').forEach(input => {
        input.addEventListener('input', () => {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        });
    });
});
