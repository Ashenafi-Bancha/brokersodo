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

## 8. Check before sending the link

- [ ] Home page loads on a phone at `https://brokersodo.com`
- [ ] Admin login works at `/admin`
- [ ] A test submission with a photo reaches the admin panel
- [ ] Converting it to a listing shows the watermarked photo publicly
- [ ] Deleting the test listing removes it
- [ ] Bucket root URL does not list files
- [ ] Phone, Telegram and TikTok links are correct
- [ ] About, Terms and Privacy text has been reviewed by the client
- [ ] App restart keeps the listings and photos

## Updating the site

Push to `main`. AletCloud rebuilds the image, and new migrations run when the container starts.
