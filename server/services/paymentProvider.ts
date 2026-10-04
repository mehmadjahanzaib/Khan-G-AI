import crypto from 'crypto';
import { PlanId, SubscriptionRecord, savePayment, saveSubscription, getSubscription, PaymentRecord } from './persistenceService.js';

export interface CheckoutResult {
  configured: boolean;
  provider: string;
  status: 'ready' | 'payment_provider_required' | 'pending';
  checkoutUrl?: string;
  sessionId?: string;
  message: string;
  manualPayment?: {
    amount: number;
    currency: string;
    planName: string;
    interval: 'monthly' | 'yearly';
    methods: Array<{
      name: string;
      accountTitle: string;
      accountNumber: string;
      bankName?: string;
      note: string;
    }>;
    supportEmail: string;
    whatsapp: string;
  };
}

export interface WebhookEventResult {
  success: boolean;
  handled: boolean;
  duplicate?: boolean;
  eventType?: string;
  userId?: string;
  planId?: PlanId;
  message: string;
}

// Processed Webhook Event ID cache for idempotency protection
const processedWebhookEventIds = new Set<string>();

export interface IPaymentProvider {
  name: string;
  isConfigured(): boolean;
  createCheckout(params: {
    userId: string;
    planId: PlanId;
    amount: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    planName: string;
    customerEmail?: string;
  }): Promise<CheckoutResult>;
  verifyWebhook(rawBody: string | Buffer, signatureHeader?: string): Promise<WebhookEventResult>;
}

/**
 * Fallback Provider when no payment gateway is configured in environment
 */
export class NonePaymentProvider implements IPaymentProvider {
  name = 'none';

  isConfigured(): boolean {
    return false;
  }

  async createCheckout(params: {
    userId: string;
    planId: PlanId;
    amount: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    planName: string;
  }): Promise<CheckoutResult> {
    return {
      configured: false,
      provider: 'none',
      status: 'payment_provider_required',
      message:
        'Online automated card payments are currently not configured. Direct manual peer-to-peer mobile transfer (EasyPaisa, JazzCash, Raast / Bank) is available for verification.',
      manualPayment: {
        amount: params.amount,
        currency: params.currency,
        planName: params.planName,
        interval: params.interval,
        methods: [
          {
            name: 'EasyPaisa',
            accountTitle: 'Muhammad Jahanzaib',
            accountNumber: '0333-5016770',
            note: 'Send payment to 0333-5016770, then submit your Trx ID in the form below.',
          },
          {
            name: 'JazzCash',
            accountTitle: 'Muhammad Jahanzaib',
            accountNumber: '0333-5016770',
            note: 'Send payment via JazzCash to 0333-5016770, then submit your TID for verification.',
          },
          {
            name: 'Raast / MCB Bank IBAN',
            accountTitle: 'Muhammad Jahanzaib',
            accountNumber: 'PK43MUCB0782701671003245',
            bankName: 'MCB Bank Limited',
            note: 'Transfer to Raast IBAN, then share screenshot or transaction ID.',
          },
        ],
        supportEmail: 'mehmadjahanzaib@gmail.com',
        whatsapp: '03335016770',
      },
    };
  }

  async verifyWebhook(): Promise<WebhookEventResult> {
    return {
      success: false,
      handled: false,
      message: 'No payment webhook provider configured.',
    };
  }
}

/**
 * Standard Stripe Provider with cryptographic signature verification and idempotency
 */
export class StripePaymentProvider implements IPaymentProvider {
  name = 'stripe';
  private secretKey: string;
  private webhookSecret: string;

  constructor() {
    this.secretKey = process.env.PAYMENT_SECRET_KEY || '';
    this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || '';
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey && this.secretKey.startsWith('sk_'));
  }

  async createCheckout(params: {
    userId: string;
    planId: PlanId;
    amount: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    planName: string;
    customerEmail?: string;
  }): Promise<CheckoutResult> {
    if (!this.isConfigured()) {
      return new NonePaymentProvider().createCheckout(params);
    }

    try {
      const bodyParams = new URLSearchParams({
        mode: 'subscription',
        success_url: `${process.env.PUBLIC_SITE_URL || 'https://khang.pk'}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.PUBLIC_SITE_URL || 'https://khang.pk'}/?billing=canceled`,
        client_reference_id: params.userId,
        'metadata[userId]': params.userId,
        'metadata[planId]': params.planId,
        'line_items[0][price_data][currency]': params.currency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': `Khan G AI - ${params.planName}`,
        'line_items[0][price_data][unit_amount]': String(params.amount * 100),
        'line_items[0][price_data][recurring][interval]': params.interval === 'yearly' ? 'year' : 'month',
        'line_items[0][quantity]': '1',
      });

      if (params.customerEmail) {
        bodyParams.append('customer_email', params.customerEmail);
      }

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const session = await res.json();
      if (!res.ok || !session.url) {
        throw new Error(session.error?.message || 'Stripe API returned error');
      }

      return {
        configured: true,
        provider: 'stripe',
        status: 'ready',
        checkoutUrl: session.url,
        sessionId: session.id,
        message: 'Redirecting to secure Stripe checkout.',
      };
    } catch (err: any) {
      console.error('Stripe checkout error:', err);
      return {
        configured: true,
        provider: 'stripe',
        status: 'payment_provider_required',
        message: `Stripe checkout initialization failed: ${err?.message || 'Unknown error'}. Please use manual transfer.`,
      };
    }
  }

  async verifyWebhook(rawBody: string | Buffer, signatureHeader?: string): Promise<WebhookEventResult> {
    if (!this.webhookSecret) {
      return {
        success: false,
        handled: false,
        message: 'Webhook secret is not configured in PAYMENT_WEBHOOK_SECRET.',
      };
    }

    if (!signatureHeader) {
      return {
        success: false,
        handled: false,
        message: 'Missing Stripe signature header (stripe-signature).',
      };
    }

    try {
      const sigParts = signatureHeader.split(',').reduce((acc: Record<string, string>, part) => {
        const [k, v] = part.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = sigParts.t;
      const signature = sigParts.v1;
      if (!timestamp || !signature) {
        return { success: false, handled: false, message: 'Malformed stripe-signature header.' };
      }

      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
        return { success: false, handled: false, message: 'Webhook timestamp outside allowed tolerance.' };
      }

      const signedPayload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;
      const expectedSig = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return { success: false, handled: false, message: 'Invalid webhook signature.' };
      }

      const event = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'));
      const eventId = event.id;

      if (processedWebhookEventIds.has(eventId)) {
        return { success: true, handled: true, duplicate: true, message: 'Webhook already processed.' };
      }
      processedWebhookEventIds.add(eventId);

      const eventType = event.type;
      if (eventType === 'checkout.session.completed') {
        const session = event.data?.object;
        const userId = session?.client_reference_id || session?.metadata?.userId;
        const planId = (session?.metadata?.planId as PlanId) || 'pro_student';
        const days = session?.mode === 'subscription' ? 30 : 365;

        if (userId) {
          const nowMs = Date.now();
          const subRecord: SubscriptionRecord = {
            userId,
            planId,
            status: 'active',
            provider: 'stripe',
            providerSubscriptionId: session.subscription,
            providerCustomerId: session.customer,
            startedAt: nowMs,
            currentPeriodStart: nowMs,
            currentPeriodEnd: nowMs + days * 24 * 3600 * 1000,
            createdAt: nowMs,
            updatedAt: nowMs,
          };
          saveSubscription(subRecord);

          savePayment({
            id: `pay_${eventId}`,
            userId,
            planId,
            amount: (session.amount_total || 0) / 100,
            currency: (session.currency || 'usd').toUpperCase(),
            provider: 'stripe',
            transactionId: session.payment_intent || eventId,
            status: 'verified',
            verifiedBy: 'stripe_webhook',
            verifiedAt: nowMs,
            createdAt: nowMs,
            updatedAt: nowMs,
          });

          return { success: true, handled: true, eventType, userId, planId, message: 'Subscription activated.' };
        }
      }

      return { success: true, handled: true, eventType, message: `Handled event ${eventType}` };
    } catch (err: any) {
      return { success: false, handled: false, message: `Webhook parse error: ${err?.message || err}` };
    }
  }
}

export function getActivePaymentProvider(): IPaymentProvider {
  const providerName = (process.env.PAYMENT_PROVIDER || 'none').toLowerCase().trim();
  if (providerName === 'stripe' || process.env.PAYMENT_SECRET_KEY?.startsWith('sk_')) {
    return new StripePaymentProvider();
  }
  return new NonePaymentProvider();
}
