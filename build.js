// build.js
// Netlify 빌드 시 환경 변수를 HTML에 주입하는 스크립트
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build process...');

// index.html 읽기
const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Netlify 환경 변수에서 API 키 가져오기
const apiKey = process.env.GEMINI_API_KEY || '';

if (apiKey) {
  console.log('✅ GEMINI_API_KEY found in environment variables');
} else {
  console.log('⚠️  GEMINI_API_KEY not found in environment variables');
  console.log('   Make sure to set GEMINI_API_KEY in Netlify dashboard');
}

// 플레이스홀더를 실제 스크립트로 교체
const scriptToInject = `
  <script>
    // Netlify 환경 변수에서 API 키 주입 (빌드 타임)
    window.GEMINI_API_KEY = window.GEMINI_API_KEY || '${apiKey}';
  </script>
  <!-- GEMINI_API_KEY_PLACEHOLDER -->`;

if (html.includes('<!-- GEMINI_API_KEY_PLACEHOLDER -->')) {
  html = html.replace('<!-- GEMINI_API_KEY_PLACEHOLDER -->', scriptToInject);
  console.log('✅ API key placeholder found and replaced');
} else {
  // 플레이스홀더가 없으면 </body> 앞에 추가
  html = html.replace('</body>', scriptToInject + '\n</body>');
  console.log('✅ API key script injected before </body> (placeholder not found)');
}

// 수정된 HTML 저장
fs.writeFileSync(indexPath, html, 'utf8');
console.log('✅ Build script completed: API key injected into index.html');
console.log('📦 Ready for deployment');

