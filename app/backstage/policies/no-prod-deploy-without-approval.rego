package forgeops

import future.keywords.if
import future.keywords.in

# Block production deployments without approval
default allow = false

allow if {
  not prod_without_approval
  not missing_resource_limits
  not missing_cost_tags
  not unauthorized_role
}

# POLICY 1: no-prod-deploy-without-approval
# Blocks template execution targeting production unless forgeops/approved == "true"
prod_without_approval if {
  input.environment == "production"
  input.metadata.annotations["forgeops/approved"] != "true"
}

prod_without_approval if {
  input.environment == "production"
  not input.metadata.annotations["forgeops/approved"]
}

# POLICY 2: require-resource-limits
# Blocks any scaffolder template output without CPU and memory resource limits
missing_resource_limits if {
  input.environment == "production"
  not input.resources.limits.cpu
}

missing_resource_limits if {
  input.environment == "production"
  not input.resources.limits.memory
}

# POLICY 3: require-cost-tags
# Blocks provisioning unless template parameters include owner, team, and cost-center
missing_cost_tags if {
  not input.parameters.owner
}

missing_cost_tags if {
  not input.parameters.team
}

missing_cost_tags if {
  not input.parameters["cost-center"]
}

# POLICY 4: rbac-template-access
# Only admin or developer roles can trigger scaffolder templates; viewer is denied
unauthorized_role if {
  not input.user in ["admin", "developer"]
}

unauthorized_role if {
  input.user == "viewer"
}

# Violations for detailed feedback
violations[msg] if {
  prod_without_approval
  msg := "Production deployment blocked: metadata.annotations['forgeops/approved'] must be 'true'"
}

violations[msg] if {
  missing_resource_limits
  msg := "Deployment blocked: Kubernetes manifest must include CPU and memory resource limits"
}

violations[msg] if {
  missing_cost_tags
  msg := "Provisioning blocked: Template parameters must include owner, team, and cost-center fields"
}

violations[msg] if {
  unauthorized_role
  msg := sprintf("Access denied: User '%v' does not have permission to trigger scaffolder templates. Required role: admin or developer", [input.user])
}
