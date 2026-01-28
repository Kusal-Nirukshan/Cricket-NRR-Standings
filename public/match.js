document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const tournamentId = params.get('id');
  const group = params.get('group');
  const a = params.get('a');
  const b = params.get('b');
  const m = params.get('m');
  const oversParam = params.get('overs');
  const overs = oversParam ? Number(oversParam) : 50;

  const card = document.getElementById('matchCard');
  if (!a || !b) {
    card.textContent = 'Invalid match parameters.';
    return;
  }

  card.innerHTML = `
    <h2 class="match-title">${a} vs ${b}</h2>
    <p><strong>Match #</strong> ${m || '-'}</p>
    <p><strong>Group:</strong> ${group || 'N/A'}</p>
    <p><strong>Tournament ID:</strong> ${tournamentId || '-'}</p>
    <hr />
    <div class="results">
      <input type="number" id="teamAScore" placeholder="${a} Score" min="0" />
      <input type="text" inputmode="decimal" class="overs-input" id="teamAOvers"  placeholder="${a} Overs Faced (e.g. 49.3)" />
      <input type="number" id="teamAWickets" placeholder="${a} Wickets Lost" min="0" max="10" />
    </div>
    <div class="results">
      <input type="number" id="teamBScore" placeholder="${b} Score" min="0" />
      <input type="text" inputmode="decimal" class="overs-input" id="teamBOvers" placeholder="${b} Overs Faced (e.g. 50.0)" />
      <input type="number" id="teamBWickets" placeholder="${b} Wickets Lost" min="0" max="10" />
    </div>

    <div class="radio-group">
      <label class="radio-card">
        <input type="radio" name="resultType" value="A" checked>
        <div class="card-content">
          <h3>${a} Won</h3>
          <p>Full result</p>
        </div>
      </label>

      <label class="radio-card">
        <input type="radio" name="resultType" value="B">
        <div class="card-content">
          <h3>${b} Won</h3>
          <p>Full result</p>
        </div>
      </label>

      <label class="radio-card">
        <input type="radio" name="resultType" value="tie">
        <div class="card-content">
          <h3>Match Tied</h3>
          <p>Both teams equal</p>
        </div>
      </label>

      <label class="radio-card">
        <input type="radio" name="resultType" value="abandoned">
        <div class="card-content">
          <h3>Abandoned</h3>
          <p>Match abandoned</p>
        </div>
      </label>

      <label class="radio-card">
        <input type="radio" name="resultType" value="noresult">
        <div class="card-content">
          <h3>No Result</h3>
          <p>Weather/other</p>
        </div>
      </label>
    </div>
    <button id="saveResultBtn" class="btn">Save Result</button>
  `;

  // validation helpers for overs inputs
  function sanitizeOversInput(value) {
    if (!value) return '';
    // remove any non-digit/dot
    value = value.replace(/[^0-9.]/g, '');
    // allow only one dot: merge extra pieces into decimal part if present
    const pieces = value.split('.');
    let intPart = pieces[0] || '';
    let decRaw = pieces.slice(1).join('');

    // preserve a trailing dot while the user types (e.g. "49.")
    if (value.endsWith('.') && decRaw === '') {
      // normalize int part (allow leading dot -> 0.)
      if (intPart === '') intPart = '0';
      return intPart + '.';
    }

    // take only first decimal digit (balls)
    const decPart = decRaw ? decRaw.slice(0, 1) : '';
    // clamp decimal (balls) to 0-5
    if (decPart) {
      const d = Number(decPart);
      const safe = Number.isFinite(d) ? Math.min(d, 5) : 0;
      if (intPart === '') intPart = '0';
      return intPart + '.' + String(safe);
    }

    // no decimal part
    if (intPart === '') return '';
    return intPart;
  }

  function attachOversValidation(selector) {
    const inputs = card.querySelectorAll(selector);
    inputs.forEach(input => {
      // prevent mouse wheel and arrow key changes
      input.addEventListener('wheel', e => e.preventDefault(), { passive: false });
      input.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); });

      input.addEventListener('input', e => {
        const sanitized = sanitizeOversInput(e.target.value);
        // enforce maximum whole overs: if integer part > overs, clamp
        const [whole, ball] = sanitized.split('.');
        let wholeNum = Number(whole || 0);
        if (Number.isFinite(wholeNum) && wholeNum > overs) {
          e.target.value = String(overs);
          return;
        }
        // if equal to max overs, disallow decimal part
        if (Number(wholeNum) === overs && ball) {
          e.target.value = String(overs);
          return;
        }
        e.target.value = sanitized;
      });
    });
  }

  // attach validation to both overs inputs
  attachOversValidation('.overs-input');

  // clamp numeric inputs (wickets) to min/max and prevent wheel/arrow changes
  function attachNumericClamp(selector, min, max) {
    const inputs = card.querySelectorAll(selector);
    inputs.forEach(input => {
      input.setAttribute('min', String(min));
      input.setAttribute('max', String(max));
      // prevent mouse wheel and arrow key changes
      input.addEventListener('wheel', e => e.preventDefault(), { passive: false });
      input.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); });

      input.addEventListener('input', e => {
        // allow empty
        if (e.target.value === '') return;
        let v = parseInt(e.target.value, 10);
        if (Number.isNaN(v)) { e.target.value = ''; return; }
        if (v < min) v = min;
        if (v > max) v = max;
        e.target.value = String(v);
      });
    });
  }

  attachNumericClamp('#teamAWickets, #teamBWickets', 0, 10);

  function pointsdistributionExample() {
      return 'e.g., Win: 2 pts, Tie/No Result: 1 pt, Loss: 0 pts';
  };

  // Save button handler — collect fields and result type
  document.getElementById('saveResultBtn').addEventListener('click', () => {
    const resultType = card.querySelector('input[name="resultType"]:checked')?.value || 'A';
    const teamAScore = Number(card.querySelector('#teamAScore').value) || 0;
    const teamBScore = Number(card.querySelector('#teamBScore').value) || 0;
    const teamAOvers = card.querySelector('#teamAOvers').value;
    const teamBOvers = card.querySelector('#teamBOvers').value;
    const teamAWickets = Number(card.querySelector('#teamAWickets').value) || 0;
    const teamBWickets = Number(card.querySelector('#teamBWickets').value) || 0;

    if (resultType === 'A' || resultType === 'B') {
      if (teamAScore === 0 && teamBScore === 0) { alert('Enter team scores for a completed match'); return; }
    }

    const payload = { tournamentId, group, a, b, m, resultType, teamAScore, teamBScore, teamAOvers, teamBOvers, teamAWickets, teamBWickets };
    console.log('Saving match result', payload);
    (async () => {
      try {
        const res = await fetch(`/tournament/${encodeURIComponent(tournamentId)}/match-result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.status === 409) {
          alert('This match result has already been recorded.');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        alert('Result saved. Returning to matches.');
        // navigate back to matches page
        window.location.href = `/nrrtable.html?id=${encodeURIComponent(tournamentId)}`;
      } catch (err) {
        console.error(err);
        alert('Failed to save result. See console.');
      }
    })();
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    // go back to matches for this tournament
    if (tournamentId) window.location.href = `/nrrtable.html?id=${encodeURIComponent(tournamentId)}`;
    else window.history.back();
  });
});
