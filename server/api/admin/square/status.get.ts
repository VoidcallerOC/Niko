import { squareStatus } from '../../../utils/admin/square'
import { getSquareState } from '../../../utils/admin/store'

export default defineEventHandler(async () => ({ ...squareStatus(), state: await getSquareState() }))
