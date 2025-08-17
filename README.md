# Nest Mailer (BullMQ + MongoDB + Mongoose)

Queues email sending using **BullMQ** and logs every email (success/failure) in **MongoDB** with timestamps and error details. Includes **rate limiting** for `/send`, **Winston** request/response logging, and Docker setup.

## 📌 Endpoints
- `POST /send` — queue an email (not sent immediately)
- `GET /logs/email?page=1&limit=10` — paginated logs + today's stats

## 🚀 Quick Start
1. Need to create `.env` and fill values:
    ```bash
   PORT=3000
   NODE_ENV=development
   
   # --- MongoDB ---
   # Cloud (Atlas)
   MONGO_URI=
   
   # --- Redis (BullMQ) ---
   # --- Cloud Upstash ---
   REDIS_URL=
   
   # --- SMTP ---
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_email@example.com
   SMTP_PASS=your_password
   SMTP_FROM=your_email@example.com
   
   # --- Rate Limit ---
   RATE_LIMIT=
   RATE_TTL=
     
2. For Local Install & run
   ```bash
   npm install
   npm run build
   npm run start
   
3. For Docker Install & run
   ```bash
   docker-compose up --build -d

4. Stop docker
```bash
 docker-compose down

