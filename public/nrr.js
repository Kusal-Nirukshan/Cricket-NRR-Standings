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
        successBox.style.display = 'none';

        if (!name || !overs || !teams) {
            errorBox.textContent = "⚠ Please fill in all fields before proceeding.";
            errorBox.style.display = 'block';
            return;
        }


        try {
            const res = await AppLoading.fetch('/create-tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentName: name,
                    overs,
                    teams
                })
            }, {
                title: 'Starting server...',
                message: 'The tournament will open as soon as the backend responds.'
            });

            const result = await AppLoading.readJson(res);
            const id = result.id || result._id;

            if (id) {
                successBox.textContent = "✅ Tournament created successfully!";
                successBox.style.color = "lightgreen";
                successBox.style.display = "block";

                setTimeout(() => {
                    window.location.href =
                        `/tournament.html?id=${id}&teams=${teams}&overs=${overs}`;
                }, 1200);

            } else {
                errorBox.textContent = "❌ Failed to create tournament";
                errorBox.style.display = "block";
            }

        } catch (err) {
            console.error(err);
            errorBox.textContent = "❌ Server error. Check console.";
            errorBox.style.display = "block";
        }
    });
});
