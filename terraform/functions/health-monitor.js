const functions = require('@google-cloud/functions-framework');
const axios = require('axios');

// Health monitoring function
functions.http('healthMonitor', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const services = {
    auth: process.env.AUTH_SERVICE_URL,
    todo: process.env.TODO_SERVICE_URL,
    frontend: process.env.FRONTEND_URL
  };

  const results = {};
  const startTime = Date.now();

  // Check each service
  for (const [name, url] of Object.entries(services)) {
    if (!url) {
      results[name] = {
        status: 'error',
        message: 'Service URL not configured',
        responseTime: 0
      };
      continue;
    }

    try {
      const serviceStartTime = Date.now();
      const response = await axios.get(`${url}/health`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      const responseTime = Date.now() - serviceStartTime;
      
      results[name] = {
        status: response.status === 200 ? 'healthy' : 'warning',
        message: response.data?.message || 'Service responded',
        responseTime,
        statusCode: response.status,
        url: url
      };
    } catch (error) {
      const responseTime = Date.now() - serviceStartTime;
      
      results[name] = {
        status: 'error',
        message: error.message,
        responseTime,
        url: url
      };
    }
  }

  // Calculate overall health
  const totalServices = Object.keys(results).length;
  const healthyServices = Object.values(results).filter(r => r.status === 'healthy').length;
  const warningServices = Object.values(results).filter(r => r.status === 'warning').length;
  const errorServices = Object.values(results).filter(r => r.status === 'error').length;
  
  let overallStatus = 'healthy';
  if (errorServices > 0) {
    overallStatus = 'critical';
  } else if (warningServices > 0) {
    overallStatus = 'warning';
  }

  const totalTime = Date.now() - startTime;

  const healthReport = {
    timestamp: new Date().toISOString(),
    overall: {
      status: overallStatus,
      totalServices,
      healthyServices,
      warningServices,
      errorServices,
      healthPercentage: Math.round((healthyServices / totalServices) * 100)
    },
    services: results,
    metadata: {
      checkDuration: totalTime,
      environment: process.env.NODE_ENV || 'unknown',
      version: '1.0.0'
    }
  };

  // Set appropriate HTTP status
  let httpStatus = 200;
  if (overallStatus === 'critical') {
    httpStatus = 503;
  } else if (overallStatus === 'warning') {
    httpStatus = 207;
  }

  res.status(httpStatus).json(healthReport);
}); 