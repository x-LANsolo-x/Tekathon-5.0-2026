# How to Generate a Google App Password

To use Nodemailer with your Gmail account (`tekathon2026@gmail.com`), you cannot use your regular Gmail password. Google requires you to generate a special 16-character **App Password** for third-party apps like our backend server.

Follow these exact steps to generate your App Password:

## 1. Enable 2-Step Verification (If not already enabled)
Google requires 2-Step Verification to be active before you can generate App Passwords.
1. Go to your [Google Account Manage Page](https://myaccount.google.com/).
2. On the left navigation panel, click **Security**.
3. Under the *How you sign in to Google* section, look for **2-Step Verification**.
4. If it is turned off, click it, follow the on-screen prompts, and set it up using your phone number.

## 2. Generate the App Password
Once 2-Step Verification is active:
1. Go back to the **Security** tab in your Google Account.
2. In the Search bar at the top of the Google Account page, type **"App Passwords"** and click the result.
   *(Alternatively, under the 2-Step Verification settings page, scroll to the bottom to find the "App Passwords" section).*
3. You may be asked to sign in again to verify your identity.
4. You will see a prompt to create a new app password.
   - For **App**, select `Other (Custom name)` and type something like `Tekathon Backend`.
5. Click **Generate**.

## 3. Update Your `.env` File
1. Google will display a modal containing a **16-character password** (usually highlighted in a yellow box, like `abcd efgh ijkl mnop`).
2. Copy this password (you can omit the spaces).
3. Open your `/home/nocturn/OAA/Tekathon5.0/tekathon-backend/.env` file.
4. Replace the `SMTP_PASS` value with this copied password:
   ```env
   SMTP_PASS=abcdefghijklmnop
   ```
5. Save the file.
6. The backend server will automatically use this new password the next time it restarts or handles a request!

> [!WARNING]
> Do not share this App Password with anyone. It grants full access to send emails from your `tekathon2026@gmail.com` account. If you ever suspect it has been compromised, you can delete it from the App Passwords menu in your Google Account and generate a new one.
