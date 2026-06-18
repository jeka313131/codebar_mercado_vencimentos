import https from "node:https";

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 12) return null;
  return digits;
}

function extractDigits(value) {
  return String(value).replace(/\D/g, "").replace(/@.*$/, "");
}

function brPhoneVariants(digits) {
  let d = extractDigits(digits);
  if (!d) return new Set();

  const variants = new Set([d]);
  if (!d.startsWith("55") && d.length >= 10) {
    d = `55${d}`;
    variants.add(d);
  }

  const local = d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11 && local[2] === "9") {
    variants.add(`55${local.slice(0, 2)}${local.slice(3)}`);
  }
  if (local.length === 10) {
    variants.add(`55${local.slice(0, 2)}9${local.slice(2)}`);
  }
  if (d.length >= 10) variants.add(d.slice(-10));
  if (d.length >= 11) variants.add(d.slice(-11));

  return variants;
}

function phonesMatch(a, b) {
  const va = brPhoneVariants(a);
  const vb = brPhoneVariants(b);
  for (const x of va) {
    for (const y of vb) {
      if (x === y || x.endsWith(y) || y.endsWith(x)) return true;
    }
  }
  return false;
}

function participantPhones(participant) {
  if (typeof participant === "string") {
    return [extractDigits(participant)];
  }
  const phones = [];
  if (participant?.phoneNumber) phones.push(extractDigits(participant.phoneNumber));
  if (participant?.id) phones.push(extractDigits(participant.id));
  if (participant?.jid) phones.push(extractDigits(participant.jid));
  if (participant?.participant) phones.push(extractDigits(participant.participant));
  return [...new Set(phones.filter(Boolean))];
}

function groupHasPhone(participants, userPhone) {
  if (!Array.isArray(participants)) return false;
  return participants.some((p) =>
    participantPhones(p).some((phone) => phonesMatch(phone, userPhone)),
  );
}

function isIpHost(url) {
  try {
    const hostname = new URL(url).hostname;
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

function evolutionTlsInsecure(baseUrl) {
  const flag = process.env.EVOLUTION_TLS_INSECURE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return isIpHost(baseUrl);
}

let insecureAgent;

function getInsecureAgent() {
  if (!insecureAgent) {
    insecureAgent = new https.Agent({ rejectUnauthorized: false });
  }
  return insecureAgent;
}

export function getEvolutionConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance) {
    return null;
  }

  return { baseUrl, apiKey, instance };
}

export function evolutionFetch(urlString, { method = "GET", headers = {}, body } = {}, baseUrl) {
  const config = getEvolutionConfig();
  const resolvedBase = baseUrl ?? config?.baseUrl;
  const useInsecure = evolutionTlsInsecure(resolvedBase) && urlString.startsWith("https://");

  const allHeaders = { ...headers };
  if (body !== undefined) {
    allHeaders["Content-Type"] = "application/json";
  }

  if (!useInsecure) {
    return fetch(urlString, { method, headers: allHeaders, body });
  }

  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers: allHeaders,
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

async function evolutionApi(path, options = {}) {
  const config = getEvolutionConfig();
  if (!config) {
    throw new Error("Evolution API não configurada.");
  }

  const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await evolutionFetch(
    url,
    {
      method: options.method ?? "GET",
      headers: { apikey: config.apiKey, ...options.headers },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    },
    config.baseUrl,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evolution API: ${body || response.statusText}`);
  }

  return response.json();
}

export async function sendWhatsAppText(phone, message) {
  const waPhone = normalizePhone(phone);
  if (!waPhone) {
    throw new Error("Número de WhatsApp inválido.");
  }

  const config = getEvolutionConfig();
  if (!config) {
    console.log(`[DEV WhatsApp] Para ${waPhone}: ${message}`);
    return { dev: true };
  }

  return evolutionApi(`/message/sendText/${encodeURIComponent(config.instance)}`, {
    method: "POST",
    body: { number: waPhone, text: message },
  });
}

export async function sendWhatsAppToGroup(groupJid, message) {
  const config = getEvolutionConfig();
  if (!config) {
    console.log(`[DEV WhatsApp] Grupo ${groupJid}: ${message}`);
    return { dev: true };
  }

  return evolutionApi(`/message/sendText/${encodeURIComponent(config.instance)}`, {
    method: "POST",
    body: { number: groupJid, text: message },
  });
}

export async function getInstanceConnectionState() {
  const config = getEvolutionConfig();
  if (!config) {
    return { connected: false, dev: true, phone: null };
  }

  try {
    const data = await evolutionApi(
      `/instance/connectionState/${encodeURIComponent(config.instance)}`,
    );
    const state = data?.instance?.state ?? data?.state ?? "close";
    return { connected: state === "open", state };
  } catch {
    return { connected: false, state: "close" };
  }
}

export async function getInstancePhone() {
  const config = getEvolutionConfig();
  if (!config) {
    return { phone: null, dev: true };
  }

  const data = await evolutionApi("/instance/fetchInstances");
  const list = Array.isArray(data) ? data : data ? [data] : [];

  const match = list.find((item) => {
    const name = item?.name ?? item?.instance?.instanceName ?? item?.instanceName;
    return name === config.instance;
  });

  const raw =
    match?.ownerJid ??
    match?.number ??
    match?.instance?.owner ??
    match?.instance?.wuid ??
    match?.owner ??
    null;

  if (!raw) {
    return { phone: null };
  }

  const digits = String(raw).replace(/\D/g, "").replace(/@.*$/, "");
  return { phone: digits || null };
}

export async function fetchAllGroups() {
  const config = getEvolutionConfig();
  if (!config) {
    return [];
  }

  const data = await evolutionApi(`/group/fetchAllGroups/${encodeURIComponent(config.instance)}?getParticipants=true`);
  const groups = Array.isArray(data) ? data : data?.groups ?? data ? [data] : [];

  return groups
    .map((g) => ({
      id: g.id ?? g.jid ?? g.groupJid,
      name: g.subject ?? g.name ?? g.id ?? "Grupo",
      participants: g.participants ?? [],
    }))
    .filter((g) => g.id);
}

async function fetchGroupParticipantsRaw(groupJid) {
  const config = getEvolutionConfig();
  if (!config) {
    return [];
  }

  const data = await evolutionApi(
    `/group/participants/${encodeURIComponent(config.instance)}?groupJid=${encodeURIComponent(groupJid)}`,
  );

  const participants = data?.participants ?? data?.members ?? data ?? [];
  return Array.isArray(participants) ? participants : [];
}

export async function fetchGroupParticipants(groupJid) {
  const participants = await fetchGroupParticipantsRaw(groupJid);
  return participants.map((p) => {
    if (typeof p === "string") return p;
    return p.phoneNumber ?? p.id ?? p.jid ?? p.participant ?? "";
  });
}

export async function filterGroupsForUser(userPhone) {
  const groups = await fetchAllGroups();
  const result = [];

  for (const group of groups) {
    try {
      const participants = group.participants?.length
        ? group.participants
        : await fetchGroupParticipantsRaw(group.id);
      if (groupHasPhone(participants, userPhone)) {
        result.push({ id: group.id, name: group.name });
      }
    } catch {
      // grupo inacessível — ignora
    }
  }

  return result;
}

export async function verifyGroupMembership(groupJid, userPhone) {
  const connection = await getInstanceConnectionState();
  if (!connection.connected) {
    return { connected: false, reason: "Instância Evolution desconectada." };
  }

  const participants = await fetchGroupParticipantsRaw(groupJid);

  if (!groupHasPhone(participants, userPhone)) {
    return { connected: false, reason: "Seu número não está neste grupo." };
  }

  return { connected: true };
}
