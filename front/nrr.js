document.addEventListener('DOMContentLoaded', () => {

    console.log("NRR JS LOADED");
    const form = document.getElementById('tournamentForm');
    const errorBox = document.getElementById('errorMessage');
    const successBox = document.getElementById('successMessage');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const overs = document.getElementById('overs').value.trim();
        const teams = document.getElementById('teams').value.trim();

 
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
                setTimeout(() => {
                     window.location.href = `http://localhost:3000/tournament/${encodeURIComponent(result.id)}`;
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
