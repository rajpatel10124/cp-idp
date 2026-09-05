# ==============================================================================
# Open Policy Agent (OPA) Rego Guardrails for Backstage Scaffolder Templates
# ==============================================================================
package idp.scaffolder.policy

default allow = false

# Rule 1: Allow template execution if user role is Admin
allow {
    input.user.role == "PlatformAdmin"
}

# Rule 2: Allow Developers to scaffold services ONLY in 'dev' environment with valid owner
allow {
    input.user.role == "Developer"
    input.parameters.environment == "dev"
    valid_owner(input.parameters.owner)
    valid_port(input.parameters.port)
}

# Rule 3: Platform Engineers can scaffold in 'dev' and 'staging'
allow {
    input.user.role == "PlatformEngineer"
    input.parameters.environment != "prod"
    valid_owner(input.parameters.owner)
}

# Helper validations
valid_owner(owner) {
    owner != ""
    startswith(owner, "team-")
}

valid_port(port) {
    port >= 1024
    port <= 65535
}

# Denial reasons
deny[msg] {
    input.user.role == "Developer"
    input.parameters.environment == "prod"
    msg := "POLICY REJECT: Developers are not authorized to directly scaffold production services. Please submit an RFC."
}

deny[msg] {
    not valid_owner(input.parameters.owner)
    msg := "POLICY REJECT: Service owner must belong to an authorized team starting with 'team-'."
}

deny[msg] {
    not valid_port(input.parameters.port)
    msg := "POLICY REJECT: Service port must be a non-privileged port between 1024 and 65535."
}
