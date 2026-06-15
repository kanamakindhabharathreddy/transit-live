export default async function handler(req, res) {
  // Extract path from the query if needed, or simply append req.url
  const targetUrl = `https://utsappapicached01.apsrtconline.in/uts-vts-api${req.url.replace(/^\/api\/apsrtc/, '')}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Accept': req.headers['accept'] || '*/*',
        'deviceType': req.headers['devicetype'] || 'WEB',
        // Important: don't forward host or referer which might block CORS
      },
      // Pass body if not GET/HEAD
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    };

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status).send(data);
  } catch (error) {
    console.error('APSRTC Proxy Error:', error);
    res.status(500).json({ error: 'Failed to proxy request to APSRTC' });
  }
}
