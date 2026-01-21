document.addEventListener('DOMContentLoaded', () => {
    // --- Get number of teams from URL ---
    const params = new URLSearchParams(window.location.search);
    const teamCount = parseInt(params.get('teams'), 10);
    if (!teamCount || teamCount < 2) return;

    // --- UI Elements ---
    const groupOptions = document.getElementById('groupOptions');
    const formatRadios = document.querySelectorAll('input[name="format"]');
    const groupRadios = document.querySelectorAll('input[name="groupCount"]');
    const otherInputWrapper = document.getElementById('otherInput');
    const customGroupInput = document.getElementById('customGroupCount');
    const proceedButton = document.getElementById('proceedButton');
    const errorBox = document.getElementById('errorMessage');

    let selectedGroups = null;

    // --- Initial State (IMPORTANT) ---
    errorBox.style.display = 'none';
    proceedButton.disabled = true;

    // --- Validation Function ---
    function validateGroups() {

        // No interaction yet → show nothing
        if (selectedGroups === null || isNaN(selectedGroups)) {
            errorBox.style.display = 'none';
            proceedButton.disabled = true;
            return;
        }

        errorBox.style.display = 'block';

        if (selectedGroups <= 1) {
            errorBox.textContent = "⚠ Number of groups must be greater than 1";
            errorBox.className = 'error-message';
            proceedButton.disabled = true;
            return;
        }

        if (teamCount % selectedGroups !== 0) {
            errorBox.textContent = `❌ Cannot divide ${teamCount} teams evenly into ${selectedGroups} groups.`;
            errorBox.className = 'error-message';
            proceedButton.disabled = true;
            return;
        }

        const teamsPerGroup = teamCount / selectedGroups;
        errorBox.textContent = `✅ Each group will have ${teamsPerGroup} teams.`;
        errorBox.className = 'success-message';
        proceedButton.disabled = false;
    }

    // --- Format Selection ---
    formatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'groups') {
                groupOptions.classList.add('show');
            } else {
                groupOptions.classList.remove('show');
                otherInputWrapper.classList.remove('show');
                selectedGroups = null;
                validateGroups();
            }
        });
    });

    // --- Group Radio Buttons ---
    groupRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'other') {
                otherInputWrapper.classList.add('show');
                selectedGroups = null;
            } else {
                otherInputWrapper.classList.remove('show');
                customGroupInput.value = '';
                selectedGroups = Number(radio.value);
            }
            validateGroups();
        });
    });

    // --- Custom Group Input ---
    customGroupInput.addEventListener('input', () => {
        selectedGroups = Number(customGroupInput.value);
        validateGroups();
    });
});
