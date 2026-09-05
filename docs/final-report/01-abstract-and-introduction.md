# Capstone Final Report — Part 1: Abstract, Introduction & Problem Statement

## 1. Abstract

Modern cloud-native software development is characterized by increasing architectural complexity, microservice proliferation, and cognitive overload on software engineering teams. This capstone project presents the design, implementation, and empirical evaluation of a deployment-ready Internal Developer Platform (IDP) engineered using **Spotify Backstage**, **Amazon EKS**, **Terraform**, **GitHub Actions**, and **Open Policy Agent (OPA)**. The platform enables self-service application scaffolding through standardized Golden Paths, automated containerization, infrastructure provisioning, telemetry integration, and policy guardrails. Empirical evaluation demonstrates an **89.6% reduction in time-to-first-deploy** (from 50.2 minutes manual setup down to 5.2 minutes automated self-service).

---

## 2. Problem Statement

Engineering teams frequently experience friction during microservice onboarding due to:
1. **Toolchain Fragmentation**: Fragmented workflows requiring manual navigation across cloud consoles, CI/CD runners, and secret managers.
2. **Configuration Drift**: Inconsistent Dockerfiles, Kubernetes manifests, and security contexts across microservices.
3. **Cognitive Load**: Developers forced to master complex YAML schemas and IAM policies instead of delivering business logic.

---

## 3. Proposed IDP Solution

The IDP establishes a single pane of glass for developers through:
- **Software Catalog**: Centralized graph visualizing ownership, dependencies, and API specifications.
- **Golden Paths**: Two production-grade scaffolding templates (REST API & Asynchronous Worker Service).
- **Automated Guardrails**: Admission control policies blocking non-compliant infrastructure prior to deployment.
