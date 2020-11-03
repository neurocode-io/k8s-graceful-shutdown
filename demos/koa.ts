import { Context } from 'koa'
import Koa from 'koa'
import { addGracefulShutdownHook, getHealthContextHandler, shutdown } from '../lib/k8s-graceful-shutdown'

const app = new Koa()
const port = process.env.PORT || 3000
const server = app.listen(port, () => console.log(`App is running on http://localhost:${port}`))
server.close = shutdown(server)

/*
 * Health Check Demo
 */
const healthy = (ctx: Context) => {
  ctx.body = 'everything is great'
}

const notHealthy = (ctx: Context) => {
  ctx.body = 'oh no, something bad happened!'
  ctx.status = 503
}

let x = true

// alternating result whenever page is requested
const test = () => {
  const y = x
  x = !x
  return y
}

const healthCheck = getHealthContextHandler({ healthy, notHealthy, test })
app.use(healthCheck)

/*
 * Graceful Shutdown Demo
 */
const closeServers = () => {
  server.close()
}

const gracePeriodSec = 5*1000
addGracefulShutdownHook(gracePeriodSec, closeServers)
// removeGracefulShutdownHook(closeServers)
server.addListener('close', () => console.log('shutdown after graceful period'))
