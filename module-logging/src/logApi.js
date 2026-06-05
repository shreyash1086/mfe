// Lambda Logging Endpoints
export const LOG_SEND_URL = 'https://si3uutquwv6lhu5424rhxxiama0rzeqa.lambda-url.eu-central-1.on.aws/';
export const LOG_FETCH_URL = 'https://bwpb3dld37kbsmgvpy6py4jdlm0ekenp.lambda-url.eu-central-1.on.aws';

/**
 * Send buffered logs to the Lambda ingestion endpoint.
 * @param {string} username - e.g. "labs-kraft-user205"
 * @param {Array} logs - Array of { user_id, timestamp, api_called, req_res_body }
 */
export async function sendLogs(username, logs) {
  try {
    const res = await window.__originalFetch(LOG_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, logs }),
    });
    if (!res.ok) throw new Error(`Log send failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[ObservabilityProvider] Failed to send logs:', err);
    return null;
  }
}

/**
 * Fetch stored logs from S3 via Lambda for a given cohort/folder.
 * @param {string} folder - The cohort folder name, e.g. "labs-kraft"
 * @returns {{ records: Array }}
 */
export async function fetchLogs(folder) {
  const url = `${LOG_FETCH_URL}?folder=${encodeURIComponent(folder)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Log fetch failed: ${res.status}`);
  return await res.json();
}
