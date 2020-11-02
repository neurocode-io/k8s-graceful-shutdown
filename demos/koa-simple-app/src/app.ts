import { Context } from 'koa'
import * as Koa from 'koa'
import { addGracefulShutdownHook, getHealthContextHandler } from '../../../lib/k8s-graceful-shutdown'

const app = new Koa()
const port = process.env.PORT || 3000
const server = app.listen(port, () => console.log('App is running on http://localhost:%d', port))

/*
 * Health Check Demo
 */
const healthy = (ctx: Context) => {
  ctx.body = 'everything is great'
}

const notHealthy = (ctx: Context) => {
  ctx.body = 'oh no, something bad happened!'
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

addGracefulShutdownHook(3000, closeServers)
// removeGracefulShutdownHook(closeServers)
server.addListener('close', () => console.log('shutdown after graceful period'))
