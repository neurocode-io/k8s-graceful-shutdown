import { app } from './app'
import { addGracefulShutdownHook /*, removeGracefulShutdownHook*/ } from '../../../lib/k8s-graceful-shutdown'

const server = app.listen(app.get('port'), () => {
  console.log('App is running on http://localhost:%d', app.get('port'))
})

const closeServers = () => {
  server.close()
}

addGracefulShutdownHook(3000, closeServers)
// removeGracefulShutdownHook(closeServers)
server.addListener('close', () => console.log('shutdown after graceful period'))

export { server }
