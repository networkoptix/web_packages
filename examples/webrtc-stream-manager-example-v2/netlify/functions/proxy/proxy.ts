// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import type { Handler } from '@netlify/functions';

// SSRF protection: only allow proxying to known Nx Cloud API hosts.
const ALLOWED_HOST_SUFFIXES = ['.nxvms.com', '.vmsproxy.com'];

function isAllowedUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') {
    return false;
  }
  if (parsed.username || parsed.password) {
    return false;
  }
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => parsed.hostname === suffix.slice(1) || parsed.hostname.endsWith(suffix),
  );
}

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  if (!isAllowedUrl(url)) {
    return {
      statusCode: 403,
      body: 'Forbidden: proxy requests are restricted to *.nxvms.com and *.vmsproxy.com over HTTPS',
    };
  }

  const headers: Record<string, string> = {};
  if (event.headers.authorization) {
    headers.authorization = event.headers.authorization;
  }

  try {
    const response = await fetch(url, {
      headers,
      method: event.httpMethod ?? 'GET',
      body: ['POST', 'PUT', 'PATCH'].includes(event.httpMethod ?? 'GET')
        ? event.body ?? undefined
        : undefined,
    });
    const body = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: `Proxy error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};
