# Tekathon 5.0 OTP Email Content

When a participant signs up or attempts to log in, they receive an email from `tekathon2026@gmail.com`. The email is styled with a sleek, dark-themed design to match the Tekathon portal aesthetic.

## Email Details

- **Sender:** `"Tekathon 5.0" <tekathon2026@gmail.com>`
- **Subject:** `Tekathon 5.0 - Login Verification Code`
- **Recipient:** The `@cuchd.in` email address provided by the user.

## Visual Design

The email uses the following styling cues:

- A dark background (`#0d0e12`).
- A bright red border around the container (`#ff003c`) with rounded corners.
- The 6-digit OTP code is highlighted in a neon blue box (`#00d2ff`) with wide letter-spacing to make it highly legible.

## HTML Source Code

This is the exact HTML payload injected into the email body:

```html
<div style="font-family: Arial, sans-serif; background-color: #0d0e12; color: #ffffff; padding: 30px; text-align: center; border: 2px solid #ff003c; border-radius: 10px;">
  <h2 style="color: #ff003c;">Tekathon 5.0</h2>
  
  <p>Your session initialization code is:</p>
  
  <!-- The ${code} is dynamically replaced by the 6-digit number -->
  <h1 style="letter-spacing: 5px; font-size: 36px; color: #00d2ff; background: rgba(0,210,255,0.1); padding: 10px; display: inline-block; border-radius: 8px;">
    123456
  </h1>
  
  <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
  
  <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
</div>
```

## Modifying the Email

If you ever wish to redesign or update the wording of this email, you can find and edit this HTML template in the backend codebase at:
`tekathon-backend/routes/participant.js` (inside the `sendOTPEmail` function).
