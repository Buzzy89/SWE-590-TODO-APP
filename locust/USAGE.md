# 🚀 Locust Load Testing - Kullanım Kılavuzu

## ⚡ Hızlı Başlangıç

### 1. Kurulum
```bash
cd locust
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Locust Web UI ile Test (👑 Recommended)
```bash
source venv/bin/activate
locust -f locustfile.py --host http://34.22.249.41:30080
```

Sonra tarayıcıda http://localhost:8089 adresine gidin:
- **Number of users**: 20-50 (başlangıç için)
- **Spawn rate**: 5-10 users/second
- **Run time**: 5m (300s)

**👀 Canlı Monitoring için:**
- **Statistics** tab'ı: Real-time request stats
- **Charts** tab'ı: Response time graphs
- **Failures** tab'ı: Error analysis
- **Logs** tab'ı: Detailed logs

### 3. Headless Test (Command Line)
```bash
# 10 kullanıcı, 2/saniye spawn, 1 dakika
source venv/bin/activate
locust -f locustfile.py --host http://34.22.249.41:30080 -u 10 -r 2 -t 60s --headless --only-summary
```

## 🎯 HPA Scaling Testleri

### Otomatik Script ile
```bash
# Default: 50 user, 10/sec spawn, 5 dakika
./hpa-test.sh

# Özelleştirilmiş
./hpa-test.sh 100 20 600  # 100 user, 20/sec spawn, 10 dakika
```

### Manuel HPA Test
```bash
source venv/bin/activate

# 1. Normal load test
locust -f locustfile.py --host http://34.22.249.41:30080 -u 50 -r 10 -t 300s --headless --only-summary

# 2. CPU yoğun test (daha hızlı scaling için)
locust -f locustfile.py CPUIntensiveUser --host http://34.22.249.41:30081 -u 30 -r 5 -t 300s --headless --only-summary
```

## 📊 Test Senaryoları

### 1. Realistic User Flow (TodoAppUser)
- ✅ User registration/login
- ✅ Dashboard viewing  
- ✅ Todo CRUD operations
- ✅ AI insights integration
- ✅ Token verification

### 2. CPU Intensive Load (CPUIntensiveUser)
- ✅ High-frequency API calls
- ✅ Auth service stress testing
- ✅ Todo service stress testing 
- ✅ HPA trigger optimization

## 🔍 Monitoring HPA Scaling

Test çalıştırırken başka terminal'de:

```bash
# HPA durumunu sürekli izle
watch kubectl get hpa -n todo-app

# Pod scaling'ini izle  
watch kubectl get pods -n todo-app

# CPU metrics
kubectl top pods -n todo-app
```

## 🎯 Test Targets

### Current Production URLs:
- **Frontend**: http://34.22.249.41:30080
- **Auth API**: http://34.22.249.41:30081  
- **Todo API**: http://34.22.249.41:30082
- **AI Insights**: https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app

### Expected Performance:
- **Response Time**: < 200ms (p95)
- **Success Rate**: > 99%
- **HPA Trigger**: 50% CPU
- **Scale Range**: 1-5 pods

## 🚨 Best Practices

### Load Testing Guidelines:
```bash
# Başlangıç seviyesi (ilk test)
-u 10 -r 2 -t 60s

# Orta seviye (normal kullanım)
-u 25 -r 5 -t 300s

# Yüksek seviye (stress test)
-u 50 -r 10 -t 600s

# Ekstrem seviye (HPA trigger)
-u 100 -r 20 -t 300s
```

### Rate Limiting removed:
✅ Auth service rate limiting devre dışı
✅ Todo service rate limiting devre dışı
✅ Maksimum throughput için optimize edildi

### Error Handling:
- **409 Conflict**: Normal (user already exists)
- **404 Logout**: Normal (endpoint yok)
- **401 Unauthorized**: Data validation problemi
- **429 Too Many Requests**: Rate limiting (çözüldü)

## 🔧 Troubleshooting

### Common Issues:

1. **Username validation error**:
   - ✅ Çözüldü: Alphanumeric only usernames

2. **Network timeouts**:
   ```bash
   # Reduce spawn rate: -r 2 instead of -r 10
   # Reduce concurrent users: -u 10 instead of -u 50
   ```

3. **Memory issues**:
   ```bash
   # HPA scaling devreye girerse normal
   kubectl get hpa -n todo-app
   ```

## 📈 Success Metrics

### ✅ Current Achievement:
- **Success Rate**: 99.58%
- **Response Time**: p95 < 160ms  
- **HPA Scaling**: ✅ Working (1→3 pods)
- **Throughput**: 7.88 req/s (with 5 users)
- **Zero Rate Limiting**: ✅ Removed

### 🎯 Scale Test Results:
```
Auth Service: 28% CPU → 3 pods
Todo Service: 8% CPU → 3 pods
Threshold: 50% CPU
Max pods: 5
```

## 📋 Test Checklist

Before running load tests:

- [ ] All pods are running: `kubectl get pods -n todo-app`
- [ ] Services are healthy: `curl http://34.22.249.41:30081/health`
- [ ] HPA is configured: `kubectl get hpa -n todo-app`
- [ ] Metrics server is running: `kubectl get pods -n kube-system | grep metrics`

During tests:

- [ ] Monitor CPU usage
- [ ] Watch pod scaling events
- [ ] Check error rates
- [ ] Observe response times

After tests:

- [ ] Review HPA events: `kubectl describe hpa -n todo-app`
- [ ] Check pod logs for errors
- [ ] Verify system returned to baseline
- [ ] Document performance metrics

## 🚨 Troubleshooting

### Common Issues:

**429 Too Many Requests**
```bash
# Rate limiting aktif - normal davranış
# Reduce spawn rate: -r 2 instead of -r 10
```

**Connection Refused**
```bash
kubectl get pods -n todo-app
kubectl get services -n todo-app
```

**HPA Not Scaling**
```bash
kubectl describe hpa todo-app-auth-hpa -n todo-app
kubectl top pods -n todo-app
```

**High Error Rates**
```bash
kubectl logs -f deployment/todo-app-auth -n todo-app
kubectl logs -f deployment/todo-app-todo -n todo-app
```

## 🎉 Success Metrics

A successful HPA test should show:

✅ **CPU Scaling**: 10% → 60% → back to 10%  
✅ **Pod Scaling**: 1 → 2/3 → back to 1  
✅ **Response Times**: <2000ms under load  
✅ **Error Rates**: <10% during peak  
✅ **System Recovery**: Clean scale-down  

## 🔗 Useful Commands

```bash
# Quick status check
kubectl get pods,hpa -n todo-app

# Detailed HPA info
kubectl describe hpa todo-app-auth-hpa -n todo-app

# Resource usage
kubectl top pods -n todo-app --sort-by=cpu

# Event logs
kubectl get events -n todo-app --sort-by=.metadata.creationTimestamp

# Complete monitoring
watch -n 2 'echo "=== PODS ===" && kubectl get pods -n todo-app && echo "=== HPA ===" && kubectl get hpa -n todo-app && echo "=== CPU ===" && kubectl top pods -n todo-app'
``` 