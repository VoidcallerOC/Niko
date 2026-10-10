import { getSettings, logActivity, nowIso, putSettings, saveRevision } from '../../utils/admin/store'
import { applySettingsInput } from '../../utils/admin/validate'

export default defineEventHandler(async (event) => {
  const current = await getSettings()
  const next = applySettingsInput(current, await readBody(event), nowIso())
  await saveRevision('settings', 'site', current)
  await putSettings(next)
  await logActivity({ kind: 'settings', entity: 'settings', entityId: 'site', summary: 'Site settings saved' })
  return { settings: next }
})
