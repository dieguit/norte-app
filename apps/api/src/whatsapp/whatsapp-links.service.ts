import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database, Transaction } from '../database/database.types';
import { whatsappLinks, whatsappLinkTokens } from './whatsapp.schema';

const TOKEN_TTL_MS = 15 * 60 * 1000;

const CONFLICT_MESSAGES: Record<string, string> = {
  whatsapp_links_user_id_unique: 'Tu cuenta ya tiene otro WhatsApp vinculado',
  whatsapp_links_pkey: 'Este WhatsApp ya está vinculado a otra cuenta',
};

function handleClaimConflict(error: unknown): never {
  const pgErr =
    (error as { cause?: { code?: string; constraint?: string } })?.cause ??
    (error as { code?: string; constraint?: string });
  const message =
    pgErr?.code === '23505' && pgErr.constraint
      ? CONFLICT_MESSAGES[pgErr.constraint]
      : null;
  if (message) throw new ConflictException(message);
  throw error;
}

async function assertCanLink(
  tx: Transaction,
  jid: string,
  userId: string,
): Promise<boolean> {
  const [existingUserLink] = await tx
    .select({ jid: whatsappLinks.jid })
    .from(whatsappLinks)
    .where(eq(whatsappLinks.userId, userId));
  if (existingUserLink && existingUserLink.jid !== jid) {
    throw new ConflictException('Tu cuenta ya tiene otro WhatsApp vinculado');
  }

  const [existingJidLink] = await tx
    .select({ userId: whatsappLinks.userId })
    .from(whatsappLinks)
    .where(eq(whatsappLinks.jid, jid));
  if (existingJidLink && existingJidLink.userId !== userId) {
    throw new ConflictException(
      'Este WhatsApp ya está vinculado a otra cuenta',
    );
  }

  return !existingJidLink;
}

@Injectable()
export class WhatsappLinksService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findUserByJid(jid: string): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: whatsappLinks.userId })
      .from(whatsappLinks)
      .where(eq(whatsappLinks.jid, jid));
    return row?.userId ?? null;
  }

  // Reusing the live token doubles as per-sender rate limiting.
  async issueToken(jid: string): Promise<string> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${jid}))`);
      const [live] = await tx
        .select({ token: whatsappLinkTokens.token })
        .from(whatsappLinkTokens)
        .where(
          and(
            eq(whatsappLinkTokens.jid, jid),
            isNull(whatsappLinkTokens.usedAt),
            gt(whatsappLinkTokens.expiresAt, new Date()),
          ),
        );
      if (live) return live.token;
      const token = randomBytes(32).toString('base64url');
      await tx.insert(whatsappLinkTokens).values({
        token,
        jid,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      });
      return token;
    });
  }

  // The channel thread keeps its first owner's memory, so a number can't move accounts without an unlink flow.
  async claim(
    token: string,
    userId: string,
  ): Promise<{ jid: string; alreadyClaimed: boolean }> {
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(whatsappLinkTokens)
          .where(eq(whatsappLinkTokens.token, token))
          .for('update');
        if (!row) throw new NotFoundException('Link inválido');

        if (row.usedAt) {
          const [current] = await tx
            .select({ userId: whatsappLinks.userId })
            .from(whatsappLinks)
            .where(eq(whatsappLinks.jid, row.jid));
          if (current?.userId === userId) {
            return { jid: row.jid, alreadyClaimed: true };
          }
          throw new GoneException('Link vencido');
        }

        if (row.expiresAt <= new Date())
          throw new GoneException('Link vencido');

        const needsInsert = await assertCanLink(tx, row.jid, userId);
        if (needsInsert) {
          await tx.insert(whatsappLinks).values({ jid: row.jid, userId });
        }
        await tx
          .update(whatsappLinkTokens)
          .set({ usedAt: new Date() })
          .where(eq(whatsappLinkTokens.token, token));
        return { jid: row.jid, alreadyClaimed: false };
      });
    } catch (error) {
      handleClaimConflict(error);
    }
  }
}
