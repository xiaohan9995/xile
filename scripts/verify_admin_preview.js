const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adminRoot = path.join(root, 'admin-src');
const port = Number(process.env.XILE_ADMIN_PREVIEW_PORT || 4177);
const baseUrl = `http://127.0.0.1:${port}`;

function run(command, args, cwd) {
  console.log(`running: ${args[args.length - 1] || command}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
  }
}

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error(`timeout requesting ${url}`));
    });
  });
}

async function waitForPreview(process) {
  let lastError;
  for (let index = 0; index < 40; index += 1) {
    if (process.exitCode !== null) {
      throw new Error(`vite preview exited early with ${process.exitCode}`);
    }
    try {
      const response = await get(`${baseUrl}/admin/`);
      if (response.status === 200 && response.body.includes('<div id="app"></div>')) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`vite preview did not become ready: ${lastError && lastError.message}`);
}

async function main() {
  run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd run build'], adminRoot);

  console.log(`starting vite preview on ${baseUrl}`);
  const preview = spawn(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', `npm.cmd run preview -- --host 127.0.0.1 --port ${port}`],
    { cwd: adminRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let output = '';
  preview.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  preview.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForPreview(preview);
    for (const route of ['/admin/', '/admin/dashboard', '/admin/teachers', '/admin/reviews', '/admin/studios']) {
      const response = await get(`${baseUrl}${route}`);
      if (response.status !== 200) {
        throw new Error(`${route} returned ${response.status}`);
      }
      if (!response.body.includes('<div id="app"></div>')) {
        throw new Error(`${route} did not return app shell`);
      }
    }

    const indexResponse = await get(`${baseUrl}/admin/`);
    const scriptMatch = indexResponse.body.match(/<script[^>]+src="([^"]+)"/);
    const cssMatch = indexResponse.body.match(/<link[^>]+href="([^"]+\.css)"/);
    if (!scriptMatch || !cssMatch) {
      throw new Error('preview index is missing JS or CSS asset references');
    }

    const [scriptResponse, cssResponse] = await Promise.all([
      get(`${baseUrl}${scriptMatch[1]}`),
      get(`${baseUrl}${cssMatch[1]}`),
    ]);
    if (scriptResponse.status !== 200 || cssResponse.status !== 200) {
      throw new Error('preview static assets are not reachable');
    }
  } finally {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      preview.kill('SIGTERM');
    }
  }

  console.log('admin preview smoke verification passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
