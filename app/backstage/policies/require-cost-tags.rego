package forgeops.cost_tags

import future.keywords.if

default allow = true

# Blocks provisioning unless the template parameters include owner, team, and cost-center
allow = false if {
  not input.parameters.owner
}

allow = false if {
  not input.parameters.team
}

allow = false if {
  not input.parameters["cost-center"]
}

violations[msg] if {
  not input.parameters.owner
  msg := "Template parameter 'owner' is required for cost attribution"
}

violations[msg] if {
  not input.parameters.team
  msg := "Template parameter 'team' is required for cost attribution"
}

violations[msg] if {
  not input.parameters["cost-center"]
  msg := "Template parameter 'cost-center' is required for budget tracking"
}
