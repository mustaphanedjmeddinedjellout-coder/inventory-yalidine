## WhatsApp Status Notifications

The backend can send a WhatsApp message when an order shipping status changes.

Required environment variables:

```bash
WHATSAPP_NOTIFICATIONS_ENABLED=true
WHATSAPP_ACCESS_TOKEN=your_meta_cloud_api_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_TEMPLATE_NAME=your_approved_template_name
WHATSAPP_TEMPLATE_LANGUAGE_CODE=ar
WHATSAPP_TEMPLATE_BODY_VARIABLES=customer_name,order_number,status,tracking
```

Notes:
- The template must be approved in Meta WhatsApp Manager before sending works.
- `WHATSAPP_TEMPLATE_BODY_VARIABLES` must match the exact body placeholders in your approved template.
- Supported variable names are `customer_name`, `first_name`, `last_name`, `order_number`, `status`, `tracking`, `wilaya`, `commune`, and `phone`.
- Phone numbers are normalized to Algeria format like `2135XXXXXXXX`.
- If WhatsApp is not configured, the app skips sending and order sync still continues.
