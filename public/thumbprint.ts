function getBrowserFingerprintData() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    screenResolution: `${screen.width}x${screen.height}`,
    timezoneOffset: new Date().getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionStorage: !!window.sessionStorage,
    localStorage: !!window.localStorage,
    indexedDB: !!window.indexedDB,    
    platform: navigator.platform,
    doNotTrack: navigator.doNotTrack,
    touchPoints: navigator.maxTouchPoints || 0,
    plugins: Array.from(navigator.plugins).map(p => `${p.name}::${p.description}`),
    canvasFingerprint: getCanvasFingerprint(),
  };
}


function getCanvasFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx:CanvasRenderingContext2D|null = canvas.getContext('2d');
  if (!ctx) {
    return 'no-canvas';
  }
  ctx.textBaseline = 'top';
  ctx.font = '16px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = '#069';
  ctx.fillText('BrowserFingerprint', 10, 10);
  return canvas.toDataURL();
}


async function hashFingerprint(data :any) {
  const str = JSON.stringify(data);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}


export async function generateFingerprint() {
  const data = getBrowserFingerprintData();
  const fingerprint = await hashFingerprint(data);
  console.log('Browser fingerprint:', fingerprint);
  return fingerprint;
}


