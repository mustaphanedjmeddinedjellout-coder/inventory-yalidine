const crypto = require('crypto');

function getConfig() {
  return {
    pixelId: (process.env.META_PIXEL_ID || '').trim(),
    accessToken: (process.env.META_ACCESS_TOKEN || '').trim(),
    testEventCode: (process.env.META_TEST_EVENT_CODE || '').trim(),
  };
}

function isConfigured() {
  const { pixelId, accessToken } = getConfig();
  return Boolean(pixelId && accessToken);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizePhone(phone) {
  if (!phone) return null;
  return String(phone).replace(/\D/g, '');
}

function normalizeName(name) {
  if (!name) return null;
  return String(name).trim().toLowerCase();
}

async function sendEvent({
  eventName,
  eventTime,
  eventId,
  user,
  customData,
  eventSourceUrl,
  clientIp,
  userAgent,
}) {
  if (!isConfigured()) return { skipped: true };
  const { pixelId, accessToken, testEventCode } = getConfig();

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: 'website',
        event_source_url: eventSourceUrl,
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          ph: user?.phone ? [sha256(user.phone)] : undefined,
          fn: user?.firstname ? [sha256(user.firstname)] : undefined,
          ln: user?.lastname ? [sha256(user.lastname)] : undefined,
          ct: user?.commune ? [sha256(user.commune)] : undefined,
          st: user?.wilaya ? [sha256(user.wilaya)] : undefined,
        },
        custom_data: customData,
      },
    ],
  };

  if (testEventCode) payload.test_event_code = testEventCode;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Meta CAPI request failed');
  }

  return data;
}

function buildUserData({ firstname, familyname, phone, wilaya, commune }) {
  const normalized = {
    phone: normalizePhone(phone),
    firstname: normalizeName(firstname),
    lastname: normalizeName(familyname),
    wilaya: normalizeName(wilaya),
    commune: normalizeName(commune),
  };

  return normalized;
}

module.exports = {
  sendEvent,
  buildUserData,
  isConfigured,
};