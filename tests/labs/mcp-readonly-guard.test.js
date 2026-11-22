/**
 * Tests for labs/engineering-plugin-readonly/hooks/mcp-readonly-guard.js
 *
 * Runs the lab's offline self-test (real hook process, synthetic events) and
 * unit-checks the name parsing helpers.
 *
 * Run with: node tests/labs/mcp-readonly-guard.test.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const LAB_DIR = path.join(__dirname, '..', '..', 'labs', 'engineering-plugin-readonly');
const { parseMcpName, tokenize } = require(path.join(LAB_DIR, 'hooks', 'mcp-readonly-guard.js'));

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing mcp-readonly-guard (lab) ===\n');
  let passed = 0;
  let failed = 0;

  const cases = [
    ['parseMcpName splits server and tool', () => {
      assert.deepStrictEqual(parseMcpName('mcp__grafana__search_dashboards'), { server: 'grafana', tool: 'search_dashboards' });
    }],
    ['parseMcpName handles plugin-scoped server', () => {
      assert.deepStrictEqual(parseMcpName('mcp__plugin_engineering_slack__read'), { server: 'plugin_engineering_slack', tool: 'read' });
    }],
    ['tokenize splits snake, kebab and camel case', () => {
      assert.deepStrictEqual(tokenize('jira_getIssue-v2'), ['jira', 'get', 'issue', 'v2']);
    }],
    ['lab self-test passes all cases', () => {
      const run = spawnSync('node', [path.join(LAB_DIR, 'scripts', 'verify-guard.js')], { encoding: 'utf8', timeout: 60000 });
      assert.strictEqual(run.status, 0, run.stdout + run.stderr);
    }],
  ];

  for (const [name, fn] of cases) {
    if (test(name, fn)) passed++;
    else failed++;
  }

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
