const els = {
  artifacts: document.getElementById('artifacts'),
  masterInstanceId: document.getElementById('masterInstanceId'),
  masterPassword: document.getElementById('masterPassword'),
  masterCreateRoom: document.getElementById('masterCreateRoom'),
  masterRoomCode: document.getElementById('masterRoomCode'),
  masterStatus: document.getElementById('masterStatus'),

  relayInstanceId: document.getElementById('relayInstanceId'),
  relayRoomCode: document.getElementById('relayRoomCode'),
  relayPassword: document.getElementById('relayPassword'),
  relayLeaveRoom: document.getElementById('relayLeaveRoom'),
  relayUpdates: document.getElementById('relayUpdates'),
  relayCorruptToken: document.getElementById('relayCorruptToken'),
  relayStatus: document.getElementById('relayStatus'),

  attachDialog: document.getElementById('attachDialog'),
  dialogRoomCode: document.getElementById('dialogRoomCode'),
  dialogPassword: document.getElementById('dialogPassword'),
  dialogAttach: document.getElementById('dialogAttach'),
  dialogCancel: document.getElementById('dialogCancel'),
  dialogStatus: document.getElementById('dialogStatus')
};

function randomId(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}

const state = {
  master: {
    role: 'master',
    token: '',
    inRoom: false,
    roomCode: '',
    password: '0000',
    instanceId: randomId('MASTER')
  },
  relay: {
    role: 'relay',
    token: '',
    inRoom: false,
    roomCode: '',
    password: '0000',
    instanceId: randomId('RELAY')
  }
};

function setStatus(el, text, level = '') {
  el.textContent = text;
  el.className = `status ${level}`.trim();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}

async function ensureGuestSession(instance) {
  if (instance.token) {
    return instance.token;
  }
  const result = await apiPost('/api/vst/guest-continue', { role: instance.role });
  if (!result.ok || !result.data.token) {
    throw new Error(result.data.error || 'Unable to obtain session token');
  }
  instance.token = result.data.token;
  return instance.token;
}

function syncInputs() {
  els.masterInstanceId.value = state.master.instanceId;
  els.masterRoomCode.value = state.master.roomCode;

  els.relayInstanceId.value = state.relay.instanceId;
  els.relayRoomCode.value = state.relay.roomCode;
  els.relayPassword.value = state.relay.password;

  els.dialogRoomCode.value = state.relay.roomCode;
  els.dialogPassword.value = state.relay.password;
}

function showAttachDialog() {
  els.dialogRoomCode.value = state.relay.roomCode;
  els.dialogPassword.value = state.relay.password;
  setStatus(els.dialogStatus, 'Enter room and attach relay.', 'warn');
  els.attachDialog.classList.add('open');
  els.attachDialog.setAttribute('aria-hidden', 'false');
}

function hideAttachDialog() {
  els.attachDialog.classList.remove('open');
  els.attachDialog.setAttribute('aria-hidden', 'true');
}

async function loadArtifacts() {
  const res = await fetch('/api/plugins');
  const data = await res.json();
  els.artifacts.innerHTML = '';

  for (const artifact of data.artifacts || []) {
    const block = document.createElement('div');
    block.className = 'artifact';
    const badgeClass = artifact.exists ? 'ok' : 'err';
    const badgeText = artifact.exists ? 'built' : 'missing';
    block.innerHTML = `<strong>${artifact.label}</strong><span class="badge ${badgeClass}">${badgeText}</span><div>${artifact.path}</div>`;
    els.artifacts.appendChild(block);
  }
}

async function createMasterRoom() {
  try {
    state.master.instanceId = els.masterInstanceId.value.trim() || randomId('MASTER');
    state.master.password = els.masterPassword.value;

    await ensureGuestSession(state.master);

    const result = await apiPost('/api/vst/create-room', {
      token: state.master.token,
      role: 'master',
      instanceId: state.master.instanceId,
      password: state.master.password
    });

    if (!result.ok || !result.data.code) {
      throw new Error(result.data.error || 'Failed to create room');
    }

    const activated = await apiPost('/api/vst/master-activate', {
      roomId: result.data.roomId,
      roomCode: result.data.code,
      instanceId: state.master.instanceId
    });

    if (!activated.ok || !activated.data.ok || !activated.data.token) {
      throw new Error(activated.data.error || activated.data.message || 'Master activation failed');
    }

    state.master.token = activated.data.token;
    state.master.inRoom = true;
    state.master.roomCode = activated.data.roomCode || result.data.code;

    const seed = await apiPost('/api/vst/master-seed-track', {
      token: state.master.token,
      roomCode: state.master.roomCode,
      instanceId: state.master.instanceId
    });

    if (!seed.ok || !seed.data.ok) {
      throw new Error(seed.data.error || seed.data.message || 'Master seed track push failed');
    }

    state.relay.roomCode = state.master.roomCode;
    state.relay.password = state.master.password;

    syncInputs();
    setStatus(els.masterStatus, `Room created: ${state.master.roomCode}`, 'ok');
    setStatus(els.relayStatus, 'Relay ready. Press Updates to attach.', 'warn');
  } catch (err) {
    setStatus(els.masterStatus, err.message || String(err), 'err');
  }
}

function relayLeaveRoom() {
  state.relay.inRoom = false;
  setStatus(els.relayStatus, 'Relay left room. Press Updates to re-attach.', 'warn');
}

function relayPressUpdates() {
  if (!state.relay.inRoom) {
    showAttachDialog();
    return;
  }

  setStatus(els.relayStatus, `Relay is in room ${state.relay.roomCode}`, 'ok');
}

async function attachRelayFromDialog() {
  state.relay.instanceId = els.relayInstanceId.value.trim() || randomId('RELAY');
  state.relay.roomCode = els.dialogRoomCode.value.trim().toUpperCase();
  state.relay.password = els.dialogPassword.value;

  if (!state.relay.roomCode) {
    setStatus(els.dialogStatus, 'Room code is required.', 'err');
    return;
  }

  try {
    await ensureGuestSession(state.relay);

    const result = await apiPost('/api/vst/attach', {
      token: state.relay.token,
      role: 'relay',
      instanceId: state.relay.instanceId,
      roomCode: state.relay.roomCode,
      password: state.relay.password
    });

    if (result.data.refreshedToken) {
      state.relay.token = result.data.refreshedToken;
    }

    if (!result.ok || !result.data.ok) {
      const message = result.data.message || result.data.error || 'Attach failed';
      setStatus(els.dialogStatus, message, 'err');
      setStatus(els.relayStatus, `Locked: ${message}`, 'err');
      return;
    }

    state.relay.inRoom = true;
    hideAttachDialog();
    syncInputs();

    const refreshed = result.data.tokenRefreshed ? ' (token refreshed)' : '';
    setStatus(els.relayStatus, `Attached to ${state.relay.roomCode}${refreshed}`, 'ok');
  } catch (err) {
    setStatus(els.dialogStatus, err.message || String(err), 'err');
  }
}

function cancelAttachDialog() {
  hideAttachDialog();
  setStatus(els.relayStatus, 'Attach canceled. Relay remains on home controls.', 'warn');
}

function corruptRelayToken() {
  state.relay.token = 'invalid-session-token';
  setStatus(els.relayStatus, 'Relay token intentionally corrupted for retry test.', 'warn');
}

els.masterCreateRoom.addEventListener('click', createMasterRoom);
els.relayLeaveRoom.addEventListener('click', relayLeaveRoom);
els.relayUpdates.addEventListener('click', relayPressUpdates);
els.dialogAttach.addEventListener('click', attachRelayFromDialog);
els.dialogCancel.addEventListener('click', cancelAttachDialog);
els.relayCorruptToken.addEventListener('click', corruptRelayToken);

window.__sim = {
  getState: () => structuredClone(state),
  corruptRelayToken
};

syncInputs();
loadArtifacts();
