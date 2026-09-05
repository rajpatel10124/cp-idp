// ==============================================================================
// Policy Engine: OPA / Kyverno Guardrail Evaluation Engine
// Evaluates platform guardrails before service scaffolding and workload deployment
// ==============================================================================

export interface PolicyInput {
  userRole?: string;
  userName?: string;
  serviceName?: string;
  owner?: string;
  environment?: string;
  port?: number;
  cpuRequest?: string;
  memoryRequest?: string;
  privileged?: boolean;
  imageRegistry?: string;
  target?: string;
}

export interface PolicyViolation {
  policy: string;
  violation: string;
  reason: string;
  resource: string;
  remediation: string;
}

export interface PolicyEvaluationResult {
  allow: boolean;
  violations: PolicyViolation[];
  evaluatedAt: string;
}

const APPROVED_REGISTRIES = [
  'local',
  'ecr',
  'dockerhub',
  'docker.io',
  'ghcr.io',
  'amazonaws.com',
  'azurecr.io',
  'gcr.io',
];

export function evaluatePlatformPolicy(input: PolicyInput): PolicyEvaluationResult {
  const violations: PolicyViolation[] = [];
  const role = input.userRole || 'Developer';
  const environment = input.environment || 'development';
  const owner = input.owner || '';
  const port = input.port || 8080;
  const cpu = input.cpuRequest || '100m';
  const memory = input.memoryRequest || '128Mi';
  const privileged = input.privileged === true;
  const registry = (input.imageRegistry || 'local').toLowerCase();

  // 1. RBAC & Environment Authorization Rule
  if (role === 'Viewer') {
    violations.push({
      policy: 'RBAC-01: Read-Only Privilege Restriction',
      violation: 'Unauthorized Action by Viewer Role',
      reason: 'Users with the Viewer role are restricted to read-only access and cannot scaffold or deploy workloads.',
      resource: input.serviceName || 'service',
      remediation: 'Switch to a Developer or Platform Engineer account to perform deployment operations.',
    });
  } else if (role === 'Developer' && (environment === 'prod' || environment === 'production')) {
    violations.push({
      policy: 'GOV-01: Direct Production Deployment Restriction',
      violation: 'Developer Role Attempted Direct Prod Deployment',
      reason: 'Developers are not authorized to deploy directly to the production environment without peer review.',
      resource: `${input.serviceName || 'service'} [${environment}]`,
      remediation: 'Deploy to development or staging environment, or submit a RFC for production promotion by a Platform Engineer.',
    });
  }

  // 2. Ownership Guardrail
  if (!owner || !owner.startsWith('team-')) {
    violations.push({
      policy: 'GOV-02: Mandatory Service Ownership Tagging',
      violation: 'Invalid or Missing Owner Metadata',
      reason: `Service owner '${owner || 'EMPTY'}' does not conform to required team naming pattern ('team-*').`,
      resource: input.serviceName || 'service',
      remediation: "Set service owner to a valid registered engineering team starting with 'team-' (e.g. 'team-backend').",
    });
  }

  // 3. Non-Privileged Port Guardrail
  if (port < 1024 || port > 65535) {
    violations.push({
      policy: 'SEC-01: Non-Privileged Network Port Requirement',
      violation: 'Privileged Network Port Binding Requested',
      reason: `Port ${port} is in the privileged range (< 1024) or out of bounds.`,
      resource: `${input.serviceName || 'service'}:${port}`,
      remediation: 'Configure service port to a non-privileged port number between 1024 and 65535 (e.g. 8080 or 3000).',
    });
  }

  // 4. Resource Limits Guardrail (CPU & Memory)
  if (!cpu || cpu.trim() === '' || cpu === '0') {
    violations.push({
      policy: 'RES-01: CPU Request/Limit Mandatory Specification',
      violation: 'Missing CPU Resource Request Allocation',
      reason: 'Workload deployment specification lacks CPU request limit, risking noisy neighbor pod contention.',
      resource: input.serviceName || 'service',
      remediation: "Specify explicit CPU request allocation (e.g. '100m' or '250m').",
    });
  }

  if (!memory || memory.trim() === '' || memory === '0') {
    violations.push({
      policy: 'RES-02: Memory Request/Limit Mandatory Specification',
      violation: 'Missing Memory Resource Allocation',
      reason: 'Workload specification lacks memory allocation limit, risking pod OOM kill cascades.',
      resource: input.serviceName || 'service',
      remediation: "Specify explicit memory request allocation (e.g. '128Mi' or '512Mi').",
    });
  }

  // 5. Privileged Container Guardrail
  if (privileged) {
    violations.push({
      policy: 'SEC-02: Forbidden Privileged Container Mode',
      violation: 'Privileged Security Context Requested',
      reason: 'Running containers in privileged security mode grants host root capabilities and violates platform security policies.',
      resource: input.serviceName || 'service',
      remediation: 'Disable securityContext.privileged in container definition and use dropped capabilities.',
    });
  }

  // 6. Approved Image Registries Guardrail
  const isApprovedRegistry = APPROVED_REGISTRIES.some((reg) => registry.includes(reg));
  if (!isApprovedRegistry) {
    violations.push({
      policy: 'SEC-03: Approved Container Image Registry Enforcement',
      violation: 'Unapproved Container Registry Source',
      reason: `Image registry '${registry}' is not in the list of platform-approved container registries.`,
      resource: registry,
      remediation: 'Use images published to approved registries (ECR, DockerHub, or GitHub Container Registry).',
    });
  }

  return {
    allow: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString(),
  };
}
