import http from 'node:http';

const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error('Usage: node scripts/smoke-production.mjs <target_url>');
  console.error('Example: node scripts/smoke-production.mjs http://localhost:3000');
  process.exit(1);
}

const parsedUrl = new URL(targetUrl);

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runSmokeTests() {
  console.log(`Starting smoke tests against ${targetUrl}...`);

  try {
    // 1. Health check
    console.log('Testing /health endpoint...');
    const health = await request('/health');
    if (health.status !== 200) {
      throw new Error(`/health returned status ${health.status}`);
    }
    const healthJson = JSON.parse(health.body);
    if (healthJson.status !== 'ok') {
      throw new Error(`/health body status is not "ok": ${health.body}`);
    }
    console.log('✓ /health is healthy');

    // 2. Participant page loading
    console.log('Testing / page loading...');
    const index = await request('/');
    if (index.status !== 200) {
      throw new Error(`/ page returned status ${index.status}`);
    }
    if (!index.body.includes('<!DOCTYPE html>')) {
      throw new Error('/ page did not return HTML');
    }
    console.log('✓ / serves SPA HTML');

    // 3. Presenter route fallback
    console.log('Testing /presenter route fallback...');
    const presenter = await request('/presenter');
    if (presenter.status !== 200) {
      throw new Error(`/presenter route returned status ${presenter.status}`);
    }
    if (!presenter.body.includes('<!DOCTYPE html>')) {
      throw new Error('/presenter did not fallback to SPA HTML');
    }
    console.log('✓ /presenter serves SPA HTML fallback');

    // 4. API 404
    console.log('Testing unknown API 404...');
    const apiUnknown = await request('/api/unknown', {
      headers: { Origin: targetUrl },
    });
    if (apiUnknown.status !== 404) {
      throw new Error(`/api/unknown returned status ${apiUnknown.status} instead of 404`);
    }
    console.log('✓ Unknown API endpoints return 404');

    // 5. Origin guard
    console.log('Testing API Origin guard...');
    const apiGuard = await request('/api/submissions', { method: 'POST' });
    if (apiGuard.status !== 403) {
      throw new Error(`API submissions without Origin allowed with status ${apiGuard.status} instead of 403`);
    }
    console.log('✓ Origin guard correctly rejects missing Origin headers');

    console.log('\nAll production smoke tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Smoke tests failed:', error.message);
    process.exit(1);
  }
}

runSmokeTests();
