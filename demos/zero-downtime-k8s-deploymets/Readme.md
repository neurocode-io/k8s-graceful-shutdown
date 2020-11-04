# Zero downtime deployment test on k8s


Get the load binary:

```
go get fortio
```

Change the host in deploy/ingress.yaml

afterwards apply to your cluster:

```
kubectl apply -f deploy/
```

Create load:

```
fortio load -a -c 50 -qps 500 -t 120s <yourUrl>/health
```

In another terminal trigger an application update by updating the image from 1 to 2

Expected outcome should be only 200 HTTP responses and no 500 (service unavailable)

```
Jitter: false
Code 200 : 30000 (100.0 %)
Response Header Sizes : count 30000 avg 203.95 +/- 0.4975 min 199 max 204 sum 6118500
Response Body/Total Sizes : count 30000 avg 228.95 +/- 0.4975 min 224 max 229 sum 6868500
All done 30000 calls (plus 50 warmup) 33.011 ms avg, 491.0 qps
Successfully wrote 5130 bytes of Json data to 2020-11-04-144427_k8s_graceful_shutdown_demo_prod_azure_vaillant_group_com_health_NeuroCode.json
```
