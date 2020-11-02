# k8s-graceful-shutdown

![CI](https://github.com/NeuroCode-io/k8s-graceful-shutdown/workflows/CI/badge.svg?branch=master)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=alert_status)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=security_rating)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=NeuroCode-io_k8s-graceful-shutdown&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=NeuroCode-io_k8s-graceful-shutdown)

The library provides the resources to implement graceful shutdown with kubernetes.


## Problem description

When developing microservices in kubernetes, especially NodeJS microservices. We need to handle the termination signals
emitted by kubernets. The proper way of doing this is to:

1. Listen to SIGINT, SIGTERM
2. Upon receiving a signal, place the service in unhealthy mode (/health route should return a status code 4xx, 5xx)
3. Add a grace period before shutting down to allow kubernetes to take your application off the loadbalancer
4. Shutdown


The library makes the process mentioned above easy. Just register your healthHandler and add a graceful period


For example, using the Express framework:




Or using the Koi framework:

