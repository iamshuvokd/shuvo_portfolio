import emailjs from '@emailjs/browser';
import { env } from '@/config/env';
import type { ContactPayload } from '@/types/contact';
import { ApiError, http } from './http';

const sendViaEmailJs = async (payload: ContactPayload) => {
  const { serviceId, templateId, publicKey } = env.emailjs;
  await emailjs.send(serviceId, templateId, { ...payload }, publicKey);
};

/**
 * Sends a contact message. Uses the backend (`POST /contact`, visible in /admin) when an API is
 * configured, and falls back to EmailJS only if the backend is unreachable or erroring, so a
 * visitor's message is never lost. Client errors (400/429) are surfaced, not retried.
 */
export async function sendContactMessage(payload: ContactPayload): Promise<void> {
  if (!env.apiUrl) return sendViaEmailJs(payload);

  try {
    await http<void>('/contact', { method: 'POST', body: JSON.stringify(payload) });
  } catch (error) {
    const backendDown = error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
    if (!backendDown) throw error;
    await sendViaEmailJs(payload);
  }
}
