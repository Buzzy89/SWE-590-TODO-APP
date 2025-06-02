# Todo App Load Testing with Locust

Bu klasör, Todo uygulaması için Locust ile load testing araçlarını içerir. HPA (Horizontal Pod Autoscaler) testleri için özel olarak optimize edilmiştir.

## 🎯 Amaç

- Backend servislerinde CPU yükü oluşturarak HPA scaling'ini test etmek
- Gerçek kullanıcı senaryolarını simüle etmek
- Performans bottleneck'lerini tespit etmek
- NodePort tabanlı deployment'ın performansını değerlendirmek

## 📋 Gereksinimler

```bash
cd locust
pip install -r requirements.txt
```

## 🚀 Kullanım

### 1. Normal Load Testing

Genel uygulama testleri için:

```bash
locust -f locustfile.py --host http://34.22.249.41:30080
```

Web UI'ye erişim: http://localhost:8089

### 2. HPA Scaling Testleri

CPU yoğun testler ile HPA'ları tetiklemek için:

```bash
# Yoğun load test - HPA scaling'i tetiklemek için
locust -f locustfile.py --host http://34.22.249.41:30080 -u 50 -r 10 -t 300s --only-summary

# CPUIntensiveUser sınıfını kullanarak
locust -f locustfile.py CPUIntensiveUser --host http://34.22.249.41:30081 -u 100 -r 20 -t 600s
```

### 3. Özel URL'lerle Test

```bash
locust -f locustfile.py \
  --host http://34.22.249.41:30080 \
  --auth-url http://34.22.249.41:30081 \
  --todo-url http://34.22.249.41:30082 \
  --insights-url https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app
```

### 4. Headless Mod (CI/CD için)

```bash
# 10 kullanıcı, 2/saniye spawn rate, 2 dakika test
locust -f locustfile.py --host http://34.22.249.41:30080 -u 10 -r 2 -t 120s --headless --only-summary
```

## 📊 Test Senaryoları

### TodoAppUser (Weight: 1)
- ✅ Kullanıcı kaydı ve girişi
- ✅ Frontend dashboard görüntüleme
- ✅ Todo oluşturma, güncelleme, silme
- ✅ Todo listesi getirme
- ✅ Todo tamamlama
- ✅ İstatistik görüntüleme
- ✅ AI Insights testi
- ✅ Health check'ler

### CPUIntensiveUser (Weight: 2)
- 🔥 Yoğun health check istekleri
- 🔥 Hızlı todo oluşturma (CPU yükü)
- 🔥 Sürekli todo listesi getirme
- 🔥 Minimum bekleme süresi (0.1-0.5s)

## 🎛️ HPA İzleme

Test sırasında HPA durumunu izlemek için:

```bash
# HPA durumunu izle
kubectl get hpa -n todo-app -w

# Pod sayısını izle
kubectl get pods -n todo-app -w

# CPU kullanımını izle
kubectl top pods -n todo-app
```

## 📈 Beklenen Sonuçlar

### HPA Scaling Senaryosu:
1. **Başlangıç**: 1 pod (Auth & Todo)
2. **CPU %50'yi aştığında**: +1 pod eklenir
3. **Devam eden yük**: 60s sonra +1 pod daha
4. **Maksimum**: 5 pod'a kadar çıkabilir
5. **Load azaldığında**: 5 dakika sonra pod sayısı azalır

### Test Parametreleri:
- **Normal Test**: 10-20 kullanıcı
- **HPA Test**: 50-100 kullanıcı
- **Stress Test**: 200+ kullanıcı

## 🔧 Yapılandırma

### Environment Variables

```bash
export LOCUST_AUTH_URL="http://34.22.249.41:30081"
export LOCUST_TODO_URL="http://34.22.249.41:30082"
export LOCUST_FRONTEND_URL="http://34.22.249.41:30080"
export LOCUST_INSIGHTS_URL="https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app"
```

### Mevcut Endpoints

- **Frontend**: http://34.22.249.41:30080
- **Auth Service**: http://34.22.249.41:30081
- **Todo Service**: http://34.22.249.41:30082
- **AI Insights**: https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app

## 📝 Rapor Analizi

Test sonrası raporlarda dikkat edilecek metrikler:

- **Response Time**: P50, P95, P99 değerleri
- **Throughput**: Request/second değeri
- **Error Rate**: %1'in altında olmalı
- **CPU Usage**: HPA tetikleme seviyesi (%50)
- **Pod Scaling**: Beklenen pod sayısı artışı

## 🚨 Troubleshooting

### Yaygın Sorunlar:

1. **Connection Refused**
   ```bash
   # Pod'ların çalışıp çalışmadığını kontrol et
   kubectl get pods -n todo-app
   ```

2. **Authentication Errors**
   ```bash
   # Auth service loglarını kontrol et
   kubectl logs -f deployment/todo-app-auth -n todo-app
   ```

3. **HPA Scaling Çalışmıyor**
   ```bash
   # Metrics server durumunu kontrol et
   kubectl get pods -n kube-system | grep metrics-server
   ```

## 🎉 Başarılı Test Örneği

```bash
# Örnek komut
locust -f locustfile.py \
  --host http://34.22.249.41:30080 \
  -u 50 -r 5 -t 300s \
  --headless --only-summary

# Beklenen sonuç:
# - 0% error rate
# - Response time < 1000ms
# - HPA scaling tetiklendi
# - Pod sayısı 1'den 3'e çıktı
``` 