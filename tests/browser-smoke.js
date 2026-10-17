const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EXTENSION_DIR = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures');

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(FIXTURES_DIR, req.url.split('?')[0]);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mime = ext === '.html' ? 'text/html' : 'text/plain';
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function waitForHttp(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_e) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function sendCdpCommand(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', onMessage);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      } catch (e) {
        reject(e);
      }
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

test('Real Chromium Smoke Tests with SmoothBoost Extension Loaded', { timeout: 30000 }, async (t) => {
  if (!fs.existsSync(CHROME_PATH)) {
    t.skip('Google Chrome binary not found on this system');
    return;
  }

  const { server, port } = await startStaticServer();
  const cdpPort = 9333 + Math.floor(Math.random() * 500);
  const tempProfile = path.join('/tmp', `sb-chrome-${Date.now()}`);

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--disable-extensions-except=${EXTENSION_DIR}`,
    `--load-extension=${EXTENSION_DIR}`,
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    try {
      await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`, 3000);
    } catch (_e) {
      chromeProc.kill('SIGTERM');
      server.close();
      try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch (_err) {}
      t.skip('Chromium headless cannot start in this environment (sandboxed Mach port IPC)');
      return;
    }

    // Give service worker time to register content scripts
    await new Promise((r) => setTimeout(r, 1500));

    // Helper to test a fixture page
    async function testFixture(fixtureName, evaluateExpression) {
      const targetUrl = `http://127.0.0.1:${port}/${fixtureName}`;
      const newTabRes = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${targetUrl}`, { method: 'PUT' });
      const target = await newTabRes.json();
      assert.ok(target.webSocketDebuggerUrl, 'target has webSocketDebuggerUrl');

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve);
        ws.addEventListener('error', reject);
      });

      await sendCdpCommand(ws, 'Page.enable');
      await sendCdpCommand(ws, 'Runtime.enable');

      // Wait a moment for page scripts and SmoothBoost content scripts to initialize
      await new Promise((r) => setTimeout(r, 600));

      const evalResult = await sendCdpCommand(ws, 'Runtime.evaluate', {
        expression: evaluateExpression,
        returnByValue: true,
        awaitPromise: true
      });

      ws.close();
      return evalResult.result?.value;
    }

    // 1. Map Zoom preventDefault Smoke Test
    const mapResult = await testFixture('map-fixture.html', 'window.testMapZoom()');
    assert.equal(mapResult?.preventDefaultSucceeded, true, 'Map container wheel event was able to call preventDefault()');

    // 2. Detached Buffer Canvas Smoke Test
    const canvasResult = await testFixture('canvas-fixture.html', 'window.testDetachedBuffer()');
    assert.equal(canvasResult?.pass, true, 'Detached buffer canvas executed draw calls without skipping');

    // 3. CSSOM Font-Display Swap Smoke Test
    const fontResult = await testFixture('font-fixture.html', 'window.testFontDescriptor()');
    console.log('DEBUG fontResult:', fontResult);
    assert.equal(fontResult?.pass, true, 'CSSOM font descriptor was patched to swap');

  } finally {
    chromeProc.kill('SIGTERM');
    server.close();
    try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch (_e) {}
  }
});
