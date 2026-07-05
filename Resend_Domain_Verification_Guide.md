# How to Verify Your Domain on Resend

To send emails to anyone other than yourself using Resend, you must prove that you actually own the email address you are trying to send *from*. Resend (and all modern email APIs) enforces this to prevent spam and phishing.

## The Challenge with `@cuchd.in`
When we configure Resend to send emails, it requires you to prove ownership of the domain by adding specific **DNS Records (TXT and MX records)** to the domain's hosting provider (like GoDaddy, Cloudflare, etc.).

🚨 **Crucial Limitation**: Because `cuchd.in` is the official Chandigarh University domain, **you likely do not have access to its global DNS settings** to add these verification records (unless you are a senior IT administrator for the university). 

Because you cannot verify `cuchd.in`, Resend will not let you send emails "from" a `@cuchd.in` address to arbitrary users on the free tier.

---

## Your 3 Options to Fix This for Production

Since you want the system to be fully functional for all participants, you have three paths forward:

### Option 1: Buy a Cheap Custom Domain (Recommended for Free Tier)
Instead of sending from `cuchd.in`, you can buy a dedicated domain just for this event (for example, `tekathon.online` or `tekathon2026.com` which usually cost about $1 to $3 for the first year on Namecheap or Hostinger).
1. Buy the domain.
2. Go to your [Resend Domains Dashboard](https://resend.com/domains) and click **Add Domain**.
3. Type in your new domain (e.g., `tekathon.online`).
4. Resend will generate a list of DNS records. Copy these and paste them into your domain registrar's DNS settings.
5. Once verified (usually takes 5 minutes), we will update the backend code to send emails from `no-reply@tekathon.online`. Now you can send emails to ANY address in the world for free!

### Option 2: Ask University IT for a Subdomain
If you must use the official university branding:
1. Go to your [Resend Domains Dashboard](https://resend.com/domains) and click **Add Domain**.
2. Add a subdomain, like `tekathon.cuchd.in`.
3. Resend will give you the DNS records.
4. Email your university IT department, provide them the DNS records, and ask them to add them to `tekathon.cuchd.in`.
5. Once they do this, you can send emails from `admin@tekathon.cuchd.in`.

### Option 3: Upgrade Render (Bypass Resend Entirely)
If you don't want to buy a domain and don't want to deal with university IT, you can **abandon Resend and go back to using your Gmail App Password**.
1. Upgrade your Render Web Service backend to the **Starter Tier ($7/month)**.
2. This completely drops the firewall that was blocking Gmail.
3. I can easily revert the backend code to use your original Gmail SMTP setup. This requires zero domain verification because Google already verified your login credentials.

---

**Summary:** You cannot verify `cuchd.in` without DNS access. You either need to verify a domain you *do* own, or upgrade Render to use the Gmail SMTP you already configured.
