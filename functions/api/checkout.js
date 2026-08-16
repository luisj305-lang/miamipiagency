// Cloudflare Pages Function — crea una sesión de pago de Stripe Checkout
// Ruta: /api/checkout  (POST)
// La clave secreta vive en las variables de entorno de Cloudflare (STRIPE_SECRET_KEY).
// Nunca se expone al navegador.

export async function onRequestPost(context) {
  const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;
  const SITE_URL = context.env.SITE_URL || 'https://miamipiagency.com';

  if (!STRIPE_SECRET_KEY) {
    return json({ error: 'Stripe no está configurado. Falta STRIPE_SECRET_KEY.' }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: 'Cuerpo de la petición inválido (JSON).' }, 400);
  }

  const priceId = body.priceId;
  const quantity = Math.max(1, parseInt(body.quantity || '1', 10));
  const successUrl = body.successUrl || `${SITE_URL}/payment-success/`;
  const cancelUrl = body.cancelUrl || `${SITE_URL}/pay/`;

  if (!priceId) {
    return json({ error: 'Falta priceId (ID de precio de Stripe).' }, 400);
  }

  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': String(quantity),
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  let session;
  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    session = await res.json();

    if (!res.ok) {
      return json({ error: session.error?.message || 'Error al crear la sesión de pago.' }, res.status);
    }
  } catch (e) {
    return json({ error: 'No se pudo contactar con Stripe.' }, 502);
  }

  if (!session.url) {
    return json({ error: 'Stripe no devolvió una URL de pago.' }, 502);
  }

  return json({ url: session.url });
}

export async function onRequestGet(context) {
  return json({ ok: true, message: 'POST a esta ruta con { priceId } para crear un checkout.' });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
