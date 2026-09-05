const http = require('http');
const client = require('prom-client');
const winston = require('winston');

const WORKER_NAME = '${{ values.component_id }}';
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '${{ values.concurrency }}', 10);
const HEALTH_PORT = process.env.HEALTH_PORT || 9090;
const ENVIRONMENT = process.env.NODE_ENV || '${{ values.environment }}';

// Structured Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { worker: WORKER_NAME, environment: ENVIRONMENT },
  transports: [new winston.transports.Console()]
});

// Telemetry & Metrics
const processedJobsCounter = new client.Counter({
  name: 'worker_processed_jobs_total',
  help: 'Total background jobs processed',
  labelNames: ['status']
});

const jobDurationGauge = new client.Gauge({
  name: 'worker_job_processing_seconds',
  help: 'Duration of latest background job execution'
});

client.collectDefaultMetrics({ prefix: `${WORKER_NAME.replace(/-/g, '_')}_` });

let isRunning = true;
let activeJobs = 0;

// Simulated Asynchronous Event Queue Consumer
async function processJob(jobId) {
  activeJobs++;
  const startTime = Date.now();
  logger.info(`Starting background job #${jobId}`, { activeJobs, concurrency: CONCURRENCY });

  try {
    // Simulate async workload (e.g. database ETL, email send, image resize)
    const processingMs = Math.floor(Math.random() * 800) + 200;
    await new Promise(resolve => setTimeout(resolve, processingMs));

    const duration = (Date.now() - startTime) / 1000;
    jobDurationGauge.set(duration);
    processedJobsCounter.inc({ status: 'success' });
    logger.info(`Successfully processed job #${jobId}`, { durationSeconds: duration });
  } catch (err) {
    processedJobsCounter.inc({ status: 'failure' });
    logger.error(`Failed processing job #${jobId}`, { error: err.message });
  } finally {
    activeJobs--;
  }
}

// Event Loop Poller
let jobSequence = 1000;
const pollInterval = setInterval(() => {
  if (!isRunning) return;
  if (activeJobs < CONCURRENCY) {
    jobSequence++;
    processJob(jobSequence);
  }
}, 1500);

// Health & Telemetry HTTP Server (Port 9090)
const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/healthz' || req.url === '/livez') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', worker: WORKER_NAME, activeJobs, isRunning }));
  } else if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': client.register.contentType });
    res.end(await client.register.metrics());
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(HEALTH_PORT, () => {
  logger.info(`Worker telemetry server listening on port ${HEALTH_PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Draining active background jobs...');
  isRunning = false;
  clearInterval(pollInterval);

  healthServer.close(() => {
    logger.info('Worker telemetry server stopped. Exiting.');
    process.exit(0);
  });
});
