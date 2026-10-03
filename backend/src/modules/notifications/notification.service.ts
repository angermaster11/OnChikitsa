import { Types } from 'mongoose';
import { logger } from '../../config/logger';
import { sendPush } from '../../config/firebase';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { Appointment } from '../appointments/appointment.model';
import type { AuthActor } from '../../types/auth';
import { deviceTokenRepository } from './deviceToken.repository';
import { Notification } from './notification.model';
import { Broadcast, type BroadcastAudienceType, type BroadcastDoc } from './broadcast.model';

/** A notification as the patient app consumes it (events + broadcasts, uniform). */
export interface FeedItem {
  id: string;
  type: 'booking' | 'reminder' | 'admin';
  title: string;
  body: string;
  data?: Record<string, string>;
  createdAt: Date;
}

type AppointmentEvent = 'accepted' | 'arrived' | 'completed';

function composeAppointmentEvent(clinic: string, event: AppointmentEvent) {
  switch (event) {
    case 'accepted':
      return { title: 'Booking confirmed', body: `Your appointment at ${clinic} is confirmed.` };
    case 'arrived':
      return { title: 'You’re checked in', body: `${clinic} has marked you as arrived.` };
    case 'completed':
      return { title: 'Visit completed', body: `Your visit at ${clinic} is complete — tap to rate it.` };
  }
}

export const notificationService = {
  /** Write an in-app row for one user and push it to their devices. Best-effort —
   *  never throws (callers fire it off the response path). Prunes dead tokens. */
  async notifyUser(
    userId: string,
    msg: { type: FeedItem['type']; title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    try {
      await Notification.create({
        userId: new Types.ObjectId(userId),
        type: msg.type,
        title: msg.title,
        body: msg.body,
        data: msg.data,
      });
    } catch (err) {
      logger.error({ err, userId }, 'Failed to write notification row');
    }
    try {
      const tokens = await deviceTokenRepository.tokensForOwner('USER', userId);
      if (tokens.length) {
        const { invalidTokens } = await sendPush(tokens, { title: msg.title, body: msg.body, data: msg.data });
        if (invalidTokens.length) await deviceTokenRepository.prune(invalidTokens);
      }
    } catch (err) {
      logger.error({ err, userId }, 'Failed to push notification');
    }
  },

  /** Compose + deliver an appointment-lifecycle notification to the patient. */
  async notifyAppointmentEvent(
    appt: { _id: Types.ObjectId; userId: Types.ObjectId; clinicName?: string },
    event: AppointmentEvent,
  ): Promise<void> {
    const { title, body } = composeAppointmentEvent(appt.clinicName || 'the clinic', event);
    await this.notifyUser(String(appt.userId), {
      type: 'booking',
      title,
      body,
      data: { route: '/bookings', appointmentId: String(appt._id), event },
    });
  },

  /** The patient's notification feed: personal rows + broadcasts targeting them. */
  async listForUser(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<{ items: FeedItem[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    if (!Types.ObjectId.isValid(userId)) {
      return { items: [], pagination: buildPaginationMeta(p, l, 0) };
    }
    const uid = new Types.ObjectId(userId);
    const CAP = 200; // merge window — plenty for an inbox

    const clinicIds = (await Appointment.distinct('clinicId', { userId: uid })) as Types.ObjectId[];
    const [rows, casts] = await Promise.all([
      Notification.find({ userId: uid }).sort({ createdAt: -1 }).limit(CAP).lean(),
      Broadcast.find({
        $or: [
          { audienceType: 'ALL_PATIENTS' },
          ...(clinicIds.length ? [{ audienceType: 'CLINIC_PATIENTS', clinicId: { $in: clinicIds } }] : []),
        ],
      })
        .sort({ createdAt: -1 })
        .limit(CAP)
        .lean(),
    ]);

    const items: FeedItem[] = [
      ...rows.map((r) => ({
        id: String(r._id),
        type: r.type as FeedItem['type'],
        title: r.title,
        body: r.body,
        data: r.data as Record<string, string> | undefined,
        createdAt: r.createdAt,
      })),
      ...casts.map((b) => ({
        id: `bc-${String(b._id)}`,
        type: 'admin' as const,
        title: b.title,
        body: b.body,
        data: { route: '/alerts' },
        createdAt: b.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    return { items: items.slice(skip, skip + l), pagination: buildPaginationMeta(p, l, total) };
  },

  /** Admin broadcast: resolve the audience to device tokens, push, and record it. */
  async sendBroadcast(
    actor: AuthActor,
    input: { title: string; body: string; audienceType: BroadcastAudienceType; clinicId?: string },
  ): Promise<{ broadcast: BroadcastDoc; sentCount: number }> {
    let tokens: string[] = [];
    if (input.audienceType === 'ALL_PATIENTS') {
      tokens = await deviceTokenRepository.allTokens('USER');
    } else if (input.audienceType === 'ALL_CLINICS') {
      tokens = await deviceTokenRepository.allTokens('CLINIC');
    } else if (input.audienceType === 'CLINIC_PATIENTS' && input.clinicId && Types.ObjectId.isValid(input.clinicId)) {
      const userIds = (
        await Appointment.distinct('userId', { clinicId: new Types.ObjectId(input.clinicId) })
      ).map((id) => String(id));
      tokens = await deviceTokenRepository.tokensForOwners('USER', userIds);
    }
    tokens = [...new Set(tokens)];

    if (tokens.length) {
      const { invalidTokens } = await sendPush(tokens, {
        title: input.title,
        body: input.body,
        data: { route: '/alerts', kind: 'broadcast' },
      });
      if (invalidTokens.length) await deviceTokenRepository.prune(invalidTokens);
    }

    const broadcast = await Broadcast.create({
      title: input.title,
      body: input.body,
      audienceType: input.audienceType,
      clinicId: input.clinicId ? new Types.ObjectId(input.clinicId) : null,
      sentBy: new Types.ObjectId(actor.id),
      sentCount: tokens.length,
    });
    return { broadcast, sentCount: tokens.length };
  },

  /** Admin: broadcast history, newest first. */
  async listBroadcasts(
    page?: number,
    limit?: number,
  ): Promise<{ items: BroadcastDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const [items, total] = await Promise.all([
      Broadcast.find().sort({ createdAt: -1 }).skip(skip).limit(l).lean<BroadcastDoc[]>(),
      Broadcast.countDocuments(),
    ]);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },
};
