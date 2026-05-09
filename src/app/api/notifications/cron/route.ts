import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';

const manualTriggerSchema = z.object({
  source: z.enum(['ui', 'cron']).optional().default('ui'),
});

const getBearerToken = (request: NextRequest) => request.headers.get('Authorization')?.split('Bearer ')[1];

const getCronSecret = (request: NextRequest) => request.headers.get('x-cron-secret');

const buildNotificationPayload = (role: string) => {
  switch (role) {
    case 'admin':
      return {
        title: 'Manual cron run completed',
        description: 'A manual cron trigger was executed from the notification cron console.',
        type: 'system' as const,
        link: '/admin/notification-center',
      };
    case 'business':
      return {
        title: 'Notification cron run completed',
        description: 'The manual cron endpoint created a notification for your business workspace.',
        type: 'system' as const,
        link: '/business/notifications',
      };
    case 'accounting_firm':
      return {
        title: 'Notification cron run completed',
        description: 'The manual cron endpoint created a notification for your accounting firm workspace.',
        type: 'system' as const,
        link: '/accounting-firm/notifications',
      };
    case 'individual':
    default:
      return {
        title: 'Notification cron run completed',
        description: 'The manual cron endpoint created a notification for your personal workspace.',
        type: 'system' as const,
        link: '/individual/notifications',
      };
  }
};

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/notifications/cron',
    mode: 'manual',
    autoRunEnabled: false,
    secretConfigured: Boolean(process.env.CRON_TRIGGER_SECRET),
    message: 'Manual cron endpoint is available. No automatic schedule is configured.',
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!ensureAdminInitialized()) {
      return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 500 });
    }

    const cronSecret = getCronSecret(request);
    const configuredSecret = process.env.CRON_TRIGGER_SECRET;
    const body = manualTriggerSchema.safeParse(await request.json().catch(() => ({})));

    if (!body.success) {
      return NextResponse.json({ error: 'Invalid input', issues: body.error.issues }, { status: 400 });
    }

    const db = admin.firestore();

    if (configuredSecret && cronSecret && cronSecret === configuredSecret) {
      return NextResponse.json({
        success: true,
        mode: 'manual-cron',
        autoRunEnabled: false,
        executedAt: new Date().toISOString(),
        message: 'Cron secret accepted. No global fan-out job is configured yet.',
      });
    }

    const idToken = getBearerToken(request);
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const userRef = db.collection('users').doc(decoded.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = String(userSnap.data()?.role ?? 'individual');
    const payload = buildNotificationPayload(role);

    if (role === 'admin') {
      await db.collection('admin_notifications').add({
        ...payload,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.collection('notifications').add({
        ...payload,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'manual-ui',
      autoRunEnabled: false,
      role,
      endpoint: '/api/notifications/cron',
      executedAt: new Date().toISOString(),
      notificationTarget: role === 'admin' ? 'admin_notifications' : `users/${decoded.uid}/notifications`,
    });
  } catch (error: any) {
    console.error('Manual cron notification error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}