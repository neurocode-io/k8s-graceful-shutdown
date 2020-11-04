const express = require('express')
const { addGracefulShutdownHook, getHealthHandler, shutdown } = require('@neurocode.io/k8s-graceful-shutdown')

const app = express()
app.disable('x-powered-by')
const port = process.env.PORT || 8080
const server = app.listen(port, () => console.log(`App is running on http://localhost:${port}`))
server.close = shutdown(server)


const healthy = (req, res) => {
  res.send('everything is all right!!')
}


const healthCheck = getHealthHandler({ healthy })
app.get('/health', healthCheck)

/*
 * Graceful Shutdown Demo
 */

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))

const asyncOperation = async () => sleep(3000).then(() => console.log('Async op done'))

const closeServers = async () => {
  await asyncOperation() // can be any async operation such as mongo db close, or send a slack message ;)
  server.close()
}

const gracePeriodSec = 10 * 1000
addGracefulShutdownHook(gracePeriodSec, closeServers)

server.addListener('close', () => console.log('shutdown after graceful period'))
