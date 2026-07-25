/**
 * Request payload validation for the fraud report.
 * Keeps validation at the system boundary so templates can trust the data.
 */

/**
 * Validates the incoming fraud report payload.
 *
 * @param {object} body - Parsed JSON request body
 * @returns {{ valid: boolean, error?: string, data?: object }}
 */
export const validateReportPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { phone, couriers } = body;

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    return { valid: false, error: '"phone" is required and must be a non-empty string' };
  }

  if (!Array.isArray(couriers) || couriers.length === 0) {
    return { valid: false, error: '"couriers" is required and must be a non-empty array' };
  }

  for (const [index, courier] of couriers.entries()) {
    if (!courier || typeof courier !== 'object') {
      return { valid: false, error: `couriers[${index}] must be an object` };
    }
    if (!courier.courier_name || typeof courier.courier_name !== 'string') {
      return { valid: false, error: `couriers[${index}].courier_name is required` };
    }
  }

  // Normalize with safe defaults so the template never sees undefined
  const data = {
    phone: phone.trim(),
    total_orders: Number(body.total_orders) || 0,
    total_delivered: Number(body.total_delivered) || 0,
    total_cancelled: Number(body.total_cancelled) || 0,
    delivery_rate: String(body.delivery_rate ?? '0%'),
    couriers: couriers.map((c) => ({
      courier_name: c.courier_name.trim(),
      orders: Number(c.orders) || 0,
      delivered: Number(c.delivered) || 0,
      cancelled: Number(c.cancelled) || 0,
      delivery_rate: String(c.delivery_rate ?? '0%'),
      customer_rating: typeof c.customer_rating === 'string' && c.customer_rating.trim().length > 0
        ? c.customer_rating.trim()
        : null,
    })),
  };

  return { valid: true, data };
};
