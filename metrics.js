const client = require("prom-client");

// Define and register metrics
const register = new client.Registry();
const httpRequestCounter = new client.Counter({
  name: "http_request_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});
register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);
client.collectDefaultMetrics({ register });

// Middleware to track metrics
const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? req.route.path : "unknown";
    httpRequestCounter.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
};

module.exports = {
  metricsMiddleware,
  registerMetrics: register,
};
