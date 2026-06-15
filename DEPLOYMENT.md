# Panduan Deployment — Helpdesk IDB Bali

## Prasyarat

- Akun GitHub
- VPS Ubuntu Server 24.04
- Akun Cloudflare (jika menggunakan custom domain)
- Domain yang sudah terhubung ke Cloudflare (contoh: `idbbali.ac.id`)

---

## Bagian 1 — Persiapan GitHub

### 1.1 Buat Repository

1. Login ke [github.com](https://github.com)
2. Klik **New repository**
3. Isi nama repository (contoh: `helpdesk-idb`)
4. Set ke **Private**
5. Klik **Create repository**

### 1.2 Buat Personal Access Token (PAT)

1. Buka: **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Klik **Generate new token (classic)**
3. Isi **Note**: `helpdesk-idb deploy`
4. Pilih **Expiration** sesuai kebutuhan
5. Centang scope: **repo** (full control of private repositories)
6. Klik **Generate token**
7. **Salin token — hanya tampil sekali**

### 1.3 Push Project ke GitHub

Jalankan dari direktori project:

```bash
git remote add origin https://github.com/USERNAME/helpdesk-idb.git
git add .
git commit -m "Initial project: Helpdesk IDB Bali"
git push -u origin master
```

Saat diminta password, masukkan **Personal Access Token** (bukan password GitHub).

---

## Bagian 2 — Setup VPS Ubuntu Server 24.04

### 2.1 Install Node.js, Git, dan PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
sudo npm install -g pm2
```

Verifikasi:
```bash
node -v && npm -v
```

### 2.2 Clone Repository

```bash
cd /var/www
sudo mkdir helpdesk && sudo chown $USER:$USER helpdesk
cd helpdesk
git clone https://github.com/USERNAME/helpdesk-idb.git .
```

### 2.3 Install Dependencies

```bash
npm install
```

### 2.4 Buat File .env

```bash
nano .env
```

Isi dengan nilai yang sesuai:

```env
# Database
DATABASE_URL="file:./prisma/prod.db"

# NextAuth
NEXTAUTH_SECRET="isi-dengan-random-string"
NEXTAUTH_URL="https://helpdesk.idbbali.ac.id"

# NVIDIA NIM (Chatbot Vira)
NVIDIA_API_KEY="nvapi-xxxxxxxxxxxx"
NVIDIA_MODEL="meta/llama-3.1-8b-instruct"

# Microsoft OAuth (opsional — hapus jika tidak dipakai)
AUTH_MICROSOFT_ENTRA_ID_ID="client-id"
AUTH_MICROSOFT_ENTRA_ID_SECRET="client-secret"
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID="tenant-id"
```

Generate `NEXTAUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.5 Setup Database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 2.6 Build Aplikasi

```bash
npm run build
```

### 2.7 Jalankan dengan PM2

```bash
pm2 start npm --name "helpdesk-idb" -- start
pm2 save
pm2 startup
```

Jalankan perintah `sudo ...` yang muncul dari output `pm2 startup`.

Cek status:
```bash
pm2 status
pm2 logs helpdesk-idb
```

### 2.8 Install dan Konfigurasi Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/helpdesk
```

Isi konfigurasi:

```nginx
server {
    listen 80;
    server_name helpdesk.idbbali.ac.id;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/helpdesk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 2.9 Konfigurasi Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

---

## Bagian 3 — Setup Cloudflare Tunnel (Custom Domain)

> Gunakan bagian ini jika VPS berada di belakang NAT/tidak punya IP publik,
> atau ingin HTTPS otomatis tanpa konfigurasi SSL manual.

### 3.1 Install cloudflared

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

### 3.2 Login ke Cloudflare

```bash
cloudflared tunnel login
```

Buka URL yang muncul di browser, pilih domain `idbbali.ac.id`, lalu authorize.

### 3.3 Buat Tunnel

```bash
cloudflared tunnel create helpdesk-idb
```

Catat **Tunnel ID** (format UUID) yang muncul.

### 3.4 Buat Config File

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Isi:

```yaml
tunnel: TUNNEL-ID-ANDA
credentials-file: /home/USER/.cloudflared/TUNNEL-ID-ANDA.json

ingress:
  - hostname: helpdesk.idbbali.ac.id
    service: http://localhost:3000
  - service: http_status:404
```

Ganti `TUNNEL-ID-ANDA` dan `USER` sesuai server.

### 3.5 Arahkan DNS

```bash
cloudflared tunnel route dns helpdesk-idb helpdesk.idbbali.ac.id
```

### 3.6 Jalankan Tunnel sebagai Service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Cek status:

```bash
sudo systemctl status cloudflared
```

---

## Bagian 4 — Update Aplikasi (setelah ada perubahan kode)

```bash
cd /var/www/helpdesk
git pull origin master
npm install
npx prisma generate
npm run build
pm2 restart helpdesk-idb
```

---

## Akun Default Setelah Seed

| Email | Password | Role |
|---|---|---|
| admin@idbbali.ac.id | admin123 | ADMIN |
| tech1@idbbali.ac.id | tech123 | IT_SUPPORT |
| tech2@idbbali.ac.id | tech123 | IT_SUPPORT |
| kabag.keuangan@idbbali.ac.id | depthead123 | DEPARTMENT_HEAD |
| kabag.hrd@idbbali.ac.id | depthead123 | DEPARTMENT_HEAD |
| kabag.baa@idbbali.ac.id | depthead123 | DEPARTMENT_HEAD |
| dosen1@idbbali.ac.id | user123 | USER |

> **Ganti semua password default sebelum go-live.**

---

## Troubleshooting

**App tidak jalan setelah restart server:**
```bash
pm2 resurrect
```

**Cek log error:**
```bash
pm2 logs helpdesk-idb --lines 50
```

**Tunnel Cloudflare tidak konek:**
```bash
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -n 50
```

**Database error setelah update schema:**
```bash
npx prisma db push
npx prisma generate
pm2 restart helpdesk-idb
```
