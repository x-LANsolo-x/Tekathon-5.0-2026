import './globals.css';
import Script from 'next/script';
export const metadata = {
  title: 'Tekathon 5.0 Platforms',
  description: 'Participant, Evaluator, and Super Admin Portals for Tekathon 5.0',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Orbitron:wght@400;500;700;900&family=Share+Tech+Mono&family=Fira+Code&family=Montserrat:wght@300;500;700;900&family=Outfit:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        {children}
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js" strategy="beforeInteractive" />
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.1/vanilla-tilt.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
