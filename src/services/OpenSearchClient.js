import { Client } from '@opensearch-project/opensearch';

let client = null;

/**
 * Returns a singleton OpenSearch client configured from environment variables.
 * Env:
 *  - OPENSEARCH_ENABLED=true
 *  - OPENSEARCH_NODE=https://host:9200
 *  - OPENSEARCH_USERNAME=...
 *  - OPENSEARCH_PASSWORD=...
 *  - OPENSEARCH_TLS=true (optional, defaults to true for https)
 */
export function getOpenSearchClient() {
  if (client) return client;

  const node = process.env.OPENSEARCH_NODE;
  if (!node) {
    throw new Error('OPENSEARCH_NODE is not set');
  }

  const username = process.env.OPENSEARCH_USERNAME || '';
  const password = process.env.OPENSEARCH_PASSWORD || '';
  const useTls = process.env.OPENSEARCH_TLS !== 'false'; // default true if https

  client = new Client({
    node,
    auth: username ? { username, password } : undefined,
    ssl: useTls
      ? {
          rejectUnauthorized: process.env.OPENSEARCH_REJECT_UNAUTHORIZED === 'false' ? false : true
        }
      : undefined,
    requestTimeout: 10000 // 10s
  });

  return client;
}

export default getOpenSearchClient;

