# PIN-only ucretsiz yayin ve telefonlar arasi esitleme

## Supabase

1. Supabase'te ucretsiz bir proje olustur.
2. SQL Editor'de `supabase/schema.sql` dosyasinin tamamini calistir. Bu, sadece `shared` kimlikli tek satir icin anon okuma/yazma ve Realtime izni verir.
3. Project Settings > API bolumunden Project URL ve anon/publishable key degerlerini al.

## Vercel

1. Projeyi GitHub'a gonder ve Vercel'de ucretsiz Hobby projesi olarak iceri aktar.
2. Vercel Project Settings > Environment Variables bolumune su iki degiskeni ekle:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Ayni degerleri yerelde `.env.local` dosyasina ekle. Degisken adi ve degerini sohbette paylasma; `service_role` anahtarini kullanma.
4. Vercel'de yeniden deploy et. Vercel uygulamayi HTTPS adresinde yayinlar.

## iPhone'a ekleme

Her iki iPhone'da Safari ile Vercel HTTPS adresini acin ve Paylas > Ana Ekrana Ekle secin. Uygulamayi iki telefonda da acip yalnizca PIN `0111` ile girin; Supabase/GitHub hesabi gerekmez.

Yapilacaklar, takvimde eklenen ozel gunler, bulusma tarih/saat ayari ve iliski tikleri ayni kayitta tutulur ve Realtime ile diger telefona aktarilir. PIN ve Face ID cihazda kalir. Supabase ayarlanmadiysa uygulama yerel kayit modunda calisir; bu mod cihazlar arasinda esitlemez.

ONEMLI: Bu secim PIN-only kullanim saglar ama guclu erisim guvenligi saglamaz. PIN istemci tarafinda oldugu icin tabloya ait Project URL ve anon key'i bilen herkes, RLS yalnizca tek shared satira izin verse de, bu ortak veriyi okuyup degistirebilir. Ozel bilgi saklamayin. Daha guclu gizlilik icin sunucu tarafinda PIN dogrulama veya kullanici girisi gerekir.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` tarayici istemcisinde kullanilir. `service_role` anahtarini istemciye veya Vercel'in `NEXT_PUBLIC_` degiskenlerine koyma.