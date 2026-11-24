# Deploying BrokerSodo on AletCloud

The app deploys from GitHub using the `Dockerfile` in this repo. Database migrations run automatically each time the container starts.

## 1. Plans

| Service | Plan | ETB/month |
| --- | --- | ---: |
| App | App Pro (500m CPU, 512Mi RAM) | 360 |
| Database | PostgreSQL Pro (5Gi, daily backups) | 150 |
| Images | Storage 5GB | 50 |
| **Total before VAT** | | **560** |
| **Total with 15% VAT** | | **644** |

Check the prices on your AletCloud order before paying.

## 2. Ask AletCloud support first

The first question can block the launch. The database migrations need these extensions.

1. Can PostgreSQL Pro enable the `pg_trgm` and `unaccent` extensions?
2. What memory limit applies to Docker builds on App Pro? The build needs about 450 MB of Node heap.
3. Can one app serve both `brokersodo.com` and `www.brokersodo.com`?
4. Are there bandwidth limits or overage charges for the app and for Storage?

## 3. Create the database

1. Create a PostgreSQL Pro database, version 16 or newer.
2. Copy its connection string. This is `DATABASE_URL`.

## 4. Create the image bucket

1. Create a bucket, for example `brokersodo-media`, in region `et-addis-1`.
2. Set it to public read.
3. Create an access key limited to this bucket.
4. Note the bucket's public URL. This is `S3_PUBLIC_URL`, with no trailing slash.

Clean originals are stored under hard-to-guess paths in `originals/`. A public bucket must not allow file listing. Confirm that opening the bucket's root URL does not show a list of files.

## 5. Create the app

1. Create an App Pro app from the GitHub repository `Ashenafi-Bancha/brokersodo`, branch `main`.
2. Choose the Dockerfile build.
3. Add these environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | From step 3 |
| `AUTH_SECRET` | Output of `npx auth secret`. Never change it after launch |
| `SITE_URL` | `https://brokersodo.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://brokersodo.com` |
| `S3_ENDPOINT` | `https://s3.aletcloud.com` |
| `S3_REGION` | `et-addis-1` |
| `S3_BUCKET` | Your bucket name |
| `S3_ACCESS_KEY_ID` | From step 4 |
| `S3_SECRET_ACCESS_KEY` | From step 4 |
| `S3_PUBLIC_URL` | From step 4 |

4. Deploy, then open the temporary `*.app.aletcloud.com` address.

## 6. Load the launch data

Run this once from your computer, using the production database URL. It creates the admin, contact details, categories, areas, FAQs and pages. It adds no sample listings or reviews, and running it again is safe.

```powershell
$env:DATABASE_URL="PASTE_PRODUCTION_DATABASE_URL"; $env:SEED_ADMIN_EMAIL="PASTE_ADMIN_EMAIL"; $env:SEED_ADMIN_PASSWORD="PASTE_LONG_PASSWORD"; npm run db:seed:launch
```

Close that terminal afterwards so the values are cleared. If the database only accepts connections from inside AletCloud, ask support how to run this command there.

## 7. Connect the domain

1. Add `brokersodo.com` and `www.brokersodo.com` to the app.
2. Add the `_alet-challenge` TXT record and the A record that AletCloud shows.
3. Wait for HTTPS to become active.

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

Push to `main`. AletCloud rebuilds the image, and new migrations run when the container starts.
