import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { loginAdminServer, getAdminSessionServer } from './auth.server'
import {
  listAdminResultsServer,
  getAdminResultFilesServer,
  listAdminCsvRowsServer,
  getAdminCsvRowServer,
  getAdminResultDetailsServer,
  saveAdminReportServer,
  setAdminReportSentServer,
} from './admin.server'
import { reportSchema } from './report'

export const loginAdmin = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ username: z.string(), password: z.string() }).parse(input))
  .handler(({ data }) => loginAdminServer(data))

export const getAdminSession = createServerFn({ method: 'GET' })
  .handler(getAdminSessionServer)

export const listAdminResults = createServerFn({ method: 'GET' })
  .handler(listAdminResultsServer)

export const getAdminResultFiles = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid() }).parse(input))
  .handler(({ data }) => getAdminResultFilesServer(data.deviceId))

export const listAdminCsvRows = createServerFn({ method: 'GET' })
  .handler(listAdminCsvRowsServer)

export const getAdminCsvRow = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid() }).parse(input))
  .handler(({ data }) => getAdminCsvRowServer(data.deviceId))

export const getAdminResultDetails = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid() }).parse(input))
  .handler(({ data }) => getAdminResultDetailsServer(data.deviceId))

export const saveAdminReport = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid(), report: reportSchema }).parse(input))
  .handler(({ data }) => saveAdminReportServer(data.deviceId, data.report))

export const setAdminReportSent = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid(), sent: z.boolean() }).parse(input))
  .handler(({ data }) => setAdminReportSentServer(data.deviceId, data.sent))
