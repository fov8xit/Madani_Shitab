/* =========================================================================
   QR Code + Scanner
   ========================================================================= */
function drawQRCode(text, canvas) {
  if (!canvas) return;
  if (typeof QRCode !== 'undefined') {
    try {
      QRCode.toCanvas(canvas, text, { width: 240, margin: 1 }, err => {
        if (err) { console.warn('QR error', err); drawQRFallback(text, canvas); }
      });
      return;
    } catch (e) { drawQRFallback(text, canvas); }
  } else {
    drawQRFallback(text, canvas);
  }
}

function drawQRFallback(text, canvas) {
  const ctx = canvas.getContext('2d');
  const size = 240;
  canvas.width = size; canvas.height = size;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  const cells = 25;
  const cellSize = size / cells;
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  const rand = i => { hash = ((hash << 5) + hash + i) >>> 0; return (hash & 0xFFFF) / 0xFFFF; };
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const isFinder = (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
      if (isFinder) {
        const fx = x >= cells - 7 ? x - (cells - 7) : x;
        const fy = y >= cells - 7 ? y - (cells - 7) : y;
        const ring = Math.min(fx, fy, 6 - fx, 6 - fy);
        if (ring === 0 || ring === 2 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      } else if (rand(x * 1000 + y) > 0.5) {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}

function handleScannedQR(data) {
  const res = document.getElementById('scanResult');
  try {
    const parts = data.split('|');
    if (parts[0] !== 'PARTO' || parts.length < 3) {
      if (res) { res.style.display = 'block'; res.innerHTML = `<span style="color:var(--bad)">${t('scanFailed')}</span>`; }
      return;
    }
    const sid = parts[1];
    const student = db.students.find(x => x.id === sid);
    if (!student) {
      if (res) { res.style.display = 'block'; res.innerHTML = `<span style="color:var(--bad)">${t('scanFailed')}</span>`; }
      return;
    }

    if (!db.att) db.att = {};
    if (!db.att[ad]) db.att[ad] = {};
    if (!db.att[ad][attBell]) db.att[ad][attBell] = {};

    const prev = db.att[ad][attBell][sid] || {};
    const status = prev.status === 'a' ? 'p' : (prev.status || 'p');
    db.att[ad][attBell][sid] = { status, delay: prev.delay || 0 };
    save();

    if (res) {
      res.style.display = 'block';
      res.innerHTML = `<span style="color:var(--ok)">✓ ${t('scanSuccess')}: <b>${esc(student.name)}</b> — ${ST[status].label[LANG]}</span>`;
    }

    if (navigator.vibrate) navigator.vibrate(200);
    toast(t('scanSuccess') + ': ' + student.name, 'ok');

    if (scannerStream) {
      setTimeout(() => {
        if (scannerStream) { scannerStream.getTracks().forEach(tk => tk.stop()); scannerStream = null }
      }, 1500);
    }

    setTimeout(() => { render() }, 1000);
  } catch (err) {
    console.error(err);
    if (res) { res.style.display = 'block'; res.innerHTML = `<span style="color:var(--bad)">${t('scanFailed')}</span>`; }
  }
}