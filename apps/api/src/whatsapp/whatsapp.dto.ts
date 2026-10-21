import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class WhatsappLinkTokenPathDto extends createZodDto(
  z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }),
) {}
