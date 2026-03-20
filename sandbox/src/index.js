const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());

app.post('/execute', (req, res) => {
  const { code, timeout = 10 } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }

  const filename = path.join('/tmp', `exec_${crypto.randomUUID()}.js`);

  try {
    fs.writeFileSync(filename, code, 'utf8');

    const stdout = execSync(`node "${filename}"`, {
      timeout: timeout * 1000,
      maxBuffer: 1024 * 512,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();

    res.json({ stdout, stderr: '', exitCode: 0 });

  } catch (err) {
    res.json({
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : err.message,
      exitCode: err.status || 1,
    });
  } finally {
    try { fs.unlinkSync(filename); } catch {}
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sandbox running on port ${PORT}`));
