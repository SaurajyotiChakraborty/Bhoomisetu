// Bhoomisetu — Notification Service
// ConsoleNotificationProvider for local dev (§10)

export interface NotificationPayload {
  recipientId: string;
  recipientType: 'CITIZEN' | 'OFFICER';
  channel: 'IN_APP' | 'EMAIL' | 'SMS';
  templateId: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}

// ========================
// Console Notification Provider (local dev)
// ========================

interface OutboxEntry {
  id: number;
  type: string;
  destination: string;
  subject: string | null;
  body: string;
  metadata: string | null;
  createdAt: string;
}

// In-memory outbox for dev mode
const devOutboxEntries: OutboxEntry[] = [];
let outboxId = 0;

export class ConsoleNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    const entry: OutboxEntry = {
      id: ++outboxId,
      type: payload.channel,
      destination: payload.recipientId,
      subject: payload.subject || null,
      body: payload.body,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      createdAt: new Date().toISOString(),
    };

    devOutboxEntries.push(entry);

    // Log to console with formatting
    const emoji = payload.channel === 'EMAIL' ? '📧' : payload.channel === 'SMS' ? '📱' : '🔔';
    console.log(`\n${emoji} [${payload.channel}] To: ${payload.recipientId}`);
    if (payload.subject) console.log(`   Subject: ${payload.subject}`);
    console.log(`   ${payload.body}`);
    if (payload.metadata) {
      // Never log sensitive data
      const safeMeta = { ...payload.metadata };
      delete safeMeta.otp;
      delete safeMeta.hexCode;
      delete safeMeta.password;
      if (Object.keys(safeMeta).length > 0) {
        console.log(`   Meta: ${JSON.stringify(safeMeta)}`);
      }
    }
    console.log();
  }
}

export function getDevOutboxEntries(): OutboxEntry[] {
  return [...devOutboxEntries].reverse();
}

export function clearDevOutbox(): void {
  devOutboxEntries.length = 0;
  outboxId = 0;
}

// Singleton provider
const provider = new ConsoleNotificationProvider();

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  return provider.send(payload);
}

// ========================
// Notification Templates
// ========================

export function notifyRegistrationCredentials(
  citizenUid: string,
  email: string,
  password: string
): void {
  // NEVER log password in audit — but this is the dev outbox
  const body = `Welcome to Bhoomisetu! Your citizen ID: ${citizenUid}. Your initial password has been sent separately.`;
  provider.send({
    recipientId: email,
    recipientType: 'CITIZEN',
    channel: 'EMAIL',
    templateId: 'REGISTRATION_CREDENTIALS',
    subject: 'Welcome to Bhoomisetu — Your Registration is Complete',
    body,
  });

  // Password sent as separate message (sensitive)
  devOutboxEntries.push({
    id: ++outboxId,
    type: 'CREDENTIAL',
    destination: email,
    subject: 'Bhoomisetu — Your Initial Password',
    body: `Your initial password: ${password} — Please change it on first login.`,
    metadata: null,
    createdAt: new Date().toISOString(),
  });
}

export function notifyOTP(destination: string, otp: string, channel: 'EMAIL' | 'SMS'): void {
  devOutboxEntries.push({
    id: ++outboxId,
    type: 'OTP',
    destination,
    subject: 'Bhoomisetu Verification Code',
    body: `Your OTP is: ${otp}. Valid for 10 minutes.`,
    metadata: JSON.stringify({ otp }),
    createdAt: new Date().toISOString(),
  });

  const emoji = channel === 'EMAIL' ? '📧' : '📱';
  console.log(`\n${emoji} [OTP] To: ${destination} | Code: ${otp}\n`);
}

export function notifyHexCode(
  destination: string,
  hexCode: string,
  partyRole: 'SELLER' | 'BUYER',
  applicationUid: string
): void {
  devOutboxEntries.push({
    id: ++outboxId,
    type: 'HEX_CODE',
    destination,
    subject: `Bhoomisetu — Handshake Code for Application ${applicationUid}`,
    body: `Your ${partyRole} verification code: ${hexCode}. Present this at the Circle Office. Valid for 72 hours. DO NOT share this code.`,
    metadata: JSON.stringify({ hexCode, partyRole, applicationUid }),
    createdAt: new Date().toISOString(),
  });

  console.log(`\n🔐 [HEX CODE] To: ${destination} | Party: ${partyRole} | Code: ${hexCode} | App: ${applicationUid}\n`);
}

export function notifyTransferProposal(
  buyerEmail: string,
  sellerName: string,
  parcelUid: string
): void {
  provider.send({
    recipientId: buyerEmail,
    recipientType: 'CITIZEN',
    channel: 'EMAIL',
    templateId: 'TRANSFER_PROPOSAL',
    subject: 'Bhoomisetu — Land Transfer Proposal Received',
    body: `${sellerName} wishes to transfer parcel ${parcelUid} to you. Review and respond.`,
  });
}

export function notifyStatusChange(
  recipientId: string,
  recipientType: 'CITIZEN' | 'OFFICER',
  applicationUid: string,
  newStatus: string,
  message: string
): void {
  provider.send({
    recipientId,
    recipientType,
    channel: 'IN_APP',
    templateId: 'STATUS_CHANGE',
    subject: `Application ${applicationUid} — Status Update`,
    body: message,
    metadata: { applicationUid, newStatus },
  });
}
