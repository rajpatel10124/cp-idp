# Deployment Engine & Target Adapter Isolation

The ForgeOps Deployment Engine (`deploymentEngine.ts`) implements an 8-step state machine for workload deployments:

1. **PREFLIGHT**: Pre-flight validation & target environment checks.
2. **CLONING**: Repository fetch into isolated temporary workspace.
3. **ANALYZING**: Repository model and dependency analysis.
4. **BUILDING**: Container image building via Docker engine.
5. **STARTING**: Workload instantiation via Target Adapter (`LocalDocker`, `Minikube`, `Kind`, `EKS`, `AKS`).
6. **HEALTH_CHECKING**: Automated HTTP/TCP probe polling until healthy.
7. **CATALOG_REGISTRATION**: Registration into Backstage Software Catalog.
8. **SUCCESS**: Deployment finalized and audit event recorded.

## Target Adapters
* **LocalDockerAdapter**: Deploys containers to local Docker daemon with dynamic host port mapping.
* **MinikubeAdapter**: Deploys workloads to local Minikube cluster using `kubectl` and namespace isolation.
* **KindAdapter**: Deploys workloads to Kind Kubernetes cluster.
* **AwsEksAdapter**: Manages deployments to AWS Elastic Kubernetes Service.
