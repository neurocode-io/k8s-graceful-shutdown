import { Response, Request } from 'express'
import express from 'express'
import { addGracefulShutdownHook, getHealthHandler, shutdown } from '../lib/k8s-graceful-shutdown'

const app = express()
app.disable('x-powered-by')
const port = process.env.PORT || 3000
const server = app.listen(port, () => console.log(`App is running on http://localhost:${port}`))
server.close = shutdown(server)

/*
 * Health Check Demo
 */
const healthy = (req: Request, res: Response) => {
  res.send('everything is great')
}

const notHealthy = (req: Request, res: Response) => {
  res.status(503).send('oh no, something bad happened!')
}

let x = true

// alternating result whenever page is requested
const test = async () => {
  const y = x
  x = !x
  return y
}

const healthCheck = getHealthHandler({ healthy, notHealthy, test })
app.get('/health', healthCheck)

/*
 * Graceful Shutdown Demo
 */

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

const asyncOperation = async () => sleep(3000).then(() => console.log('Async op done'))

const closeServers = async () => {
  await asyncOperation() // can be any async operation such as mongo db close, or send a slack message ;)
  server.close()
}

const gracePeriodSec = 5 * 1000
addGracefulShutdownHook(gracePeriodSec, closeServers)

// removeGracefulShutdownHook(closeServers)
server.addListener('close', () => console.log('shutdown after graceful period'))
