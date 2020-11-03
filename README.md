# k8s-graceful-shutdown

![CI](https://github.com/NeuroCode-io/k8s-graceful-shutdown/workflows/CI/badge.svg?branch=master)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=alert_status)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=security_rating)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)

The library provides the resources to implement graceful shutdown with kubernetes.


## Problem description

When running microservices in kubernetes. We need to handle the termination signals
emitted by kubernets. The proper way of doing this is to:

1. Listen to SIGINT, SIGTERM
2. Upon receiving a signal, place the service in unhealthy mode (/health route should return a status code 4xx, 5xx)
3. Add a grace period before shutting down to allow kubernetes to take your application off the loadbalancer
4. Close the server and any open connections
5. Shutdown


The library makes the process mentioned above easy. Just register your healthHandler and add a grace period. 

Note that your grace period **must be** lower than the grace period defiend in kubernetes!

## Sample using the express framework

For example, using the Express framework:

```ts
import { Response, Request } from 'express'
import express from 'express'
import { addGracefulShutdownHook, getHealthHandler, shutdown } from '../lib/k8s-graceful-shutdown'

const app = express()
app.disable('x-powered-by')
const port = process.env.PORT || 3000
const server = app.listen(port, () => console.log(`App is running on http://localhost:${port}`))

// Patch NodeJS server close function with a proper close that works as you might expect closing keep-alive connections for you!
// Read here for more info https://github.com/nodejs/node/issues/2642
server.close = shutdown(server)

const healthy = (req: Request, res: Response) => {
  res.send('everything is great')
}

const notHealthy = (req: Request, res: Response) => {
  res.status(503).send('oh no, something bad happened!')
}


const healthTest = async () => {
  // this is optional
  // you can use it to conduct healthChecks
  return true
}

const healthCheck = getHealthHandler({ healthy, notHealthy, test: healthTest })
app.get('/health', healthCheck)

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

const asyncOperation = async () => sleep(3000).then(() => console.log('Async op done'))

const closeServers = async () => {
  await asyncOperation() // can be any async operation such as mongo db close, or send a slack message ;)
  server.close()
}

const gracePeriodSec = 5*1000
addGracefulShutdownHook(gracePeriodSec, closeServers)

server.addListener('close', () => console.log('shutdown after graceful period'))
```


If you use the Koa framework check out the **demos/** folder. We have an Koa example there as well.



## How does it work?

An example of how the fraceful shutdown workflow works:

1. Kubernetes sends the Pod the SIGTERM signal. This happens when scaling down a Pod by hand or automatically during rolling deployments
2. This library receives the SIGTERM signal and calls your unHealthHandler. You handler should return a 400 or 500 http status code (throw an error?) which will indicate that the pod shouldn't receive any traffic anymore. NOTE that this step is optional (check next step)
3. The library waits for the specified **grace time** to initiate the shutdown of the application. The grace time should be between 5-20 seconds. The grace time is needed for the kubernetes endpoint controller to remove the pod from the list of valid endpoints, in turn removing the pod from the Service (pod's ip address from iptables an ALL nodes).
4. Kubernetes removes the Pod from the Service
5. The library calls all your registered shutdown hooks
6. After the configured grace period the application will properly shutdown using our shutdown mechanism that you probably [expected to work by default](https://github.com/nodejs/node/issues/2642) but does not in NodeJS http server, express and Koa
   
