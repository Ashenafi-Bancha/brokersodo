# Deploying BrokerSodo on AletCloud

The app deploys from GitHub using the `Dockerfile` in this repo. Database updates run automatically each time the app starts. Push to `main`, then press **Redeploy** on the app page (a push alone did not start a build).

## 1. Plans

| Service | Plan | ETB/month |
| --- | --- | ---: |
| App | App Pro (500m CPU, 512Mi RAM) | 360 |
| Database | PostgreSQL Pro (5Gi, daily backups) | 150 |
| Images | Storage 5GB | 50 |
| **Total before VAT** | | **560** |
| **Total with 15% VAT** | | **644** |

Check the prices on your AletCloud order before paying.

## 2. What is set up (live since 25 Nov 2026)

| Item | Name in AletCloud |
| --- | --- |
| Project | `brokersodo`, domain `brokersodo.com` (www works too, HTTPS by Let's Encrypt, renewed automatically) |
| Database | `brokersodo-db`, PostgreSQL 17 Pro, private, extensions `pg_trgm` and `unaccent` switched on |
| Bucket | `t334-brokersodo-media` (shown as brokersodo-media), 5 GB, public read, file listing blocked |
| App | `brokersodo`, App Pro, built from `main` with the repo's Dockerfile |

## 3. Create the database

1. Databases → Create Database → PostgreSQL → Pro → version 17.
2. On the database page, under **Extensions**, switch on `pg_trgm` and `unaccent` before the first deploy.

The database is private. Only apps in your account can reach it, so nothing is run against it from your computer.

## 4. Create the image bucket

1. Object Storage → New Bucket → 5 GB → **Public read**. Leave versioning and object lock off.
2. AletCloud adds a prefix to the name (for example `t334-brokersodo-media`). Use that full name below.

Clean originals are stored under hard-to-guess paths in `originals/`. Opening the bucket's root URL must answer "Access Denied".

## 5. Create the app

1. Apps → the project → New App → Deploy from GitHub → `Ashenafi-Bancha/brokersodo`.
2. Web service, route `/`, framework **Auto-detect**. AletCloud builds with the repo's Dockerfile.
3. **Link database**: the database from step 3. This adds `DATABASE_URL`.
4. **Link storage**: the bucket from step 4. This adds the AWS keys, `S3_BUCKET`, `S3_ENDPOINT` and `S3_REGION`.
5. Add these under Advanced → Environment Variables:

| Variable | Value |
| --- | --- |
| `SITE_URL` | `https://brokersodo.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://brokersodo.com` |
| `S3_PUBLIC_URL` | `https://s3.aletcloud.com/<full bucket name>` |
| `SEED_ADMIN_EMAIL` | The admin login email |
| `SEED_ADMIN_PASSWORD` | The admin password, 12+ characters. Typed by the owner. Remove after the first login |
| `AUTH_SECRET` | A long random value, typed by the owner. Never change it after launch |

6. Choose **Pro** and deploy. A build takes about 4–5 minutes.

## 6. Launch data and admin account

Nothing to run by hand. When the app starts it applies database updates, and while `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set it creates the admin and the starter content (categories, areas, FAQs, pages). The runtime log shows "Launch data ready". Running it again never changes an existing admin's password.

## 7. Connect the domain

Project page → **Change Domain** → My Domains → `brokersodo.com` → Set Domain. Because the domain is registered with AletCloud, DNS and HTTPS are set up automatically.

## 8. Test everything before sending the link

Use your own phone number in every test. Start each test name with `TEST` so it is easy to find and delete afterwards.

**Admin login**

- [ ] Open `https://brokersodo.com/admin`. You are sent to the login page.
- [ ] A wrong password shows an error. After 8 tries in 15 minutes, that email is locked out for the rest of the 15 minutes.
- [ ] The right email and password open the dashboard.
- [ ] In **Users**, add an account for each broker with their own email. Never share the admin password.

**Contact and inquiry forms** (each one must appear in the admin panel within a few seconds)

- [ ] `/contact` form → **Inquiries**, source "contact"
- [ ] "Ask about this" on any listing → **Inquiries**, with the listing's reference code
- [ ] `/wanted` form → **Wanted**
- [ ] `/sell` with a photo → **Submissions**. Convert it to a listing and check that the photo shows on the website with the watermark.
- [ ] The call, Telegram and WhatsApp buttons on the website open the client's real numbers.

**Jobs and tutors**

- [ ] `/jobs/post` → **Jobs** shows it as Pending. Click Publish and check that it appears on `/jobs`.
- [ ] Apply to that job → the applicant appears inside the job in **Jobs**.
- [ ] `/jobs/talent-pool` → **Talent pool**
- [ ] `/tutors/join` → **Tutors** as Pending. Click Make live and check that it appears on `/tutors`.
- [ ] `/tutors/request` → **Tutor requests**

**Clean up and final checks**

- [ ] Delete every `TEST` record from the admin panel.
- [ ] Opening the bucket root URL does not list files.
- [ ] Restart the app in AletCloud. Listings, photos and jobs are still there.
- [ ] The client has reviewed the About, Terms and Privacy text. The Privacy page must mention that job seekers' and tutors' details are kept and shared with employers and families.

The site does not send email. New messages are seen in the admin panel, and the sidebar shows a red count for anything new.

## Updating the site

Push to `main`, then press **Redeploy** on the app page. New database updates run when the app starts.
