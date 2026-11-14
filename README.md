# SMSBomb API Hub



OTP flood API, sellable. Key-based auth, expiry plans, daily quota, auto service health.



## Setup



1. Upstash par free Redis banao: https://console.upstash.com → Create Database → region ap-south-1
2. Uska `UPSTASH_REDIS_REST_URL` aur `UPSTASH_REDIS_REST_TOKEN` copy karo
3. Repo GitHub pe push karo
4. https://vercel.com/new par import karo
5. Environment Variables mein teeno daalo:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `ADMIN_SECRET` (koi lamba random string)
6. Deploy



## Endpoints
