package forgeops.resource_limits

import future.keywords.if
import future.keywords.in

default allow = true

# Block any scaffolder template output that does not include CPU and memory resource limits
allow = false if {
  missing_cpu_limit
}

allow = false if {
  missing_memory_limit
}

missing_cpu_limit if {
  not input.resources.limits.cpu
}

missing_cpu_limit if {
  input.resources.limits.cpu == ""
}

missing_memory_limit if {
  not input.resources.limits.memory
}

missing_memory_limit if {
  input.resources.limits.memory == ""
}

violations[msg] if {
  missing_cpu_limit
  msg := "Kubernetes manifest must include spec.containers[*].resources.limits.cpu"
}

violations[msg] if {
  missing_memory_limit
  msg := "Kubernetes manifest must include spec.containers[*].resources.limits.memory"
}
