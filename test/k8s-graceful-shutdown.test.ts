import assert from 'assert'
import { addGracefulShutdownHook, removeGracefulShutdownHook, getHealthzHandler } from '../lib/k8s-graceful-shutdown'
import { setTimeout } from 'timers'
import { IncomingMessage, ServerResponse } from 'http'
import { Socket } from 'net'

let callbackCalled: boolean
let health: string
let healthzCheck: (req: IncomingMessage, res: ServerResponse) => Promise<void>

const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'] as const
const req = new IncomingMessage(new Socket())
const res = new ServerResponse(req)

const healthyCB = () => {
  health = 'OK'
}

const notHealthyCB = () => {
  health = 'not OK'
}

const testCallback = () => {
  callbackCalled = true
}

describe('get healthz handler', () => {
  beforeEach(() => {
    health = 'test'
  })

  it('health check should return healthy for no test', async () => {
    healthzCheck = getHealthzHandler({ healthy: healthyCB, notHealthy: notHealthyCB })
    await healthzCheck(req, res)
    assert.strictEqual(health, 'OK')
  })

  it('health check should return healthy for succeeding test', async () => {
    healthzCheck = getHealthzHandler({
      healthy: healthyCB,
      notHealthy: notHealthyCB,
      test: () => {
        return true
      },
    })
    await healthzCheck(req, res)
    assert.strictEqual(health, 'OK')
  })
  it('health check should return healthy failing test', async () => {
    health = 'test'

    healthzCheck = getHealthzHandler({
      healthy: healthyCB,
      notHealthy: notHealthyCB,
      test: () => {
        return false
      },
    })
    await healthzCheck(req, res)
    assert.strictEqual(health, 'not OK')
  })
})

describe('exit signals test', async () => {
  process.once('beforeExit', () => {
    process.stdin.resume()
  })

  before(() => {
    addGracefulShutdownHook(0, testCallback)
    callbackCalled = false
    health = 'test'
  })

  afterEach(() => {
    callbackCalled = false
    health = 'test'
  })

  signals.forEach((signal) => {
    it(`it should add graceful shutdown hook on exit signal: ${signal}`, (done) => {
      healthzCheck = getHealthzHandler({
        healthy: healthyCB,
        notHealthy: notHealthyCB,
        test: () => {
          return true
        },
      })
      healthzCheck(req, res).then(() => {
        assert.strictEqual(health, 'OK')
      })

      process.once(signal, () => {
        setTimeout(() => {
          assert.strictEqual(callbackCalled, true)
          healthzCheck(req, res).then(() => {
            assert.strictEqual(health, 'not OK')
          })
          done()
        }, 100)
      })

      process.kill(process.pid, signal)
    })
  })
})

describe('remove graceful shutdown hooks', () => {
  before(() => {
    removeGracefulShutdownHook(testCallback)
  })

  signals.forEach((signal) => {
    it(`it should remove graceful shutdown hook on exit signal: ${signal}`, (done) => {
      process.once(signal, () => {
        setTimeout(() => {
          assert.strictEqual(callbackCalled, false)
          done()
        }, 100)
      })

      process.kill(process.pid, signal)
    })
  })

  it('removeGracefulShutdownHook should not throw when an unknown callback is provided', () => {
    assert.doesNotThrow(() => {
      removeGracefulShutdownHook(testCallback)
    })

    assert.doesNotThrow(() => {
      removeGracefulShutdownHook(() => {
        throw new Error('should not throw')
      })
    })
  })
})
