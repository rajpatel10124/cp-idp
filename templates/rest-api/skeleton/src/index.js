const express = require('express');
const client = require('prom-client');
const winston = require('winston');

const PORT = process.env.PORT || ${{ values.port }};
const SERVICE_NAME = '${{ values.component_id }}';
const ENVIRONMENT = process.env.NODE_ENV || '${{ values.environment }}';

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: SERVICE_NAME, environment: ENVIRONMENT },
  transports: [new winston.transports.Console()]
});

// Configure Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: `${SERVICE_NAME.replace(/-/g, '_')}_` });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.05, 0.1, 0.5, 1, 3, 5]
});

const app = express();
app.use(express.json());

// Request timing middleware
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.path, code: res.statusCode });
  });
  next();
});

// Primary REST Endpoints
app.get('/api/v1/resource', (req, res) => {
  logger.info('Fetching sample resource list');
  res.status(200).json({
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    status: 'active',
    data: [
      { id: 101, name: 'Item Alpha', status: 'ready' },
      { id: 102, name: 'Item Beta', status: 'processing' }
    ]
  });
});

app.post('/api/v1/resource', (req, res) => {
  const payload = req.body;
  logger.info('Resource creation payload received', { payload });
  res.status(201).json({
    message: 'Resource created successfully',
    id: Math.floor(Math.random() * 1000) + 1,
    created_at: new Date().toISOString()
  });
});

// Health Checks & Telemetry
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'UP', service: SERVICE_NAME, timestamp: new Date() });
});

app.get('/livez', (req, res) => {
  res.status(200).send('OK');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

const server = app.listen(PORT, () => {
  logger.info(`REST API Service [${SERVICE_NAME}] listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Gracefully shutting down...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
