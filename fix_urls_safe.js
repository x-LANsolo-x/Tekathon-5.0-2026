const fs = require('fs');

const frontendPath = '/home/nocturn/OAA/Tekathon5.0/tekathon-frontend/src/app';

// 1. Participant Portal
let partContent = fs.readFileSync(`${frontendPath}/page.js`, 'utf8');
partContent = partContent.replace(
  /const BASE_URL = 'http:\/\/localhost:5000\/api\/participant';/g,
  "const BASE_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/participant` : 'http://localhost:5000/api/participant';"
);
fs.writeFileSync(`${frontendPath}/page.js`, partContent);

function safelyReplaceFetch(content) {
  if (!content.includes('const API_URL =')) {
    content = content.replace(
      'export default function',
      "const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';\n\nexport default function"
    );
  }

  content = content.replace(/fetch\('http:\/\/localhost:5000([^']+)'\)/g, "fetch(`${API_URL}$1`, { credentials: 'include' })");
  content = content.replace(/fetch\(`http:\/\/localhost:5000([^`]+)`\)/g, "fetch(`${API_URL}$1`, { credentials: 'include' })");
  
  content = content.replace(/fetch\('http:\/\/localhost:5000([^']+)',\s*\{/g, "fetch(`${API_URL}$1`, { credentials: 'include',");
  content = content.replace(/fetch\(`http:\/\/localhost:5000([^`]+)`,\s*\{/g, "fetch(`${API_URL}$1`, { credentials: 'include',");

  return content;
}

let evalContent = fs.readFileSync(`${frontendPath}/evaluator/page.js`, 'utf8');
evalContent = safelyReplaceFetch(evalContent);
fs.writeFileSync(`${frontendPath}/evaluator/page.js`, evalContent);

let superContent = fs.readFileSync(`${frontendPath}/superadmin/page.js`, 'utf8');
superContent = safelyReplaceFetch(superContent);
fs.writeFileSync(`${frontendPath}/superadmin/page.js`, superContent);

console.log('Done!');
