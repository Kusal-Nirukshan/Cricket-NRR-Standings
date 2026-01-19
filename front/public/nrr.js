document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('tournamentForm');
    const errorBox = document.getElementById('errorMessage');
    const successBox = document.getElementById('successMessage');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const overs = Number(document.getElementById('overs').value);
        const teams = Number(document.getElementById('teams').value);

 
        errorBox.style.display = 'none';
        errorBox.textContent = '';
        successBox.style.display = 'none';
        successBox.textContent = '';

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
            const res = await fetch('http://localhost:3000/create-tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                successBox.textContent = "✅ Tournament created successfully!";
                successBox.style.color = "lightgreen";
                successBox.style.display = "block";

                // ⏳ wait 1.5 seconds before redirect
                const query = new URLSearchParams({
                    id: result.id,
                    tournament: name,
                    teams: teams,
                    overs: overs
                });

                setTimeout(() => {
                    window.location.href = `/tournament.html?${query.toString()}`;
                }, 3000);

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
