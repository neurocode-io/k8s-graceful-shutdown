import { Response, Request } from 'express'
import * as express from 'express'
import { addGracefulShutdownHook, getHealthHandler } from '../../../lib/k8s-graceful-shutdown'

const app = express()
app.disable("x-powered-by")
const port = process.env.PORT || 3000
const server = app.listen(app.get('port'), () => console.log(`App is running on http://localhost:${port}`))

/*
 * Health Check Demo
 */
const healthy = (req: Request, res: Response) => {
  res.send('everything is great')
}

const notHealthy = (req: Request, res: Response) => {
  res.send('oh no, something bad happened!')
}

let x = true

// alternating result whenever page is requested
const test = () => {
  const y = x
  x = !x
  return y
}

const healthCheck = getHealthHandler({ healthy, notHealthy, test })
app.get('/', healthCheck)

/*
 * Graceful Shutdown Demo
 */
const closeServers = () => {
  server.close()
}

addGracefulShutdownHook(3000, closeServers)
// removeGracefulShutdownHook(closeServers)
server.addListener('close', () => console.log('shutdown after graceful period'))
