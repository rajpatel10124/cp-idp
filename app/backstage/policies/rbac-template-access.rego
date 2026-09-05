package forgeops.rbac

import future.keywords.if
import future.keywords.in

# Only admin and developer roles can trigger scaffolder templates
default allow = false

allow if {
  input.user in ["admin", "developer"]
}

# Viewer role is explicitly denied
deny if {
  input.user == "viewer"
}

violations[msg] if {
  deny
  msg := sprintf("Role 'viewer' is not permitted to trigger scaffolder templates. Assign 'developer' or 'admin' role to '%v'", [input.user])
}

violations[msg] if {
  not input.user in ["admin", "developer", "viewer"]
  msg := sprintf("Unknown user role '%v'. Permitted roles for template access: admin, developer", [input.user])
}
