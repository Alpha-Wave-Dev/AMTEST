// Vercel serverless function: proxy to Anthropic with the API key from env.
// Same-origin so the browser doesn't need a key.

export const config = {
  maxDuration: 60, // web_search can take 20-40s
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY env var is not set on the deployment' });
    return;
  }

  // Vercel parses application/json into req.body. Re-stringify for forwarding.
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: `Upstream error: ${err.message}` });
  }
}
