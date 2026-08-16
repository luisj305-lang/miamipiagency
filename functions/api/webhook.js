// Cloudflare Pages Function — Webhook de Stripe
// Ruta: /api/webhook  (POST)
// Recibe eventos de Stripe, verifica la firma y, al completarse un pago,
// notifica al equipo y registra el pedido.
//
// Variables de entorno necesarias:
//   STRIPE_SECRET_KEY      — clave secreta de Stripe (sk_...)
//   STRIPE_WEBHOOK_SECRET  — secreto de firma del webhook (whsec_...)
//   RESEND_API_KEY         — (opcional) clave de Resend para enviar email
//   NOTIFY_EMAIL           — email al que avisar de cada venta
//   FROM_EMAIL             — (opcional) remitente verificado en Resend
//   ORDERS_KV              — (opcional) binding de Cloudflare KV para guardar pedidos

export async function onRequestPost(context) {
  const env = context.env;

  const payload = await context.request.text();
  const signature = context.request.headers.get('stripe-signature');

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: 'Falta STRIPE_WEBHOOK_SECRET.' }, 500);
  }

  let event;
  if (signature) {
    try {
      event = await constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      return json({ error: `Firma inválida: ${e.message}` }, 400);
    }
  } else {
    // Sin header de firma, rechazar siempre (no confiar en eventos sin verificar).
    return json({ error: 'Falta el header stripe-signature.' }, 400);
  }

  // Solo nos interesa el evento de pago completado.
  if (event.type !== 'checkout.session.completed') {
    return json({ received: true, handled: false, type: event.type });
  }

  const session = event.data.object;

  // Fetch line items para saber qué se compró y por cuánto.
  const lineItems = await fetchLineItems(session.id, env.STRIPE_SECRET_KEY);

  const productName = lineItems.length
    ? lineItems.map((li) => li.description || 'Servicio').join(', ')
    : 'Servicio';

  const order = {
    sessionId: session.id,
    customerEmail: session.customer_details?.email || null,
    customerName: session.customer_details?.name || null,
    product: productName,
    amountTotal: session.amount_total || 0,
    currency: (session.currency || 'usd').toUpperCase(),
    createdAt: new Date().toISOString(),
  };

  // 1) Guardar en KV si está configurado.
  if (env.ORDERS_KV) {
    try {
      await env.ORDERS_KV.put(`order:${session.id}`, JSON.stringify(order));
    } catch (e) {
      // no bloquea la entrega
    }
  }

  // 2) Notificar al equipo por email (Resend) si está configurado.
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    try {
      await sendEmail(env, order);
    } catch (e) {
      // el pago ya está hecho; registramos el fallo pero no rompemos el webhook
      return json({ received: true, handled: true, emailError: e.message });
    }
  }

  return json({ received: true, handled: true, order });
}

export async function onRequestGet(context) {
  return json({ ok: true, message: 'Webhook de Stripe. Enviá eventos por POST.' });
}

// ---------- helpers ----------

async function fetchLineItems(sessionId, secretKey) {
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?limit=20`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function sendEmail(env, order) {
  const from = env.FROM_EMAIL || 'Miami PI Agency <onboarding@resend.dev>';
  const amount = (order.amountTotal / 100).toFixed(2);
  const body = `Nueva venta recibida\n\n` +
    `Producto: ${order.product}\n` +
    `Cliente: ${order.customerName || '—'} (${order.customerEmail || 'sin email'})\n` +
    `Monto: ${order.currency} ${amount}\n` +
    `Sesión: ${order.sessionId}\n` +
    `Fecha: ${order.createdAt}\n\n` +
    `→ Coordinar la entrega del servicio.`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [env.NOTIFY_EMAIL],
      subject: `Nueva venta: ${order.product} (${order.currency} ${amount})`,
      text: body,
    }),
  });
}

// Verificación de firma de Stripe (implementada con Web Crypto, sin dependencias).
async function constructEvent(payload, header, secret) {
  const parts = header.split(',').map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith('t='))?.slice(2);
  const sig = parts.find((p) => p.startsWith('v1='))?.slice(3);

  if (!ts || !sig) {
    throw new Error('Header stripe-signature sin timestamp o firma.');
  }

  // Tolerancia anti-replay: rechazar eventos con más de 5 min de antigüedad.
  const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
  if (ageSeconds > 300) {
    throw new Error('Evento demasiado antiguo.');
  }

  const signedPayload = `${ts}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload)
  );
  const computed = toHex(new Uint8Array(signature));

  if (!timingSafeEqual(computed, sig)) {
    throw new Error('La firma no coincide.');
  }

  return JSON.parse(payload);
}

function toHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
