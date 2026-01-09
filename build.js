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

// config.js 스크립트 태그 앞에 인라인 스크립트 추가
// 이미 존재하는 경우 교체, 없으면 추가
const inlineScript = `
  <script>
    // Netlify 환경 변수에서 API 키 주입 (빌드 타임)
    window.GEMINI_API_KEY = window.GEMINI_API_KEY || '${apiKey}';
  </script>`;

// </body> 태그 바로 앞에 삽입 (다른 스크립트들 앞에)
// 이미 주입 스크립트가 있는지 확인
if (html.includes('// Netlify 환경 변수에서 API 키 주입')) {
  // 기존 스크립트 교체
  html = html.replace(
    /<script>\s*\/\/ Netlify 환경 변수에서 API 키 주입[^<]*<\/script>/s,
    inlineScript.trim()
  );
} else {
  // 새로 추가 (</body> 태그 바로 앞)
  html = html.replace('</body>', inlineScript + '\n</body>');
}

// 수정된 HTML 저장
fs.writeFileSync(indexPath, html, 'utf8');
console.log('✅ Build script completed: API key injected into index.html');
console.log('📦 Ready for deployment');

