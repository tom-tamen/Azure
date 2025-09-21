// api/shared/telemetry.js
const appInsights = require("applicationinsights");

let client;

function getClient() {
  if (client) return client;

  // Azure détecte automatiquement APPINSIGHTS_CONNECTION_STRING (ou InstrumentationKey)
  const conn = process.env.APPINSIGHTS_CONNECTION_STRING;
  if (!conn) {
    return { trackEvent(){}, trackMetric(){}, trackException(){}, trackTrace(){}, flush(cb){ if (cb) cb(); } };
  }

  appInsights
    .setup(conn)
    .setAutoCollectRequests(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectConsole(true, true)
    .setSendLiveMetrics(false)
    .setUseDiskRetryCaching(true)
    .start();

  client = appInsights.defaultClient;
  // Ajoute des dimensions globales (facultatif)
  client.commonProperties = {
    service: "bayroumetter-api",
    env: process.env.NODE_ENV || "local",
  };
  return client;
}

module.exports = { getClient };
