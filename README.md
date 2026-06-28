# AI Workshop Feedback System

ระบบสอบถามความรู้สึกหลังการอบรมเชิงปฏิบัติการ "บูรณาการ AI อย่างสร้างสรรค์สู่การเรียนรู้ในห้องเรียน" (สสวท. x ศธจ.มหาสารคาม)

---

## สถาปัตยกรรมระบบ (Architecture)

- **Frontend:** React, TypeScript, Vite, SPA Client-side routing.
- **Backend:** Express, Socket.IO for realtime aggregates, Helmet & Rate Limiter for security hardening.
- **Database:** MariaDB (persisted transactionally via Connection Pool).
- **Deployment:** Plesk Node.js Toolkit, processes reverse proxy requests on `process.env.PORT`.

---

## การติดตั้งสำหรับ Development (Local Setup)

### 1. ติดตั้งความต้องการเริ่มต้น
- **Node.js** v22.12.0 หรือสูงกว่า
- **MariaDB** หรือ **MySQL** server ทำงานอยู่บนพอร์ต 3306

### 2. ดาวน์โหลดและติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่าสภาพแวดล้อม (.env)
คัดลอกไฟล์ `.env.example` เป็น `.env` และตั้งค่าการเชื่อมต่อฐานข้อมูล:
```bash
cp .env.example .env
```

### 4. สร้างรหัสผ่านสำหรับผู้นำเสนอ (Argon2id Hash)
เนื่องจากระบบไม่เก็บรหัสผ่านจริงเพื่อความปลอดภัย ให้สร้าง Hash ด้วยสคริปต์นี้:
```bash
node scripts/hash-presenter-pin.mjs <รหัสผ่านของคุณ 6 หลักขึ้นไป>
```
คัดลอกผลลัพธ์ที่ได้ไปใส่ในตัวแปร `PRESENTER_PIN_HASH` ในไฟล์ `.env`

### 5. รันฐานข้อมูล Migration
รันคำสั่งด้านล่างเพื่อรันโครงสร้างตารางและ Seed ข้อมูลตัวเลือก Emoji:
```bash
# ตรวจสอบให้มั่นใจว่าตั้งค่าฐานข้อมูลใน .env ถูกต้องแล้ว
npm run migrate
```

### 6. ทดสอบระบบ (Testing)
```bash
# รัน Unit / Integration tests ทั้งหมด
npm test

# ตรวจสอบ Typecheck ของ TypeScript
npm run typecheck
```

---

## ขั้นตอนการติดตั้งบน Plesk Production (Deployment Guide)

เพื่อนำระบบขึ้นใช้งานบนโดเมน `https://feedback.thatumdonruea.com` ผ่าน Plesk Node.js Toolkit ให้ทำตามขั้นตอนดังนี้:

### 1. เตรียมฐานข้อมูลบน Plesk
1. ไปที่เมนู **Databases** ในหน้า Plesk ของโดเมนคุณ
2. กด **Add Database**
3. สร้างชื่อฐานข้อมูล ผู้ใช้งาน และรหัสผ่านฐานข้อมูล (จดจำค่าเหล่านี้ไว้สำหรับใส่ใน Environment Variables)

### 2. อัปโหลดไฟล์โครงการ
อัปโหลดโค้ดโครงการขึ้นเซิร์ฟเวอร์ด้วย Git Deploy หรือ File Manager (ข้ามโฟลเดอร์ `node_modules` และ `dist` ไป)

### 3. ตั้งค่า Node.js ใน Plesk
ไปที่เมนู **Node.js** ในเว็บบอร์ด Plesk และตั้งค่าดังนี้:
- **Node.js Version:** เลือกรุ่น LTS ล่าสุด (แนะนำ >= 22.x)
- **Package Manager:** `npm`
- **Document Root:** `dist/public` (ชี้ไปยังโฟลเดอร์สำหรับบริการ static ไฟล์ของ React)
- **Application Mode:** `production`
- **Application Root:** โฟลเดอร์หลักของโปรเจกต์ (เช่น `/httpdocs`)
- **Application Startup File:** `server.js`

### 4. ตั้งค่า Environment Variables ใน Plesk
กดลิงก์ **Variables** ในเมนู Node.js และเพิ่มค่าตัวแปรด้านล่างนี้ให้ตรงตามความจริง:
- `NODE_ENV` = `production`
- `APP_ORIGIN` = `https://feedback.thatumdonruea.com`
- `DATABASE_HOST` = `127.0.0.1` (หรือ host ของ Plesk database)
- `DATABASE_PORT` = `3306`
- `DATABASE_NAME` = `<ชื่อฐานข้อมูลที่สร้างในขั้นตอนที่ 1>`
- `DATABASE_USER` = `<ชื่อผู้ใช้ฐานข้อมูล>`
- `DATABASE_PASSWORD` = `<รหัสผ่านผู้ใช้ฐานข้อมูล>`
- `SESSION_SECRET` = `<สุ่มคีย์ยาวๆ 32 ตัวอักษรขึ้นไป>`
- `COOKIE_SECRET` = `<สุ่มคีย์ยาวๆ 32 ตัวอักษรขึ้นไป>`
- `PRESENTER_PIN_HASH` = `<รหัส Argon2id Hash ที่ได้จากการรันสคริปต์ใน Local>`

### 5. ติดตั้งและรันการ Build
1. ในหน้า Node.js กดปุ่ม **NPM Install** เพื่อติดตั้ง Node modules
2. รัน Build โฟลเดอร์โดยเชื่อมต่อ SSH เข้าไปยัง Application Root และสั่งรัน:
   ```bash
   npm run build
   ```
   *(หรือใส่ script build ในขั้นตอนรันอัตโนมัติ)*
3. รัน Migration เพื่อนำเข้าตารางใน Production Database:
   ```bash
   npm run migrate
   ```

### 6. เริ่มต้นระบบใหม่ (Restart)
กดปุ่ม **Restart App** ในแผงควบคุม Plesk Node.js

### 7. ออกใบรับรอง SSL/TLS
ไปที่ **SSL/TLS Certificates** ใน Plesk และขอรับใบรับรอง Let's Encrypt สำหรับโดเมน `feedback.thatumdonruea.com` พร้อมเลือกเปิดใช้งาน **Redirect HTTP to HTTPS**

### 8. รัน Smoke Test ทดสอบผลลัพธ์
คุณสามารถตรวจสอบความถูกต้องของระบบหลังสตาร์ทผ่านคำสั่ง:
```bash
node scripts/smoke-production.mjs https://feedback.thatumdonruea.com
```

---

## แผนการกู้คืนระบบและการสำรองข้อมูล (Operations & Backup)

- **ดูประวัติการทำงาน (Logs):** ไฟล์บันทึกข้อผิดพลาดจะปรากฏในเมนู **Logs** ในหน้าหลักของ Plesk หรือในโฟลเดอร์ logs/ stderr/stdout ภายใต้การควบคุมของ Node.js Toolkit
- **การสำรองข้อมูลฐานข้อมูล (Database Backup):** แนะนำตั้งค่า Backup Task ใน Plesk ให้สำรองข้อมูลตาราง `submissions`, `submission_answers` และ `submission_emojis` ทุกวันหรือหลังจบช่วงเช้าการอบรม
- **การ Rollback:** หากมีปัญหา สามารถใช้ Git เพื่อย้อนกลับสัญญากับเวอร์ชันก่อนหน้า และทำความสะอาดโฟลเดอร์ `dist` จากนั้นสั่งรัน `npm run build` และ restart อีกรอบ
