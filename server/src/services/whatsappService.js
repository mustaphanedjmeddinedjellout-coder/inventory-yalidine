function getConfig() {
  const bodyVariables = (process.env.WHATSAPP_TEMPLATE_BODY_VARIABLES
    || 'customer_name,order_number,status,tracking')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    enabled: String(process.env.WHATSAPP_NOTIFICATIONS_ENABLED || '').trim().toLowerCase() === 'true',
    accessToken: (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '').trim(),
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    apiVersion: (process.env.WHATSAPP_API_VERSION || process.env.META_API_VERSION || 'v22.0').trim(),
    templateName: (process.env.WHATSAPP_TEMPLATE_NAME || '').trim(),
    templateLanguageCode: (process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE || 'ar').trim(),
    bodyVariables,
  };
}

function getConfigStatus() {
  const config = getConfig();
  const missing = [];

  if (!config.enabled) missing.push('WHATSAPP_NOTIFICATIONS_ENABLED=true');
  if (!config.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!config.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.templateName) missing.push('WHATSAPP_TEMPLATE_NAME');

  return {
    configured: missing.length === 0,
    missing,
  };
}

function isConfigured() {
  return getConfigStatus().configured;
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

  if (!/^\d{11,15}$/.test(digits)) return null;
  return digits;
}

function safeText(value, fallback = '-') {
  const normalized = String(value == null ? '' : value).trim();
  return normalized || fallback;
}

function getCustomerName(order) {
  const full = `${safeText(order?.firstname, '').trim()} ${safeText(order?.familyname, '').trim()}`
    .trim();
  return full || safeText(order?.firstname) || safeText(order?.familyname) || 'Client';
}

function resolveVariableValue(name, order, statusText) {
  switch (name) {
    case 'customer_name':
      return getCustomerName(order);
    case 'first_name':
      return safeText(order?.firstname, 'Client');
    case 'last_name':
      return safeText(order?.familyname, '-');
    case 'order_number':
      return safeText(order?.order_number);
    case 'status':
      return safeText(statusText);
    case 'tracking':
      return safeText(order?.yalidine_tracking);
    case 'wilaya':
      return safeText(order?.to_wilaya_name);
    case 'commune':
      return safeText(order?.to_commune_name);
    case 'phone':
      return safeText(order?.contact_phone);
    default:
      return safeText(order?.[name]);
  }
}

function buildTemplatePayload(order, statusText) {
  const config = getConfig();
  const parameters = config.bodyVariables.map((name) => ({
    type: 'text',
    text: resolveVariableValue(name, order, statusText),
  }));

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(order?.contact_phone),
    type: 'template',
    template: {
      name: config.templateName,
      language: {
        code: config.templateLanguageCode,
      },
      components: parameters.length > 0
        ? [
          {
            type: 'body',
            parameters,
          },
        ]
        : undefined,
    },
  };
}

async function sendOrderStatusUpdate(order, { statusText } = {}) {
  const status = getConfigStatus();
  if (!status.configured) {
    return { skipped: true, reason: `Missing config: ${status.missing.join(', ')}` };
  }

  const payload = buildTemplatePayload(order, statusText);
  if (!payload.to) {
    return { skipped: true, reason: 'Invalid contact phone' };
  }

  const { accessToken, phoneNumberId, apiVersion } = getConfig();

  const res = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'WhatsApp Cloud API request failed');
  }

  return data;
}

module.exports = {
  getConfigStatus,
  isConfigured,
  normalizePhone,
  sendOrderStatusUpdate,
};
