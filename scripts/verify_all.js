const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const shell = isWin ? { command: process.env.ComSpec || 'cmd.exe', wrap: (cmd) => ['/d', '/s', '/c', cmd] } : null;

const steps = [
  {
    name: 'project static verification',
    command: 'node',
    args: ['scripts/verify_project_static.js'],
    cwd: root,
  },
  {
    name: 'miniprogram static verification',
    command: 'node',
    args: ['scripts/verify_miniprogram_static.js'],
    cwd: root,
  },
  {
    name: 'prototype contract verification',
    command: 'node',
    args: ['scripts/verify_prototype_contract.js'],
    cwd: root,
  },
  {
    name: 'miniprogram runtime smoke verification',
    command: 'node',
    args: ['scripts/verify_miniprogram_runtime.js'],
    cwd: root,
  },
  {
    name: 'backend API contract tests',
    command: 'python',
    args: ['-m', 'pytest', 'backend/tests/test_api_contract.py', '-q'],
    cwd: root,
  },
  {
    name: 'backend HTTP smoke verification',
    command: 'python',
    args: ['scripts/verify_backend_http.py'],
    cwd: root,
  },
  {
    name: 'admin tests and static contract',
    command: npm,
    args: ['test'],
    cwd: path.join(root, 'admin-src'),
  },
  {
    name: 'admin production build',
    command: npm,
    args: ['run', 'build'],
    cwd: path.join(root, 'admin-src'),
  },
  {
    name: 'admin preview smoke verification',
    command: 'node',
    args: ['scripts/verify_admin_preview.js'],
    cwd: root,
  },
];

for (const step of steps) {
  console.log(`\n==> ${step.name}`);
  const result = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`\nfailed to run ${step.name}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n${step.name} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

console.log('\nall verification commands passed');
