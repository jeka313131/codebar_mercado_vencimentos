import https from "node:https";

function isIpHost(url) {
  try {
    const hostname = new URL(url).hostname;
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

function useInsecureTls(url) {
  const flag = process.env.VPS_IMAGE_TLS_INSECURE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return isIpHost(url);
}

let insecureAgent;

function getInsecureAgent() {
  if (!insecureAgent) {
    insecureAgent = new https.Agent({ rejectUnauthorized: false });
  }
  return insecureAgent;
}

function insecureFetch(urlString, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        agent: getInsecureAgent(),
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            text: async () => data,
            json: async () => (data ? JSON.parse(data) : {}),
          });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

export function isVpsImageStorageConfigured() {
  return Boolean(
    process.env.VPS_IMAGE_UPLOAD_URL &&
      process.env.VPS_IMAGE_UPLOAD_TOKEN &&
      process.env.VPS_IMAGE_BASE_URL,
  );
}

export async function uploadImageToVps(relativePath, buffer) {
  const uploadUrl = process.env.VPS_IMAGE_UPLOAD_URL;
  const token = process.env.VPS_IMAGE_UPLOAD_TOKEN;
  const baseUrl = process.env.VPS_IMAGE_BASE_URL?.replace(/\/$/, "");

  if (!uploadUrl || !token || !baseUrl) {
    throw new Error("Storage VPS não configurado (VPS_IMAGE_*).");
  }

  const body = JSON.stringify({
    path: relativePath,
    data: buffer.toString("base64"),
  });

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  };

  const response = useInsecureTls(uploadUrl)
    ? await insecureFetch(uploadUrl, { method: "POST", headers, body })
    : await fetch(uploadUrl, { method: "POST", headers, body });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`VPS upload: ${text || response.statusText}`);
  }

  const payload = await response.json();
  return payload.url || `${baseUrl}/${relativePath}`;
}
