import { IncomingMessage, ServerResponse } from 'http'

interface HealthHandlerOptions {
  /**
   * Health test callback
   * Returns true if test passes
   * Retuns false if test failes
   */
  test?: () => boolean | Promise<boolean>
  /**
   * Callback to be triggered if healthy
   */
  healthy: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  /**
   * Callback to be triggered if not heathy
   */
  notHealthy: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
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
    process.on(signal, gracefulShutdownHook)
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
 * returns a health check function which:
 * 1) Calls the "healthy" callback if both the provided "test"
 * callback resolves to true, and no exit signals were received.
 * 2) Calls the "notHealthy" call back if either the provided "test"
 * callback resolves to false, or an exit signal was received.
 */
const getHealthzHandler = (options: HealthHandlerOptions) => {
  signals.forEach((signal) => {
    process.on(signal, () => {
      options.test = () => false
    })
  })

  return (req: any, res: any) => {
    options.test = options.test ?? defaultTest
    return Promise.resolve(options.test())
      .then((result: boolean) => (result ? options.healthy(req, res) : options.notHealthy(req, res)))
      .catch(() => options.notHealthy(req, res))
  }
}

export { addGracefulShutdownHook, removeGracefulShutdownHook, getHealthzHandler }
