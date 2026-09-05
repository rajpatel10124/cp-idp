# Security Guardrails & Policy-as-Code (OPA / Kyverno)

ForgeOps enforces policy validation prior to container building and deployment execution.

## Active Guardrails

1. **RBAC & Environment Authorization**: Restricts direct production deployments to authorized roles.
2. **Mandatory Ownership Tagging**: Requires metadata owner to match `team-*` pattern.
3. **Non-Privileged Port Binding**: Restricts container port bindings to ports 1024–65535.
4. **Resource Allocation Limits**: Mandatory CPU requests/limits (`cpuRequest`) and memory limits (`memoryRequest`).
5. **No Privileged Containers**: Forbids `securityContext.privileged = true`.
6. **Approved Registry Check**: Requires image registry sources to match platform-approved registries.

## Denial Lifecycle
If a deployment fails policy evaluation:
* Deployment status is updated to `POLICY_DENIED`.
* An audit event `POLICY_DENIED` is written to `catalog/audit-events.json`.
* Detailed structured violation records (`policy`, `violation`, `reason`, `remediation`) are returned to the user.
* Execution is halted immediately before any container build or cloud operation.
