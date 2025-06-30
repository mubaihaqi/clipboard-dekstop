# Gunakan image Node.js sebagai dasar
FROM node:20-buster-slim

# Instal dependensi yang dibutuhkan oleh Electron untuk berjalan di lingkungan headless/Linux
# XVFB (X Virtual Framebuffer) diperlukan untuk menjalankan aplikasi GUI tanpa layar fisik.
RUN apt-get update && apt-get install -y \
    libgtk-3-dev \
    libnss3 \
    libasound2 \
    xvfb \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set direktori kerja di dalam container
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Instal dependensi proyek
RUN npm install

# Salin sisa kode sumber aplikasi
COPY . .

# Jalankan skrip build untuk mem-package aplikasi
RUN xvfb-run --auto-servernum npm run build