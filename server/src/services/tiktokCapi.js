const crypto = require('crypto');

function getConfig() {
  return {
    pixelCode: (process.env.TIKTOK_PIXEL_ID || '').trim(),
    accessToken: (process.env.TIKTOK_ACCESS_TOKEN || '').trim(),
    testEventCode: (process.env.TIKTOK_TEST_EVENT_CODE || '').trim(),
  };
}

function isConfigured() {
  const { pixelCode, accessToken } = getConfig();
  return Boolean(pixelCode && accessToken);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0')) {
    digits = `213${digits.slice(1)}`;
  } else if (!digits.startsWith('213') && digits.length === 9) {
    digits = `213${digits}`;
  }

  if (!digits.startsWith('213') || digits.length < 12) return null;
  return digits;
}

function normalizeEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  return normalized || null;
}

function normalizeName(name) {
  if (!name) return null;
  return String(name).trim().toLowerCase();
}

function buildUserData({ firstname, familyname, phone, email, ttclid, ttp, externalId }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);
  const normalizedFirst = normalizeName(firstname);
  const normalizedLast = normalizeName(familyname);

  return {
    phone: normalizedPhone ? sha256(normalizedPhone) : null,
    email: normalizedEmail ? sha256(normalizedEmail) : null,
    firstname: normalizedFirst ? sha256(normalizedFirst) : null,
    lastname: normalizedLast ? sha256(normalizedLast) : null,
    ttclid: ttclid ? String(ttclid).trim() : null,
    ttp: ttp ? String(ttp).trim() : null,
    externalId: externalId ? sha256(String(externalId)) : null,
  };
}

async function sendEvent({
  eventName,
  eventTime,
  eventId,
  user,
  properties,
  eventSourceUrl,
  clientIp,
  userAgent,
  referrer,
}) {
  if (!isConfigured()) return { skipped: true };
  const { pixelCode, accessToken, testEventCode } = getConfig();

  const payload = {
    pixel_code: pixelCode,
    event: eventName,
    event_id: eventId,
    event_time: eventTime,
    context: {
      page: {
        url: eventSourceUrl || undefined,
        referrer: referrer || undefined,
      },
      user: {
        ip: clientIp || undefined,
        user_agent: userAgent || undefined,
        phone_number: user?.phone || undefined,
        email: user?.email || undefined,
        external_id: user?.externalId || undefined,
        ttclid: user?.ttclid || undefined,
        ttp: user?.ttp || undefined,
        fn: user?.firstname || undefined,
        ln: user?.lastname || undefined,
      },
    },
    properties,
  };

  if (testEventCode) payload.test_event_code = testEventCode;

  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.code) {
    throw new Error(data?.message || 'TikTok Events API request failed');
  }

  return data;
}

module.exports = {
  sendEvent,
  buildUserData,
  isConfigured,
};
