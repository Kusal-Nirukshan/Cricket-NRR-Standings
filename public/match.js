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
  let matchData = null;
  let batFirstTeam = a;

  if (!a || !b) {
    card.textContent = 'Invalid match parameters.';
    return;
  }

  function getTeamOrder() {
    const topTeam = batFirstTeam === b ? b : a;
    const bottomTeam = topTeam === a ? b : a;
    return { topTeam, bottomTeam };
  }

  function getValuesByTeam(data) {
    if (!data) return {};
    return {
      [a]: {
        score: data.teamAScore ?? '',
        overs: data.teamAOvers ?? '',
        wickets: data.teamAWickets ?? ''
      },
      [b]: {
        score: data.teamBScore ?? '',
        overs: data.teamBOvers ?? '',
        wickets: data.teamBWickets ?? ''
      }
    };
  }

  function readCurrentValuesByTeam() {
    const { topTeam, bottomTeam } = getTeamOrder();
    return {
      [topTeam]: {
        score: card.querySelector('#topTeamScore')?.value ?? '',
        overs: card.querySelector('#topTeamOvers')?.value ?? '',
        wickets: card.querySelector('#topTeamWickets')?.value ?? ''
      },
      [bottomTeam]: {
        score: card.querySelector('#bottomTeamScore')?.value ?? '',
        overs: card.querySelector('#bottomTeamOvers')?.value ?? '',
        wickets: card.querySelector('#bottomTeamWickets')?.value ?? ''
      }
    };
  }

  function renderMatchCard(valuesByTeam = {}, selectedResultType = 'A') {
    const { topTeam, bottomTeam } = getTeamOrder();
    const topValues = valuesByTeam[topTeam] || {};
    const bottomValues = valuesByTeam[bottomTeam] || {};

    card.innerHTML = `
      <h2 class="match-title" id="matchTitle">${topTeam} vs ${bottomTeam}</h2>
      <p><strong>Match #</strong> ${m || '-'}</p>
      <p><strong>Group:</strong> ${group || 'N/A'}</p>
      <p><strong>Tournament ID:</strong> ${tournamentId || '-'}</p>
      <div class="bat-first-control">
        <label for="batFirstSelect"><strong>Bat first:</strong></label>
        <select id="batFirstSelect">
          <option value="${a}">${a}</option>
          <option value="${b}">${b}</option>
        </select>
      </div>
      <hr />
      <div class="team-stack">
        <div class="team-block">
          <h3 id="topTeamLabel">${topTeam}</h3>
          <div class="results">
            <input type="number" id="topTeamScore" placeholder="${topTeam} Score" min="0" />
            <input type="text" inputmode="decimal" class="overs-input" id="topTeamOvers" placeholder="${topTeam} Overs Faced (e.g. 49.3)" />
            <input type="number" id="topTeamWickets" placeholder="${topTeam} Wickets Lost" min="0" max="10" />
          </div>
        </div>
        <div class="team-block">
          <h3 id="bottomTeamLabel">${bottomTeam}</h3>
          <div class="results">
            <input type="number" id="bottomTeamScore" placeholder="${bottomTeam} Score" min="0" />
            <input type="text" inputmode="decimal" class="overs-input" id="bottomTeamOvers" placeholder="${bottomTeam} Overs Faced (e.g. 50.0)" />
            <input type="number" id="bottomTeamWickets" placeholder="${bottomTeam} Wickets Lost" min="0" max="10" />
          </div>
        </div>
      </div>

      <div class="radio-group">
        <label class="radio-card">
          <input type="radio" name="resultType" value="A" ${selectedResultType === 'A' ? 'checked' : ''}>
          <div class="card-content">
            <h3>${a} Won</h3>
            <p>Full result</p>
          </div>
        </label>

        <label class="radio-card">
          <input type="radio" name="resultType" value="B" ${selectedResultType === 'B' ? 'checked' : ''}>
          <div class="card-content">
            <h3>${b} Won</h3>
            <p>Full result</p>
          </div>
        </label>

        <label class="radio-card">
          <input type="radio" name="resultType" value="tie" ${selectedResultType === 'tie' ? 'checked' : ''}>
          <div class="card-content">
            <h3>Match Tied</h3>
            <p>Both teams equal</p>
          </div>
        </label>

        <label class="radio-card">
          <input type="radio" name="resultType" value="abandoned" ${selectedResultType === 'abandoned' ? 'checked' : ''}>
          <div class="card-content">
            <h3>Abandoned</h3>
            <p>Match abandoned</p>
          </div>
        </label>

        <label class="radio-card">
          <input type="radio" name="resultType" value="noresult" ${selectedResultType === 'noresult' ? 'checked' : ''}>
          <div class="card-content">
            <h3>No Result</h3>
            <p>Weather/other</p>
          </div>
        </label>
      </div>
      <button id="saveResultBtn" class="btn">Save Result</button>
    `;

    card.querySelector('#batFirstSelect').value = batFirstTeam;
    card.querySelector('#topTeamScore').value = topValues.score ?? '';
    card.querySelector('#topTeamOvers').value = topValues.overs ?? '';
    card.querySelector('#topTeamWickets').value = topValues.wickets ?? '';
    card.querySelector('#bottomTeamScore').value = bottomValues.score ?? '';
    card.querySelector('#bottomTeamOvers').value = bottomValues.overs ?? '';
    card.querySelector('#bottomTeamWickets').value = bottomValues.wickets ?? '';

    attachOversValidation('.overs-input');
    attachNumericClamp('#topTeamWickets, #bottomTeamWickets', 0, 10);

    card.querySelector('#batFirstSelect').addEventListener('change', (event) => {
      const currentValues = readCurrentValuesByTeam();
      batFirstTeam = event.target.value;
      renderMatchCard(currentValues, card.querySelector('input[name="resultType"]:checked')?.value || 'A');
    });

    card.querySelector('#saveResultBtn').addEventListener('click', () => {
      const resultType = card.querySelector('input[name="resultType"]:checked')?.value || 'A';
      const topTeamValues = {
        score: Number(card.querySelector('#topTeamScore').value) || 0,
        overs: card.querySelector('#topTeamOvers').value,
        wickets: Number(card.querySelector('#topTeamWickets').value) || 0
      };
      const bottomTeamValues = {
        score: Number(card.querySelector('#bottomTeamScore').value) || 0,
        overs: card.querySelector('#bottomTeamOvers').value,
        wickets: Number(card.querySelector('#bottomTeamWickets').value) || 0
      };

      if (resultType === 'A' || resultType === 'B') {
        if (topTeamValues.score === 0 && bottomTeamValues.score === 0) { alert('Enter team scores for a completed match'); return; }
      }

      const { topTeam, bottomTeam } = getTeamOrder();
      const teamAValues = a === topTeam ? topTeamValues : bottomTeamValues;
      const teamBValues = b === topTeam ? topTeamValues : bottomTeamValues;

      const payload = {
        tournamentId,
        group,
        a,
        b,
        m,
        resultType,
        batFirstTeam,
        teamAScore: teamAValues.score,
        teamBScore: teamBValues.score,
        teamAOvers: teamAValues.overs,
        teamBOvers: teamBValues.overs,
        teamAWickets: teamAValues.wickets,
        teamBWickets: teamBValues.wickets
      };
      console.log('Saving match result', payload);
      (async () => {
        try {
          const res = await AppLoading.fetch(`/tournament/${encodeURIComponent(tournamentId)}/match-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }, {
            title: 'Saving result...',
            message: 'Please wait while the NRR table is updated.'
          });
          if (res.status === 409) {
            alert('This match result has already been recorded.');
            return;
          }
          await AppLoading.readJson(res);
          const matchKey = `matchdata_${tournamentId}_${group}_${m}`;
          localStorage.setItem(matchKey, JSON.stringify(payload));
          alert('Result saved. The NRR table will now update.');
          if (window.opener && !window.opener.closed) {
            window.opener.location.reload();
          }
          window.location.href = `/nrrtable.html?id=${encodeURIComponent(tournamentId)}`;
        } catch (err) {
          console.error(err);
          alert('Failed to save result. See console.');
        }
      })();
    });
  }

  // Try to load saved match data from server (persistent) or localStorage (fallback)
  (async () => {
    try {
      if (tournamentId && group && m) {
        const res = await AppLoading.fetch(`/tournament/${encodeURIComponent(tournamentId)}/data`, undefined, {
          title: 'Loading match...',
          message: 'The free server may be waking up. This can take a few seconds.'
        });
        if (res.ok) {
          const data = await AppLoading.readJson(res);
          if (data.matchResults && data.matchResults[group]) {
            matchData = data.matchResults[group].find(r => String(r.m) === String(m) && ((r.a === a && r.b === b) || (r.a === b && r.b === a)));
          }
        }
      }
    } catch (e) { /* ignore */ }

    if (!matchData) {
      const matchKey = `matchdata_${tournamentId}_${group}_${m}`;
      const local = localStorage.getItem(matchKey);
      if (local) {
        try { matchData = JSON.parse(local); } catch {}
      }
    }

    if (matchData?.batFirstTeam === b) {
      batFirstTeam = b;
    } else {
      batFirstTeam = a;
    }

    renderMatchCard(getValuesByTeam(matchData), matchData?.resultType || 'A');
  })();

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

  document.getElementById('backBtn').addEventListener('click', () => {
    // go back to matches for this tournament
    if (tournamentId) window.location.href = `/nrrtable.html?id=${encodeURIComponent(tournamentId)}`;
    else window.history.back();
  });
});
