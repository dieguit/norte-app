import handler from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server.js'

export default {
  fetch(req: Request): Promise<Response> {
    // Pass the original request: the router's rewrite handles delocalization (avoids redirect loops).
    return paraglideMiddleware(req, () => handler.fetch(req), { redirect: 'navigation' })
  },
}
