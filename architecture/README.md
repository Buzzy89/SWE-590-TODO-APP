# Cloud-Native Todo Application - Architecture Diagrams

Bu klasörde Todo uygulamasının mimari diyagramları bulunmaktadır. Tüm diyagramlar Python `diagrams` kütüphanesi kullanılarak oluşturulmuştur.

## 📋 Mevcut Diyagramlar

### 🏗️ Ana Mimari Diyagramları

#### 1. `todo_app_architecture.png`
**Ana mimari diyagram** - Uygulamanın genel mimarisi
- GKE Autopilot cluster yapısı
- Kubernetes servisleri (Frontend, Auth, Todo)
- PostgreSQL veritabanı
- **Serverless Functions:**
  - **Todo Insights Function**: AI destekli kategorizasyon ve öncelik tahmini
  - **Todo Analytics Function**: Global istatistikler ve trend analizi
  - **Health Monitor Function**: Sistem sağlık kontrolü
- Container Registry ve CI/CD pipeline
- VPC network yapısı

#### 2. `todo_app_serverless_architecture.png`
**Detaylı serverless mimari** - Cloud Functions odaklı görünüm
- Serverless fonksiyonların detaylı açıklamaları
- VPC Connector bağlantıları
- Database etkileşimleri
- Function spesifikasyonları (memory, timeout, runtime)

### ⚡ Serverless Functions Detayları

#### 3. `serverless_functions_detail.png`
**Serverless fonksiyon işleyişi** - Function'ların iç yapısı
- **Todo Insights Function:**
  - Natural Language API entegrasyonu
  - 8 kategori tahmini (Work, Personal, Health, Shopping, Finance, Education, Travel, Maintenance)
  - Öncelik tahmini (High, Medium, Low)
  - Keyword analizi
- **Todo Analytics Function:**
  - Global istatistikler
  - Kullanıcı aktivite analizi
  - Trend raporları
  - Kategori dağılımı
- **Health Monitor Function:**
  - 5 dakikalık periyodik kontrol
  - Servis sağlık durumu
  - Alert sistemi

#### 4. `cloud_functions_specs.png`
**Teknik spesifikasyonlar ve maliyetler**
- Runtime: Node.js 18
- Memory: 256MB
- Timeout ayarları
- Dependency listesi
- Aylık maliyet analizi (~$2.23/month)

### 🚀 Performans ve Optimizasyon

#### 5. `performance_optimizations.png`
**Performans optimizasyon katmanları**
- Circuit Breaker pattern (Opossum)
- In-Memory Cache (5-min TTL)
- Connection Pool (50 max connections)
- Bcrypt optimizasyonu
- **Performans sonuçları:**
  - Success Rate: %0.8 → %95.2
  - Response Time: 89s → 2.1s
  - Throughput: 12 → 47 req/s

### 💰 Maliyet Analizi

#### 6. `cost_breakdown.png`
**GCP maliyet dağılımı** ($150/month)
- GKE Autopilot: $105.18 (%70)
- Network & LB: $19.20 (%13)
- Compute Engine: $7.41 (%5)
- Cloud Build: $5.00 (%3)
- **Cloud Functions: $2.23 (%1.5)**
- Container Registry: $0.26 (%0.2)

## 🛠️ Diyagram Oluşturma

### Gereksinimler
```bash
python3 -m venv venv
source venv/bin/activate
pip install diagrams
```

### Diyagramları Yeniden Oluşturma

#### Ana diyagramlar:
```bash
python generate_diagram.py
```

#### Serverless detay diyagramları:
```bash
python generate_serverless_diagram.py
```

## 📊 Serverless Functions Özellikleri

### Todo Insights Function
- **Amaç**: AI destekli todo kategorizasyon ve öncelik tahmini
- **API**: POST /insights
- **Teknoloji**: Google Natural Language API
- **Kategoriler**: 8 farklı kategori
- **Öncelik**: High/Medium/Low
- **Maliyet**: ~$1.20/month

### Todo Analytics Function
- **Amaç**: Global istatistikler ve trend analizi
- **API**: GET /analytics
- **Özellikler**: 
  - Kullanıcı aktivite analizi
  - Tamamlama oranları
  - Kategori dağılımı
- **Maliyet**: ~$0.80/month

### Health Monitor Function
- **Amaç**: Sistem sağlık kontrolü
- **Çalışma**: 5 dakikada bir otomatik
- **Kontrol**: Auth, Todo, Frontend servisleri
- **Alert**: Response time ve error rate
- **Maliyet**: ~$0.23/month

## 🔗 Bağlantılar

- **Frontend**: React App (Port: 30080)
- **Auth Service**: Node.js (Port: 30081)
- **Todo Service**: Node.js (Port: 30082)
- **Database**: PostgreSQL (Compute Engine)
- **Functions**: Cloud Functions (Serverless)

## 📈 Mimari Avantajları

1. **Scalability**: GKE Autopilot ile otomatik ölçeklendirme
2. **Cost Efficiency**: Serverless functions ile pay-per-use
3. **Performance**: Circuit breaker ve caching katmanları
4. **Monitoring**: Otomatik sağlık kontrolü
5. **AI Integration**: Natural Language API ile akıllı kategorizasyon
6. **Reliability**: Multi-layer architecture ve error handling 