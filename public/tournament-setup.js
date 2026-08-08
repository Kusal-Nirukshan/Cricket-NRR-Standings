document.addEventListener('DOMContentLoaded', async () => {
    // --- Parse URL Parameters ---
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('id');
    const teamCount = parseInt(params.get('teams'), 10);
    const oversCount = parseInt(params.get('overs'), 10);

    if (!tournamentId) {
        alert('Tournament ID missing in URL');
        return;
    }

    // --- UI Elements ---
    const titleEl = document.getElementById('tournamentName');
    const detailsEl = document.getElementById('tournamentDetails');
    const teamInputsContainer = document.getElementById('teamInputsContainer');
    const formatRadios = document.querySelectorAll('input[name="format"]');
    const groupOptionsWrapper = document.getElementById('groupOptions');
    const groupRadios = document.querySelectorAll('input[name="groupCount"]');
    const otherGroupInputWrapper = document.getElementById('otherInput');
    const customGroupInput = document.getElementById('customGroupCount');
    const proceedButton = document.getElementById('proceedButton');
    const errorBox = document.getElementById('errorMessage');

    // --- State Variables ---
    let selectedFormat = null;
    let selectedGroupCount = null;

    // --- Initialize Error/Success UI ---
    errorBox.style.display = 'none';
    proceedButton.disabled = true;

    // --- 1. Load Tournament Metadata ---
    try {
        const res = await AppLoading.fetch(`/tournament/${encodeURIComponent(tournamentId)}/data`, undefined, {
            title: 'Loading tournament...',
            message: 'The free server may be waking up. This can take a few seconds.'
        });
        if (res.ok) {
            const data = await AppLoading.readJson(res);
            titleEl.textContent = data.tournamentName || 'Cricket Tournament';
            detailsEl.textContent = `${teamCount || data.teams || 0} Teams • ${oversCount || data.overs || 0} Overs Per Side`;
        }
    } catch (err) {
        console.error('Failed to load tournament metadata:', err);
    }

    // --- 2. Dynamically Generate Team Name Inputs ---
    if (teamCount && teamCount >= 2) {
        teamInputsContainer.innerHTML = ''; // clear any existing
        for (let i = 1; i <= teamCount; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Team ${i} Name`;
            input.className = 'team-input';
            input.required = true;
            teamInputsContainer.appendChild(input);
        }
    }

    // --- 3. Unified Validation Logic ---
    function checkFormValidation() {
        // Clear previous error/success styles
        errorBox.style.display = 'none';
        errorBox.textContent = '';
        errorBox.className = 'error-message'; // reset class
        
        let isValid = true;

        // A. Verify all team name inputs are filled
        const teamInputs = teamInputsContainer.querySelectorAll('input.team-input');
        const teamNames = [...teamInputs].map(input => input.value.trim());
        const anyEmpty = teamNames.some(name => name === '');

        if (anyEmpty) {
            isValid = false;
        }

        // B. Verify format selection
        if (!selectedFormat) {
            isValid = false;
        }

        // C. Verify group configuration if 'groups' is selected
        if (selectedFormat === 'groups') {
            if (selectedGroupCount === null || isNaN(selectedGroupCount)) {
                isValid = false;
            } else if (selectedGroupCount <= 1) {
                errorBox.textContent = "⚠ Number of groups must be greater than 1";
                errorBox.className = 'error-message';
                errorBox.style.display = 'block';
                isValid = false;
            } else if (teamCount % selectedGroupCount !== 0) {
                errorBox.textContent = `❌ Cannot divide ${teamCount} teams evenly into ${selectedGroupCount} groups.`;
                errorBox.className = 'error-message';
                errorBox.style.display = 'block';
                isValid = false;
            } else {
                // Divisible and valid
                const teamsPerGroup = teamCount / selectedGroupCount;
                errorBox.textContent = `✅ Each group will have ${teamsPerGroup} teams.`;
                errorBox.className = 'success-message';
                errorBox.style.display = 'block';
            }
        }

        proceedButton.disabled = !isValid;
    }

    // --- 4. Event Listeners ---

    // Team name inputs
    teamInputsContainer.addEventListener('input', checkFormValidation);

    // Format selection radios
    formatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            selectedFormat = radio.value;
            if (selectedFormat === 'groups') {
                groupOptionsWrapper.classList.add('show');
            } else {
                groupOptionsWrapper.classList.remove('show');
                otherGroupInputWrapper.classList.remove('show');
                
                // Reset groups selection
                selectedGroupCount = null;
                groupRadios.forEach(r => r.checked = false);
                customGroupInput.value = '';
            }
            checkFormValidation();
        });
    });

    // Group count radios
    groupRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'other') {
                otherGroupInputWrapper.classList.add('show');
                const val = parseInt(customGroupInput.value, 10);
                selectedGroupCount = (val > 1) ? val : null;
            } else {
                otherGroupInputWrapper.classList.remove('show');
                customGroupInput.value = '';
                selectedGroupCount = parseInt(radio.value, 10);
            }
            checkFormValidation();
        });
    });

    // Custom group count numeric input
    customGroupInput.addEventListener('input', () => {
        const val = parseInt(customGroupInput.value, 10);
        selectedGroupCount = (val > 1) ? val : null;
        checkFormValidation();
    });

    // --- 5. Proceed Submission Handler ---
    proceedButton.addEventListener('click', async () => {
        const teamInputs = teamInputsContainer.querySelectorAll('input.team-input');
        const teams = [...teamInputs].map(input => input.value.trim());

        if (teams.some(name => name === '')) {
            alert('⚠ Please fill in all team names');
            return;
        }

        if (!selectedFormat) {
            alert('⚠ Please select a tournament format');
            return;
        }

        let groupsPayload = null;
        if (selectedFormat === 'groups') {
            if (selectedGroupCount === null || isNaN(selectedGroupCount) || selectedGroupCount <= 1) {
                alert('⚠ Please configure a valid number of groups');
                return;
            }
            if (teamCount % selectedGroupCount !== 0) {
                alert(`⚠ Teams must divide evenly into groups`);
                return;
            }
            groupsPayload = selectedGroupCount;
        }

        try {
            const res = await AppLoading.fetch(`/tournament/${encodeURIComponent(tournamentId)}/setup`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    format: selectedFormat,
                    teamNames: teams,
                    groups: groupsPayload
                })
            }, {
                title: 'Saving setup...',
                message: 'Please wait while the tournament setup is saved.'
            });

            const data = await AppLoading.readJson(res);
            if (data.success) {
                window.location.href = `/nrrtable.html?id=${encodeURIComponent(tournamentId)}`;
            } else {
                alert('Failed to save tournament setup: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Setup submission error:', err);
            alert('Server error while saving tournament setup.');
        }
    });
});
