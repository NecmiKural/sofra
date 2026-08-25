# 🍽️ Sofra

**Restoranlar, kafeler, barlar ve oteller için açık kaynak QR menü, masa servisi ve ödeme platformu.**

*English README: [README.md](README.md)*

Sofra her masayı canlı bir QR menüye dönüştürür. Misafir masadaki QR'ı okutur, menü kendi dilinde ve masa numarasıyla açılır; garson çağırır, hesap ister, masadan sipariş verir, isterse online öder. Personel her şeyi anında canlı panelde görür. Uygulama indirme yok, POS cihazı yok, komisyon yok — kendi sunucunuzda çalışır.

## Canlı demo

**[sofra-demo.onrender.com](https://sofra-demo.onrender.com)**

- Misafir menüsü — [/m/demo?table=1](https://sofra-demo.onrender.com/m/demo?table=1)
- Personel paneli — [/admin](https://sofra-demo.onrender.com/admin) · `admin@sofra.local` / `sofra123`

Demo ücretsiz bir instance üzerinde çalışır: 15 dakika hareketsizlikten sonra uyur (ilk istek uyandırmak için yaklaşık bir dakika sürer) ve yeniden başladığında seed verisine döner. Rahatça sipariş verip ödeyin — orada yaptığınız hiçbir şey kalıcı değil.

## Özellikler

- **Masaya bağlı QR menü** — her masanın kendi QR'ı; okutunca menü o masaya bağlı açılır
- **Anında güncelleme** — fiyatı bir kez değiştirin, tüm masalar canlı görsün
- **Çok dilli** — menü metinleri dil bazında veridir, görsele gömülmez; ayarlardan dil eklenir
- **Kategori ve alt kategoriler**, fotoğraf veya emoji, hazırlık süresi, diyet etiketleri (popüler / vejetaryen / vegan / acı / glutensiz)
- **Seçenek grupları** — kendi fiyatlı porsiyonlar, ücretli ekstralar, boyutlar, şeker seviyesi
- **Canlı masa aksiyonları** — garson çağır & hesap iste, SSE ile panele anında düşer
- **Masadan sipariş** — sepet, not, sunucu tarafında fiyatlama, canlı sipariş durumu
- **Masada ödeme** — takılabilir ödeme katmanı; demo sağlayıcı hazır, Stripe/iyzico adaptörleri yol haritasında
- **Özellik anahtarları** — garson / hesap / sipariş / ödeme işletme bazında açılıp kapanır
- **Tema** — işletmeye özel marka rengi, açık / koyu / otomatik
- **Yazdırılabilir QR sayfası** — masa başına kart, laminasyona hazır
- **Tarama analitiği** — güne ve masaya göre taramalar, istek/sipariş/ciro sayaçları
- **Kolay self-host** — Prisma + tek dosyalık SQLite, sürümlenmiş migration'lar, tek Docker container

## Hızlı başlangıç

**Node.js >= 18.18** gerekir.

```bash
git clone <bu-repo> sofra && cd sofra
cp .env.example .env
npm install         # `prisma generate` çalışır
npm run db:seed     # migration'ları uygular, sonra iki dilli demo işletmeyi ekler
npm run dev
```

- Misafir menüsü: http://localhost:3000/m/demo?table=1
- Personel paneli: http://localhost:3000/admin — `admin@sofra.local` / `sofra123`

Şemayı değiştirdiniz mi? `npm run db:migrate` yeni migration üretip uygular
(`npm run db:push` migration üretmeden, geçici denemeler için kısayoldur).

## Yayına alma

### Docker

Her sürüm çok mimarili bir imaj yayınlar:

```bash
docker run -d -p 3000:3000 \
  -v sofra-data:/app/data \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  ghcr.io/OWNER/sofra:latest
```

Migration'lar açılışta otomatik çalışır. İlk çalıştırmada demo işletmeyi yüklemek
için `SEED_DEMO=1` verin. Ya da depodaki compose dosyasını kullanın:

```bash
docker compose up --build
```

### Render

Depoda [`render.yaml`](render.yaml) blueprint'i var. Render'ı kendi fork'unuza
bağlayın; Dockerfile'ı derler, oturum anahtarını üretir ve ücretsiz bir instance
başlatır.

Kalıcı bir volume ile container çalıştıran her sağlayıcı aynı şekilde çalışır —
Sofra'nın ihtiyacı tek uzun ömürlü bir süreç (canlı panel SSE bağlantısı tutar)
ve SQLite dosyası için yazılabilir bir dizin.

## Nasıl çalışır

1. **Misafir masadaki QR'ı okutur** → `/m/{isletme}?table=N` açılır, menü kendi dilinde gelir.
2. **İnceler, sipariş verir, çağırır veya hesabı ister** → istekler sunucu tarafında doğrulanır ve fiyatlanır.
3. **Personel canlı görür** → `/admin` paneline olaylar SSE ile, masa numarası etiketiyle düşer. Yenilemek yok.

Sıradaki adımlar için [ROADMAP.md](ROADMAP.md).

## Lisans

[MIT](LICENSE)
