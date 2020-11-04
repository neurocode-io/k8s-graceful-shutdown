import http, { IncomingMessage, ServerResponse } from 'http'
import https from 'https'
import { Http2ServerRequest, Http2ServerResponse } from 'http2'

interface HandlerOptions {
  /**
   * Health test callback
   * Returns true if test passes
   * Retuns false if test failes
   */
  test?: () => boolean | Promise<boolean>
}
interface RequestResponseHandlerOptions extends HandlerOptions {
  /**
   * Callback to be triggered if healthy
   */
  healthy: (
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse
  ) => void | Promise<void>
  /**
   * Callback to be triggered if not heathy
   */
  notHealthy: (
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse
  ) => void | Promise<void>
}

interface ContextHandlerOptions extends HandlerOptions {
  /**
   * Callback to be triggered if healthy
   */
  healthy: (context: any) => void | Promise<void>
  /**
   * Callback to be triggered if not heathy
   */
  notHealthy: (context: any) => void | Promise<void>
}

const defaultTest = () => true

const hooks = new Map<(...args: any[]) => void, (...args: any[]) => void>()
const signals = ['SIGINT', 'SIGTERM'] as const
/**
 *  When an exit signal is received, the provided shutdown
 *  callback will be called after the graceful period (ms)
 */
const addGracefulShutdownHook = (gracefulPeriodMs: number, gracefulShutdownCB: (...args: any[]) => void) => {
  const gracefulShutdownHook = () => {
    setTimeout(() => {
      gracefulShutdownCB()
    }, gracefulPeriodMs)
  }

  hooks.set(gracefulShutdownCB, gracefulShutdownHook)
  signals.forEach((signal) => {
    process.once(signal, gracefulShutdownHook)
  })
}
/**
 *  Unhooks the provided graceful shutdown hook
 */
const removeGracefulShutdownHook = (gracefulShutdownCB: (...args: any[]) => void) => {
  const gracefuShutdownHook = hooks.get(gracefulShutdownCB)
  if (!gracefuShutdownHook) return

  hooks.delete(gracefulShutdownCB)
  signals.forEach((signal) => {
    process.removeListener(signal, gracefuShutdownHook)
  })
}
/**
 * returns a health check fn(req, res) which:
 * 1) Calls the "healthy" callback if both the provided "test"
 * callback resolves to true, and no exit signals were received.
 * 2) Calls the "notHealthy" call back if either the provided "test"
 * callback resolves to false, or an exit signal was received.
 */
const getHealthHandler = (options: RequestResponseHandlerOptions) => {
  signals.forEach((signal) => {
    process.once(signal, () => {
      options.test = () => false
    })
  })

  return (req: IncomingMessage | Http2ServerRequest, res: ServerResponse | Http2ServerResponse) => {
    options.test = options.test ?? defaultTest
    return Promise.resolve(options.test())
      .then((result: boolean) => (result ? options.healthy(req, res) : options.notHealthy(req, res)))
      .catch((e) => {
        try {
          options.notHealthy(req, res)
        } catch {
          console.error(e.message)
        }
      })
  }
}

/**
 * returns a health check fn(ctx) which:
 * 1) Calls the "healthy" callback if both the provided "test"
 * callback resolves to true, and no exit signals were received.
 * 2) Calls the "notHealthy" call back if either the provided "test"
 * callback resolves to false, or an exit signal was received.
 */
const getHealthContextHandler = (options: ContextHandlerOptions) => {
  signals.forEach((signal) => {
    process.once(signal, () => {
      options.test = () => false
    })
  })

  return (context: any) => {
    options.test = options.test ?? defaultTest
    return Promise.resolve(options.test())
      .then((result: boolean) => (result ? options.healthy(context) : options.notHealthy(context)))
      .catch((e) => {
        try {
          options.notHealthy(context)
        } catch {
          console.error(e.message)
        }
      })
  }
}

function shutdown<T extends http.Server>(server: T) {
  const connections = new Map()
  const closeFn = server.close.bind(server)

  function onConnection(socket: any) {
    connections.set(socket, 0)
    socket.once('close', () => connections.delete(socket))
  }

  if (server instanceof https.Server) {
    server.on('secureConnection', onConnection)
  } else {
    server.on('connection', onConnection)
  }

  return (callback?: (err: Error) => void) => {
    connections.forEach((_, socket) => socket.destroy())
    return closeFn(callback)
  }
}

export { addGracefulShutdownHook, removeGracefulShutdownHook, getHealthHandler, getHealthContextHandler, shutdown }
