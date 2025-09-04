module.exports = async function (req, res) {
  try {
    const url = req.url || "";
    const method = req.method || "GET";

    if (!url.startsWith("/api/")) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    const base = (process.env.PY_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");

    let backendURL = null;
    if (url.startsWith("/api/answer-clarification")) {
      backendURL = `${base}/clarifier-loop`;
    } else if (url.startsWith("/api/generate-yaml")) {
      backendURL = `${base}/generate-yaml`;
    } else if (url.startsWith("/api/run-opt")) {
      backendURL = `${base}/run-opt`;
    }

    if (!backendURL) {
      res.statusCode = 404;
      res.end("Unknown API route");
      return;
    }

    let bodyText = undefined;
    if (method !== "GET" && method !== "HEAD") {
      bodyText = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data || ""));
        req.on("error", reject);
      });
    }

    const headers = { "Content-Type": "application/json" };

    const response = await fetch(backendURL, {
      method,
      headers,
      body: bodyText || undefined,
    });

    const contentType = response.headers.get("content-type") || "application/json";
    res.statusCode = response.status;
    res.setHeader("Content-Type", contentType);
    const txt = await response.text();
    res.end(txt);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Proxy error", details: e.message }));
  }
};
