import { previewSync, squareConfigured } from '../../../utils/admin/square'
import { getSquareState, putSquareState } from '../../../utils/admin/store'

export default defineEventHandler(async () => {
  if (!squareConfigured()) throw createError({ statusCode: 503, statusMessage: 'Square is not connected.' })
  try {
    return await previewSync()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Square preview failed'
    await putSquareState({ ...(await getSquareState()), lastError: message })
    throw error
  }
})
