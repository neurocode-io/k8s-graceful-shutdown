/* eslint-disable @typescript-eslint/no-unused-vars */
import { IncomingMessage, ServerResponse } from 'http'

interface HealthHandlerOptions {
  /**
   * Health test
   * Returns true if test passed
   * Retuns false if test failed
   */
  test?: (req: IncomingMessage, res: ServerResponse) => boolean
  /**
   * Call back to be triggered if healthy
   */
  healthy: (req: IncomingMessage, res: ServerResponse) => void
  /**
   * Call back to be triggered if not heathy
   */
  notHealthy: (req: IncomingMessage, res: ServerResponse) => void
}

const hooks = new Map<(...args: any[]) => void, (...args: any[]) => void>()
const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'] as const

const addGracefulShutdownHook = (gracefulPeriodMs: number, gracefulShutdownCB: (...args: any[]) => void) => {
  const gracefulShutdownHook = () => {
    setTimeout(() => {
      gracefulShutdownCB()
    }, gracefulPeriodMs)
  }

  hooks.set(gracefulShutdownCB, gracefulShutdownHook)
  signals.forEach(signal => {
    process.on(signal, gracefulShutdownHook)
  })
}

const removeGracefulShutdownHook = (gracefulShutdownCB: (...args: any[]) => void) => {
  if (hooks.has(gracefulShutdownCB)) {
    const gracefulShutdownHook = hooks.get(gracefulShutdownCB)
    hooks.delete(gracefulShutdownCB)
    signals.forEach(signal => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.removeListener(signal, gracefulShutdownHook!)
    })
  }
}

const getHealthzHandler = (options: HealthHandlerOptions) => {
  if (!options.test) {
    options.test = (_req: IncomingMessage, _res: ServerResponse) => {
      return true
    }
  }
  signals.forEach(signal => {
    process.on(signal, () => {
      options.test = (_req: IncomingMessage, _res: ServerResponse) => {
        return false
      }
    })
  })

  return (req: IncomingMessage, res: ServerResponse) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (options.test!(req, res)) {
        options.healthy(req, res)
      } else {
        options.notHealthy(req, res)
      }
    } catch (e) {
      options.notHealthy(req, res)
    }
  }
}

export { addGracefulShutdownHook, removeGracefulShutdownHook, getHealthzHandler }
