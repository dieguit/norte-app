import { users } from '../users/users.schema';
import { whatsappAuthState } from '../whatsapp/whatsapp.schema';

export const schema = {
  users,
  whatsappAuthState,
};

export type Schema = typeof schema;
export { users, whatsappAuthState };
