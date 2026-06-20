document.addEventListener("DOMContentLoaded", () => {
  const proceedBtn = document.getElementById("proceedButton");
  const teamInputsContainer = document.getElementById("teamInputsContainer");

  function allTeamNamesFilled() {
    const inputs = teamInputsContainer.querySelectorAll("input");
    return [...inputs].every(input => input.value.trim() !== "");
  }

  function isFormatSelected() {
    return document.querySelector('input[name="format"]:checked');
  }

  function isGroupSelectionValid() {
    const groupRadio = document.querySelector('input[name="groupCount"]:checked');
    if (!groupRadio) return false;

    if (groupRadio.value === "other") {
      const otherInput = document.getElementById("customGroupCount");
      return otherInput && Number(otherInput.value) > 1;
    }

    return true;
  }

    function checkFormCompletion() {
      const formatRadio = document.querySelector('input[name="format"]:checked');
      const allTeamsFilled = allTeamNamesFilled();
      let valid = false;

      if (!formatRadio) {
        proceedBtn.disabled = true;
        return;
      }

      if (formatRadio.value === "roundrobin") {
        valid = allTeamsFilled;
      } else if (formatRadio.value === "groups") {
        valid = allTeamsFilled && isGroupSelectionValid();
      }

      proceedBtn.disabled = !valid;
  }

  document.addEventListener("input", checkFormCompletion);
  document.addEventListener("change", checkFormCompletion);
});
