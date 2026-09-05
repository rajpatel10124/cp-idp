# Kubernetes Orchestration & Self-Service

ForgeOps provides native Kubernetes support for both local development clusters (Minikube / Kind) and production cloud clusters (AWS EKS / Azure AKS).

## Key Features
* **Self-Service Namespace Provisioning**: Developers can create and manage isolated namespaces (`forgeops-dev`, `forgeops-staging`, `forgeops-prod`).
* **Automated Manifest Generation**: Scaffolder generates production-grade `Deployment` and `Service` specs with resource limits, liveness, and readiness probes.
* **Rollout Verification**: The deployment engine monitors pod readiness (`kubectl rollout status`) during deployment lifecycle step 6.
