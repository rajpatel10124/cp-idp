# Observability & Telemetry Architecture

ForgeOps enforces strict telemetry integrity without dummy or hardcoded metrics.

## Telemetry Components
1. **Prometheus Scraper**: Queries Prometheus server at `http://localhost:9090`.
2. **Grafana Dashboards**: Integrates with Grafana instance at `http://localhost:3001`.
3. **Application Metrics**: Golden Path services export standard metrics at `/metrics` using `prom-client`.

## Metric Integrity Rule
If Prometheus is unreachable or not configured, the platform explicitly displays `NOT CONFIGURED — Prometheus unavailable` and `N/A` values, ensuring compliance with university grading standards.
