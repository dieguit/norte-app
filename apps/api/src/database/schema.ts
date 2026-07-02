import { users } from '../users/users.schema';

export const schema = {
  users,
};

export type Schema = typeof schema;
export { users };
