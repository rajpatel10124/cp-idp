// ==============================================================================
// Unit Test Suite: OPA & Kyverno Policy Guardrails Verification
// Checks policy evaluation logic for positive (allowed) and negative (rejected) cases
// ==============================================================================

const assert = require('assert');
const fs = require('fs');

console.log('=== Running Policy Guardrails Unit Tests ===');

// Mock OPA Evaluator
function evaluatePolicy(input) {
  const errors = [];
  
  if (input.user.role === 'Developer' && input.parameters.environment === 'prod') {
    errors.push('POLICY REJECT: Developers are not authorized to directly scaffold production services.');
  }

  if (!input.parameters.owner || !input.parameters.owner.startsWith('team-')) {
    errors.push("POLICY REJECT: Service owner must belong to an authorized team starting with 'team-'.");
  }

  if (!input.parameters.port || input.parameters.port < 1024 || input.parameters.port > 65535) {
    errors.push('POLICY REJECT: Service port must be a non-privileged port between 1024 and 65535.');
  }

  return {
    allow: errors.length === 0,
    errors
  };
}

// Test Case 1: Positive Test (Valid Developer request for Dev environment)
const test1 = evaluatePolicy({
  user: { role: 'Developer', name: 'john-doe' },
  parameters: { component_id: 'payment-api', owner: 'team-backend', environment: 'dev', port: 8080 }
});
assert.strictEqual(test1.allow, true, 'Test 1 Failed: Valid request should be ALLOWED');
console.log('  [PASS] Test 1: Valid Developer Dev Request -> ALLOWED');

// Test Case 2: Negative Test (Developer attempts Production deployment)
const test2 = evaluatePolicy({
  user: { role: 'Developer', name: 'john-doe' },
  parameters: { component_id: 'payment-api', owner: 'team-backend', environment: 'prod', port: 8080 }
});
assert.strictEqual(test2.allow, false, 'Test 2 Failed: Developer Prod request should be DENIED');
assert.ok(test2.errors[0].includes('not authorized'), 'Test 2 Error message check');
console.log('  [PASS] Test 2: Developer Prod Request -> DENIED (Unauthorized)');

// Test Case 3: Negative Test (Invalid team owner label)
const test3 = evaluatePolicy({
  user: { role: 'Developer', name: 'john-doe' },
  parameters: { component_id: 'rogue-service', owner: 'anonymous-user', environment: 'dev', port: 8080 }
});
assert.strictEqual(test3.allow, false, 'Test 3 Failed: Missing team owner should be DENIED');
console.log('  [PASS] Test 3: Invalid Owner Tag -> DENIED (Policy Violation)');

// Test Case 4: Negative Test (Privileged Port 80 violation)
const test4 = evaluatePolicy({
  user: { role: 'PlatformEngineer', name: 'jane-smith' },
  parameters: { component_id: 'web-service', owner: 'team-platform', environment: 'dev', port: 80 }
});
assert.strictEqual(test4.allow, false, 'Test 4 Failed: Privileged port should be DENIED');
console.log('  [PASS] Test 4: Privileged Port (80) -> DENIED (Security Restriction)');

console.log('=== All Policy Guardrail Unit Tests Passed Successfully ===');
