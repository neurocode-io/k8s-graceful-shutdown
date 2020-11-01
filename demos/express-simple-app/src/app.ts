import { Response, Request } from 'express'
import * as express from 'express'
import { getHealthzHandler } from '../../../lib/k8s-graceful-shutdown'

const app = express()
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

const healthCheck = getHealthzHandler({ healthy, notHealthy, test })

app.set('port', process.env.PORT || 3000)

app.get('/', healthCheck)

export { app }
