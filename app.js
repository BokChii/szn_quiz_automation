// 디버깅 모드 (개발 시 true, 프로덕션에서는 false)
const DEBUG_MODE = true;

// 디버깅 로그 함수
function debugLog(category, message, data = null) {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${category}] ${message}`;
    console.log(logMessage, data || '');
  }
}

// 오류 로그 함수
function errorLog(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${message}`, error);
}

// 앱 상태 관리
const AppState = {
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
  QUIZ: 'QUIZ',
  RESULT: 'RESULT',
  QUIZ_LIST: 'QUIZ_LIST'
};

// 전역 상태
let state = AppState.IDLE;
let images = [];
let questionCount = 5;
let questions = [];
let finalScore = 0;
let currentQuizId = null; // 현재 생성 중인 퀴즈 ID
let currentProjectId = null; // 현재 선택된 프로젝트 ID

// DOM 요소 검증 및 초기화
function validateDOMElements() {
  const requiredElements = {
    'idle-state': document.getElementById('idle-state'),
    'processing-state': document.getElementById('processing-state'),
    'quiz-state': document.getElementById('quiz-state'),
    'result-state': document.getElementById('result-state'),
    'file-input': document.getElementById('file-input'),
    'image-preview': document.getElementById('image-preview'),
    'generate-btn': document.getElementById('generate-btn'),
    'error-message': document.getElementById('error-message')
  };

  const missing = [];
  for (const [name, element] of Object.entries(requiredElements)) {
    if (!element) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    errorLog('필수 DOM 요소가 없습니다', missing);
    throw new Error(`필수 DOM 요소가 없습니다: ${missing.join(', ')}`);
  }

  debugLog('DOM', '모든 필수 DOM 요소 확인 완료');
  return requiredElements;
}

// DOM 요소
let idleState, processingState, quizState, resultState, fileInput, imagePreview, questionCountBtns, generateBtn, errorMessage;

try {
  const elements = validateDOMElements();
  idleState = elements['idle-state'];
  processingState = elements['processing-state'];
  quizState = elements['quiz-state'];
  resultState = elements['result-state'];
  fileInput = elements['file-input'];
  imagePreview = elements['image-preview'];
  generateBtn = elements['generate-btn'];
  errorMessage = elements['error-message'];
  questionCountBtns = document.querySelectorAll('.question-count-btn');
  
  debugLog('INIT', '앱 초기화 시작');
} catch (error) {
  errorLog('앱 초기화 실패', error);
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>오류가 발생했습니다</h1><p>페이지를 새로고침해주세요.</p></div>';
  throw error;
}

// 브라우저 호환성 체크
function checkBrowserCompatibility() {
  const features = {
    'FileReader': typeof FileReader !== 'undefined',
    'fetch': typeof fetch !== 'undefined',
    'Promise': typeof Promise !== 'undefined',
    'Array.from': typeof Array.from !== 'undefined',
    'querySelector': typeof document.querySelector !== 'undefined',
    'Canvas': typeof HTMLCanvasElement !== 'undefined'
  };

  const unsupported = Object.entries(features)
    .filter(([_, supported]) => !supported)
    .map(([name]) => name);

  if (unsupported.length > 0) {
    errorLog('브라우저 호환성 문제', unsupported);
    showError(`이 브라우저는 지원되지 않습니다. 다음 기능이 필요합니다: ${unsupported.join(', ')}`);
    return false;
  }

  debugLog('COMPAT', '브라우저 호환성 확인 완료');
  return true;
}

// 이미지 압축 및 리사이징 함수
function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.8, maxSizeMB = 2) {
  return new Promise((resolve, reject) => {
    try {
      debugLog('COMPRESS', '이미지 압축 시작', { 
        fileName: file.name, 
        originalSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        maxWidth,
        maxHeight,
        quality
      });

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            // 원본 크기
            let width = img.width;
            let height = img.height;
            const originalSize = file.size;

            // 비율 유지하면서 크기 조정
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.floor(width * ratio);
              height = Math.floor(height * ratio);
              debugLog('COMPRESS', '이미지 크기 조정', { 
                original: `${img.width}x${img.height}`, 
                resized: `${width}x${height}` 
              });
            }

            // Canvas 생성 및 이미지 그리기
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // 이미지 품질 향상을 위한 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 배경을 흰색으로 설정 (투명도 처리)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            // 이미지 그리기
            ctx.drawImage(img, 0, 0, width, height);

            // 품질 조정하여 압축
            let currentQuality = quality;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            let compressedSize = (compressedDataUrl.length * 3) / 4; // base64 크기 추정

            // 목표 크기(2MB) 이하로 압축
            const targetSize = maxSizeMB * 1024 * 1024;
            let attempts = 0;
            const maxAttempts = 10;

            while (compressedSize > targetSize && currentQuality > 0.1 && attempts < maxAttempts) {
              currentQuality -= 0.1;
              compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
              compressedSize = (compressedDataUrl.length * 3) / 4;
              attempts++;
              debugLog('COMPRESS', '압축 재시도', { 
                quality: currentQuality.toFixed(2), 
                size: (compressedSize / 1024 / 1024).toFixed(2) + 'MB',
                attempts 
              });
            }

            const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            debugLog('COMPRESS', '이미지 압축 완료', { 
              originalSize: (originalSize / 1024 / 1024).toFixed(2) + 'MB',
              compressedSize: (compressedSize / 1024 / 1024).toFixed(2) + 'MB',
              compressionRatio: compressionRatio + '%',
              finalQuality: currentQuality.toFixed(2)
            });

            resolve(compressedDataUrl);
          } catch (error) {
            errorLog('이미지 압축 처리 실패', error);
            // 압축 실패 시 원본 반환
            resolve(e.target.result);
          }
        };

        img.onerror = (error) => {
          errorLog('이미지 로드 실패', error);
          reject(new Error('이미지를 로드할 수 없습니다.'));
        };

        img.src = e.target.result;
      };

      reader.onerror = (error) => {
        errorLog('파일 읽기 실패', error);
        reject(new Error('파일을 읽을 수 없습니다.'));
      };

      reader.readAsDataURL(file);
    } catch (error) {
      errorLog('이미지 압축 초기화 실패', error);
      reject(error);
    }
  });
}

// 이미지 업로드 처리
async function handleFileSelect(e) {
  try {
    debugLog('FILE', '파일 선택 이벤트', { fileCount: e.target.files.length });
    const files = Array.from(e.target.files);
    await handleFiles(files);
  } catch (error) {
    errorLog('파일 선택 처리 실패', error);
    showError('파일을 읽는 중 오류가 발생했습니다.');
  }
}

// 파일 입력 이벤트 리스너
if (fileInput) {
  fileInput.addEventListener('change', handleFileSelect);
  debugLog('INIT', '파일 입력 이벤트 리스너 등록 완료');
} else {
  errorLog('파일 입력 요소를 찾을 수 없습니다', null);
}

// 드래그 앤 드롭
const uploader = document.querySelector('#image-uploader label');
const uploaderContainer = document.querySelector('#image-uploader');

if (uploader) {
  // label에 for="file-input" 속성이 있어서 HTML 기본 동작으로 파일 선택 창이 열립니다.
  // 추가 클릭 이벤트 리스너는 필요 없습니다.

  // 드래그 오버
  uploader.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploader.classList.add('bg-indigo-200');
    debugLog('DRAG', '드래그 오버');
  });

  // 드래그 리브
  uploader.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploader.classList.remove('bg-indigo-200');
    debugLog('DRAG', '드래그 리브');
  });

  // 드롭
  uploader.addEventListener('drop', async (e) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      uploader.classList.remove('bg-indigo-200');
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      debugLog('DRAG', '파일 드롭', { fileCount: files.length });
      if (files.length > 0) {
        await handleFiles(files);
      } else {
        showError('이미지 파일만 업로드할 수 있습니다.');
      }
    } catch (error) {
      errorLog('드래그 앤 드롭 처리 실패', error);
      showError('파일을 드롭하는 중 오류가 발생했습니다.');
    }
  });

  // 컨테이너에도 드래그 이벤트 추가 (더 넓은 영역 커버)
  if (uploaderContainer) {
    uploaderContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    uploaderContainer.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        await handleFiles(files);
      }
    });
  }

  debugLog('INIT', '드래그 앤 드롭 이벤트 리스너 등록 완료');
} else {
  errorLog('업로더 요소를 찾을 수 없습니다', null);
}

async function handleFiles(files) {
  if (!files || files.length === 0) {
    debugLog('FILE', '처리할 파일이 없습니다');
    return;
  }

  debugLog('FILE', '파일 처리 시작', { count: files.length });
  let processedCount = 0;
  let errorCount = 0;

  // 처리 중 메시지 표시
  const processingMessage = document.createElement('div');
  processingMessage.className = 'mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm font-bold text-center';
  processingMessage.innerHTML = '⏳ 이미지를 압축하고 있습니다...';
  const imagePreviewContainer = document.getElementById('image-preview');
  if (imagePreviewContainer && imagePreviewContainer.parentNode) {
    imagePreviewContainer.parentNode.insertBefore(processingMessage, imagePreviewContainer);
  }

  // 파일들을 순차적으로 처리
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // 파일 타입 검증
      if (!file.type.startsWith('image/')) {
        debugLog('FILE', '이미지가 아닌 파일 건너뜀', { fileName: file.name, type: file.type });
        errorCount++;
        continue;
      }

      // 파일 크기 검증 (50MB 제한 - 압축 후 처리 가능)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        debugLog('FILE', '파일 크기 초과', { fileName: file.name, size: file.size });
        errorCount++;
        showError(`${file.name} 파일이 너무 큽니다. (최대 50MB)`);
        continue;
      }

      // 이미지 압축 (원본이 1MB 이상이거나 너무 큰 경우)
      const shouldCompress = file.size > 1024 * 1024; // 1MB 이상
      let base64;

      if (shouldCompress) {
        try {
          base64 = await compressImage(file, 1920, 1920, 0.8, 2);
          debugLog('FILE', '이미지 압축 완료', { fileName: file.name });
        } catch (compressError) {
          errorLog('이미지 압축 실패, 원본 사용', compressError);
          // 압축 실패 시 원본 사용
          const reader = new FileReader();
          base64 = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      } else {
        // 작은 파일은 그대로 사용
        const reader = new FileReader();
        base64 = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (!base64) {
        throw new Error('파일 읽기 결과가 없습니다');
      }

      images.push(base64);
      processedCount++;
      debugLog('FILE', '이미지 로드 완료', { 
        index: processedCount, 
        total: files.length,
        fileName: file.name
      });

      // 진행 상황 업데이트
      if (processingMessage) {
        processingMessage.innerHTML = `⏳ 이미지 처리 중... (${processedCount}/${files.length})`;
      }

      renderImagePreview();
      updateGenerateButton();
    } catch (error) {
      errorLog('파일 처리 실패', error);
      errorCount++;
      showError(`${file.name} 파일을 처리하는 중 오류가 발생했습니다.`);
    }
  }

  // 처리 완료 메시지 제거
  if (processingMessage && processingMessage.parentNode) {
    processingMessage.remove();
  }

  if (errorCount > 0) {
    debugLog('FILE', '일부 파일 처리 실패', { errorCount, total: files.length });
    if (processedCount === 0) {
      showError('모든 파일 처리에 실패했습니다. 파일 형식과 크기를 확인해주세요.');
    } else {
      showError(`${errorCount}개의 파일 처리에 실패했습니다.`);
    }
  } else if (processedCount > 0) {
    debugLog('FILE', '모든 파일 처리 완료', { processedCount });
  }
}

function renderImagePreview() {
  try {
    debugLog('RENDER', '이미지 미리보기 렌더링 시작', { imageCount: images.length });
    imagePreview.innerHTML = '';
    
    if (images.length === 0) {
      debugLog('RENDER', '표시할 이미지가 없습니다');
      return;
    }

    images.forEach((src, idx) => {
      try {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
          <img src="${src}" alt="Webtoon ${idx + 1}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3E이미지 로드 실패%3C/text%3E%3C/svg%3E';" />
          <button 
            class="remove-btn"
            data-index="${idx}"
            title="삭제"
          >
            ×
          </button>
        `;
        imagePreview.appendChild(div);
      } catch (error) {
        errorLog('이미지 미리보기 항목 생성 실패', error);
      }
    });

    // 삭제 버튼 이벤트 리스너
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        try {
          const button = e.target.closest('button');
          if (!button) return;
          
          const index = parseInt(button.dataset.index);
          if (isNaN(index) || index < 0 || index >= images.length) {
            errorLog('잘못된 이미지 인덱스', { index, imageCount: images.length });
            return;
          }
          
          debugLog('IMAGE', '이미지 삭제', { index });
          images.splice(index, 1);
          renderImagePreview();
          updateGenerateButton();
        } catch (error) {
          errorLog('이미지 삭제 실패', error);
        }
      });
    });

    debugLog('RENDER', '이미지 미리보기 렌더링 완료');
  } catch (error) {
    errorLog('이미지 미리보기 렌더링 실패', error);
  }
}

// 문제 수 선택
questionCountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    try {
      const count = parseInt(btn.dataset.count);
      if (isNaN(count) || count < 3 || count > 10) {
        errorLog('잘못된 문제 수', { count });
        return;
      }
      
      questionCount = count;
      debugLog('SETTING', '문제 수 변경', { questionCount });
      
      questionCountBtns.forEach(b => {
        if (parseInt(b.dataset.count) === questionCount) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    } catch (error) {
      errorLog('문제 수 선택 처리 실패', error);
    }
  });
});

// 생성 버튼 업데이트
function updateGenerateButton() {
  try {
    // generate-btn 클래스는 HTML에 이미 있으므로 유지
    // disabled 상태만 변경하면 CSS의 :disabled 선택자가 자동으로 스타일 적용
    generateBtn.disabled = images.length === 0;
    debugLog('UI', '생성 버튼 상태 업데이트', { enabled: images.length > 0 });
  } catch (error) {
    errorLog('생성 버튼 업데이트 실패', error);
  }
}

// 퀴즈 생성
generateBtn.addEventListener('click', async () => {
  try {
    debugLog('QUIZ', '퀴즈 생성 시작', { imageCount: images.length, questionCount });
    
    if (images.length === 0) {
      showError("최소 한 장 이상의 스크린샷을 업로드해주세요!");
      return;
    }

    if (!window.GEMINI_API_KEY) {
      errorLog('API 키가 설정되지 않음', null);
      showError("API 키가 설정되지 않았습니다. config.js 파일을 확인해주세요.");
      return;
    }
    
    // 프로젝트 선택 확인
    const selectedProject = ProjectService.getSelected();
    if (!selectedProject) {
      showError("프로젝트를 먼저 선택해주세요.");
      return;
    }
    currentProjectId = selectedProject.id;
    
    hideError();
    setState(AppState.PROCESSING);
    
    const startTime = Date.now();
    const generated = await generateWebtoonQuiz(images, questionCount);
    const duration = Date.now() - startTime;
    
    debugLog('QUIZ', '퀴즈 생성 완료', { 
      questionCount: generated.length, 
      duration: `${duration}ms` 
    });
    
    // 생성된 퀴즈 검증
    if (!Array.isArray(generated) || generated.length === 0) {
      throw new Error('생성된 퀴즈가 올바르지 않습니다.');
    }

    // 각 퀴즈 항목 검증
    for (let i = 0; i < generated.length; i++) {
      const q = generated[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 3 || 
          typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 2 ||
          !q.explanation) {
        errorLog('퀴즈 항목 검증 실패', { index: i, question: q });
        throw new Error(`퀴즈 ${i + 1}번 항목이 올바르지 않습니다.`);
      }
    }
    
    questions = generated;
    setState(AppState.QUIZ);
  } catch (err) {
    errorLog('퀴즈 생성 실패', err);
    const errorMessage = err.message || "퀴즈를 생성하는 데 실패했습니다.";
    showError(`${errorMessage} 이미지 화질을 확인하거나 잠시 후 다시 시도해주세요.`);
    setState(AppState.IDLE);
  }
});

// 상태 변경
function setState(newState) {
  try {
    debugLog('STATE', '상태 변경', { from: state, to: newState });
    state = newState;
    
    idleState.classList.add('hidden');
    processingState.classList.add('hidden');
    quizState.classList.add('hidden');
    resultState.classList.add('hidden');
    const quizListState = document.getElementById('quiz-list-state');
    if (quizListState) quizListState.classList.add('hidden');
    
    switch (state) {
      case AppState.IDLE:
        idleState.classList.remove('hidden');
        break;
      case AppState.PROCESSING:
        processingState.classList.remove('hidden');
        break;
      case AppState.QUIZ:
        quizState.classList.remove('hidden');
        renderQuiz();
        break;
      case AppState.RESULT:
        resultState.classList.remove('hidden');
        renderResult();
        break;
      case AppState.QUIZ_LIST:
        if (quizListState) quizListState.classList.remove('hidden');
        break;
      default:
        errorLog('알 수 없는 상태', { state });
    }
  } catch (error) {
    errorLog('상태 변경 실패', error);
  }
}

// 퀴즈 렌더링
let currentQuestionIndex = 0;
let selectedIdx = null;
let score = 0;
let showExplanation = false;

function renderQuiz() {
  try {
    debugLog('QUIZ', '퀴즈 렌더링 시작', { questionCount: questions.length });
    currentQuestionIndex = 0;
    selectedIdx = null;
    score = 0;
    showExplanation = false;
    renderCurrentQuestion();
  } catch (error) {
    errorLog('퀴즈 렌더링 실패', error);
    showError('퀴즈를 표시하는 중 오류가 발생했습니다.');
  }
}

function renderCurrentQuestion() {
  try {
    if (!questions || questions.length === 0) {
      throw new Error('퀴즈 데이터가 없습니다.');
    }

    if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
      throw new Error(`잘못된 문제 인덱스: ${currentQuestionIndex}`);
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      throw new Error(`문제 ${currentQuestionIndex + 1}번 데이터가 없습니다.`);
    }

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    debugLog('QUIZ', '현재 문제 렌더링', { 
      index: currentQuestionIndex + 1, 
      total: questions.length,
      progress: `${Math.round(progress)}%`
    });
    
    // XSS 방지를 위한 이스케이프 함수
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    quizState.innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-header">
          <span class="quiz-progress-label">
            문제 ${currentQuestionIndex + 1} / ${questions.length}
          </span>
          <span class="quiz-progress-percent">
            진행률 ${Math.round(progress)}%
          </span>
        </div>
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>

      <h2 class="quiz-question">
        ${escapeHtml(currentQuestion.question)}
      </h2>

      <div class="quiz-options" id="options-container">
        ${currentQuestion.options.map((option, idx) => {
          let buttonClass = "quiz-option";
          if (selectedIdx !== null) {
            if (idx === currentQuestion.correctIndex) {
              buttonClass += " correct";
            } else if (idx === selectedIdx) {
              buttonClass += " incorrect";
            } else {
              buttonClass += " disabled";
            }
          }
          
          return `
            <button
              class="${buttonClass}"
              data-index="${idx}"
              ${selectedIdx !== null ? 'disabled' : ''}
            >
              <span class="quiz-option-number">${idx + 1}</span>
              <span>${escapeHtml(option)}</span>
            </button>
          `;
        }).join('')}
      </div>

      ${showExplanation ? `
        <div class="quiz-explanation">
          <p class="quiz-explanation-result ${selectedIdx === currentQuestion.correctIndex ? 'correct' : 'incorrect'}">
            ${selectedIdx === currentQuestion.correctIndex ? '정답입니다!' : '아쉽네요!'}
          </p>
          <p class="quiz-explanation-text">
            <span class="quiz-explanation-label">해설:</span> ${escapeHtml(currentQuestion.explanation)}
          </p>
          <button
            id="next-question-btn"
            class="quiz-next-btn"
          >
            ${currentQuestionIndex === questions.length - 1 ? '결과 확인하기' : '다음 문제로'}
          </button>
        </div>
      ` : ''}
    `;
    
    // 옵션 버튼 이벤트 리스너
    if (selectedIdx === null) {
      document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          try {
            const idx = parseInt(btn.dataset.index);
            if (isNaN(idx) || idx < 0 || idx > 2) {
              errorLog('잘못된 선택지 인덱스', { idx });
              return;
            }
            handleSelectOption(idx);
          } catch (error) {
            errorLog('선택지 클릭 처리 실패', error);
          }
        });
      });
    }
    
    // 다음 문제 버튼
    if (showExplanation) {
      const nextBtn = document.getElementById('next-question-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', nextQuestion);
      } else {
        errorLog('다음 문제 버튼을 찾을 수 없습니다', null);
      }
    }
  } catch (error) {
    errorLog('현재 문제 렌더링 실패', error);
    showError('문제를 표시하는 중 오류가 발생했습니다.');
  }
}

function handleSelectOption(idx) {
  try {
    if (selectedIdx !== null) {
      debugLog('QUIZ', '이미 선택된 문제', { idx });
      return;
    }
    
    selectedIdx = idx;
    showExplanation = true;
    const isCorrect = idx === questions[currentQuestionIndex].correctIndex;
    
    if (isCorrect) {
      score++;
      debugLog('QUIZ', '정답 선택', { 
        questionIndex: currentQuestionIndex + 1, 
        score, 
        total: questions.length 
      });
    } else {
      debugLog('QUIZ', '오답 선택', { 
        questionIndex: currentQuestionIndex + 1,
        selected: idx,
        correct: questions[currentQuestionIndex].correctIndex
      });
    }
    
    renderCurrentQuestion();
  } catch (error) {
    errorLog('선택지 처리 실패', error);
  }
}

function nextQuestion() {
  try {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      selectedIdx = null;
      showExplanation = false;
      debugLog('QUIZ', '다음 문제로 이동', { 
        currentIndex: currentQuestionIndex + 1, 
        total: questions.length 
      });
      renderCurrentQuestion();
    } else {
      finalScore = score;
      debugLog('QUIZ', '퀴즈 완료', { 
        finalScore, 
        total: questions.length,
        percentage: `${Math.round((finalScore / questions.length) * 100)}%`
      });
      setState(AppState.RESULT);
    }
  } catch (error) {
    errorLog('다음 문제 이동 실패', error);
  }
}

// 결과 렌더링
function renderResult() {
  try {
    debugLog('RESULT', '결과 화면 렌더링 시작', { 
      score: finalScore, 
      total: questions.length 
    });
    
    const scoreText = finalScore === questions.length 
      ? "완벽해요! 이 웹툰의 진정한 팬이시군요!" 
      : finalScore > questions.length / 2 
      ? "훌륭합니다! 세부적인 내용까지 잘 파악하고 계시네요." 
      : "나쁘지 않아요! 웹툰을 다시 정주행하고 도전해보는 건 어떨까요?";
    
    resultState.innerHTML = `
      <div class="result-container">
        <div class="result-icon">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        
        <h2 class="result-title">퀴즈 종료!</h2>
        <div class="result-score">
          <div class="result-score-number">
            ${finalScore} / ${questions.length}
          </div>
          <p class="result-score-label">최종 점수</p>
        </div>

        <p class="result-message">
          ${escapeHtml(scoreText)}
        </p>

        ${!currentQuizId ? `
          <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f1f5f9; border-radius: 0.75rem; border: 2px solid #e2e8f0;">
            <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.75rem; font-weight: 600;">퀴즈를 저장하려면 회차명을 입력하세요</p>
            <button
              id="save-quiz-btn"
              class="btn-primary"
              style="width: 100%;"
            >
              회차명 입력 및 저장
            </button>
          </div>
        ` : ''}

        <div class="result-actions">
          <button id="retry-btn" class="btn-secondary">
            다시 시도
          </button>
          <button id="new-quiz-btn" class="btn-primary">
            새로운 퀴즈 만들기
          </button>
        </div>
      </div>
    `;
    
    const retryBtn = document.getElementById('retry-btn');
    const newQuizBtn = document.getElementById('new-quiz-btn');
    const saveQuizBtn = document.getElementById('save-quiz-btn');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        debugLog('RESULT', '다시 시도 클릭');
        setState(AppState.QUIZ);
      });
    }
    
    if (newQuizBtn) {
      newQuizBtn.addEventListener('click', () => {
        debugLog('RESULT', '새로운 퀴즈 만들기 클릭');
        resetQuiz();
        setState(AppState.IDLE);
      });
    }
    
    if (saveQuizBtn) {
      saveQuizBtn.addEventListener('click', () => {
        // 프로젝트가 선택되어 있는지 확인
        const selectedProject = ProjectService.getSelected();
        if (!selectedProject) {
          showError('프로젝트를 먼저 선택해주세요.');
          return;
        }
        // 회차명 입력 모달 열기
        openEpisodeModalForSave();
      });
    }
  } catch (error) {
    errorLog('결과 화면 렌더링 실패', error);
    showError('결과를 표시하는 중 오류가 발생했습니다.');
  }
}

function resetQuiz() {
  images = [];
  questions = [];
  questionCount = 5;
  currentQuizId = null;
  renderImagePreview();
  updateGenerateButton();
  questionCountBtns.forEach((btn, idx) => {
    if (idx === 1) { // 5개가 기본값
      btn.classList.add('active');
      btn.classList.remove('active');
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function openEpisodeModalForSave() {
  const modal = document.getElementById('episode-modal');
  const input = document.getElementById('episode-name-input');
  
  if (!modal || !input) return;
  
  currentEditingQuiz = null; // 새로 저장할 퀴즈
  input.value = '';
  input.focus();
  modal.classList.remove('hidden');
  
  // 모달 확인 버튼 이벤트를 임시로 변경
  const confirmBtn = document.getElementById('episode-modal-confirm');
  if (confirmBtn) {
    const originalHandler = confirmBtn.onclick;
    confirmBtn.onclick = () => {
      handleSaveQuiz();
    };
  }
}

function handleSaveQuiz() {
  const input = document.getElementById('episode-name-input');
  if (!input) return;
  
  const episodeName = input.value.trim();
  if (!episodeName) {
    showError('회차명을 입력해주세요.');
    return;
  }
  
  const selectedProject = ProjectService.getSelected();
  if (!selectedProject) {
    showError('프로젝트를 선택해주세요.');
    return;
  }
  
  if (questions.length === 0) {
    showError('저장할 퀴즈가 없습니다.');
    return;
  }
  
  try {
    const quiz = QuizService.create(selectedProject.id, episodeName, questions);
    currentQuizId = quiz.id;
    
    // 점수 저장
    QuizService.update(quiz.id, { score: finalScore });
    
    renderHistoryList();
    closeEpisodeModal();
    
    // 결과 화면 다시 렌더링 (저장 버튼 제거)
    renderResult();
    
    debugLog('QUIZ', '퀴즈 저장 완료', { quizId: quiz.id, episodeName });
  } catch (error) {
    errorLog('퀴즈 저장 실패', error);
    showError(error.message || '퀴즈 저장에 실패했습니다.');
  }
}

// 에러 메시지
function showError(message) {
  try {
    if (!errorMessage) {
      console.error('에러 메시지 요소를 찾을 수 없습니다:', message);
      return;
    }
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    errorLog('UI', '에러 메시지 표시', { message });
  } catch (error) {
    console.error('에러 메시지 표시 실패:', error);
  }
}

function hideError() {
  try {
    if (errorMessage) {
      errorMessage.classList.add('hidden');
    }
  } catch (error) {
    console.error('에러 메시지 숨기기 실패:', error);
  }
}

// 전역 오류 핸들러
window.addEventListener('error', (event) => {
  errorLog('전역 오류 발생', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorLog('처리되지 않은 Promise 거부', event.reason);
});

// 초기화
try {
  if (checkBrowserCompatibility()) {
    // API 키 확인
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY.trim() === '') {
      const apiKeyWarning = document.createElement('div');
      apiKeyWarning.style.cssText = 'margin-top: 1rem; padding: 1rem; background: #fef3c7; border: 1px solid #fde68a; border-radius: 0.75rem; color: #92400e; font-size: 0.875rem; font-weight: 700; text-align: center;';
      apiKeyWarning.innerHTML = '⚠️ API 키가 설정되지 않았습니다. <code style="background: #fef9c3; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">config.js</code> 파일에서 Gemini API 키를 설정해주세요.';
      const idleStateContent = document.querySelector('#idle-state');
      if (idleStateContent && !document.querySelector('.api-key-warning')) {
        apiKeyWarning.classList.add('api-key-warning');
        idleStateContent.insertBefore(apiKeyWarning, idleStateContent.firstChild);
        errorLog('API 키 미설정 경고 표시', null);
      }
    } else {
      debugLog('INIT', 'API 키 확인 완료');
    }

    updateGenerateButton();
    
    // 새로운 기능 초기화
    initProjectManagement();
    initHistoryManagement();
    initExcelExport();
    initModals();
    
    debugLog('INIT', '앱 초기화 완료');
  }
} catch (error) {
  errorLog('앱 초기화 중 오류 발생', error);
  showError('앱을 초기화하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
}

// ============================================
// 프로젝트 관리 기능
// ============================================

function initProjectManagement() {
  const projectList = document.getElementById('project-list');
  const newProjectBtn = document.getElementById('new-project-btn');
  const projectSelect = document.getElementById('project-select');
  const createProjectBtn = document.getElementById('create-project-btn');
  
  if (!projectList || !newProjectBtn) return;
  
  // 프로젝트 목록 렌더링
  renderProjectList();
  renderProjectSelect();
  
  // 새 프로젝트 버튼
  newProjectBtn.addEventListener('click', () => {
    openProjectModal();
  });
  
  // 프로젝트 선택 드롭다운
  if (projectSelect) {
    projectSelect.addEventListener('change', (e) => {
      const projectId = e.target.value;
      if (projectId) {
        ProjectService.select(projectId);
        currentProjectId = projectId;
        renderProjectList();
        debugLog('PROJECT', '프로젝트 선택', { projectId });
      }
    });
  }
  
  // 프로젝트 생성 버튼 (중앙 패널)
  if (createProjectBtn) {
    createProjectBtn.addEventListener('click', () => {
      openProjectModal();
    });
  }
  
  // 초기 선택된 프로젝트 로드
  const selectedProject = ProjectService.getSelected();
  if (selectedProject) {
    currentProjectId = selectedProject.id;
    if (projectSelect) {
      projectSelect.value = selectedProject.id;
    }
  }
}

function renderProjectList() {
  const projectList = document.getElementById('project-list');
  if (!projectList) return;
  
  const projects = ProjectService.getAll();
  const selectedProject = ProjectService.getSelected();
  
  if (projects.length === 0) {
    projectList.innerHTML = '<p style="color: #94a3b8; font-size: 0.875rem; text-align: center; padding: 1rem;">프로젝트가 없습니다</p>';
    return;
  }
  
  projectList.innerHTML = projects.map(project => {
    const isActive = selectedProject && project.id === selectedProject.id;
    const quizCount = QuizService.getAll(project.id).length;
    
    return `
      <div class="project-item ${isActive ? 'active' : ''}" data-project-id="${project.id}">
        <span class="project-item-name" title="${project.name}">${escapeHtml(project.name)}</span>
        <div class="project-item-actions">
          <button class="project-item-btn edit-project-btn" data-project-id="${project.id}" title="이름 변경">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="project-item-btn delete-project-btn" data-project-id="${project.id}" title="삭제">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // 프로젝트 선택 이벤트
  projectList.querySelectorAll('.project-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.project-item-btn')) return;
      const projectId = item.dataset.projectId;
      ProjectService.select(projectId);
      currentProjectId = projectId;
      if (document.getElementById('project-select')) {
        document.getElementById('project-select').value = projectId;
      }
      renderProjectList();
      renderHistoryList();
      debugLog('PROJECT', '프로젝트 선택', { projectId });
    });
  });
  
  // 프로젝트 편집 버튼
  projectList.querySelectorAll('.edit-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.projectId;
      const project = ProjectService.getAll().find(p => p.id === projectId);
      if (project) {
        openProjectModal(project);
      }
    });
  });
  
  // 프로젝트 삭제 버튼
  projectList.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.projectId;
      if (confirm('프로젝트를 삭제하시겠습니까? 해당 프로젝트의 모든 퀴즈도 함께 삭제됩니다.')) {
        try {
          ProjectService.delete(projectId);
          if (currentProjectId === projectId) {
            currentProjectId = null;
            const selected = ProjectService.getSelected();
            if (selected) {
              currentProjectId = selected.id;
            }
          }
          renderProjectList();
          renderProjectSelect();
          renderHistoryList();
          debugLog('PROJECT', '프로젝트 삭제', { projectId });
        } catch (error) {
          errorLog('프로젝트 삭제 실패', error);
          showError('프로젝트 삭제에 실패했습니다.');
        }
      }
    });
  });
}

function renderProjectSelect() {
  const projectSelect = document.getElementById('project-select');
  if (!projectSelect) return;
  
  const projects = ProjectService.getAll();
  const selectedProject = ProjectService.getSelected();
  
  projectSelect.innerHTML = '<option value="">프로젝트를 선택하세요</option>' +
    projects.map(project => 
      `<option value="${project.id}" ${selectedProject && project.id === selectedProject.id ? 'selected' : ''}>${escapeHtml(project.name)}</option>`
    ).join('');
}

// ============================================
// 히스토리 관리 기능
// ============================================

function initHistoryManagement() {
  renderHistoryList();
}

function renderHistoryList() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  const selectedProject = ProjectService.getSelected();
  const quizzes = QuizService.getAll(selectedProject ? selectedProject.id : null);
  
  if (quizzes.length === 0) {
    historyList.innerHTML = '<p style="color: #94a3b8; font-size: 0.875rem; text-align: center; padding: 1rem;">히스토리가 없습니다</p>';
    return;
  }
  
  historyList.innerHTML = quizzes.map(quiz => {
    const project = ProjectService.getAll().find(p => p.id === quiz.projectId);
    const date = new Date(quiz.createdAt);
    const dateStr = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="history-item" data-quiz-id="${quiz.id}">
        <div class="history-item-header">
          <div class="history-item-title">${escapeHtml(quiz.episodeName)}</div>
          <div class="history-item-actions">
            <button class="history-item-btn edit-episode-btn" data-quiz-id="${quiz.id}" title="회차명 수정">✏️</button>
            <button class="history-item-btn download-excel-btn" data-quiz-id="${quiz.id}" title="엑셀 다운로드">📥</button>
          </div>
        </div>
        <div class="history-item-meta">
          <span>${project ? escapeHtml(project.name) : '프로젝트 없음'}</span>
          <span>•</span>
          <span>${quiz.questionCount}문제</span>
          <span>•</span>
          <span>${dateStr} ${timeStr}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // 히스토리 항목 클릭
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.history-item-btn')) return;
      const quizId = item.dataset.quizId;
      showQuizList(quizId);
    });
  });
  
  // 회차명 수정 버튼
  historyList.querySelectorAll('.edit-episode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const quizId = btn.dataset.quizId;
      const quiz = QuizService.getById(quizId);
      if (quiz) {
        openEpisodeModal(quiz);
      }
    });
  });
  
  // 엑셀 다운로드 버튼
  historyList.querySelectorAll('.download-excel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const quizId = btn.dataset.quizId;
      downloadQuizExcel(quizId);
    });
  });
}

function showQuizList(quizId) {
  const quiz = QuizService.getById(quizId);
  if (!quiz) {
    showError('퀴즈를 찾을 수 없습니다.');
    return;
  }
  
  const quizListState = document.getElementById('quiz-list-state');
  const quizListTitle = document.getElementById('quiz-list-title');
  const quizListContent = document.getElementById('quiz-list-content');
  
  if (!quizListState || !quizListContent) return;
  
  if (quizListTitle) {
    quizListTitle.textContent = `${escapeHtml(quiz.episodeName)} - 퀴즈 목록`;
  }
  
  quizListContent.innerHTML = quiz.questions.map((q, index) => {
    const correctAnswer = q.options[q.correctIndex];
    return `
      <div class="quiz-list-item">
        <div class="quiz-list-item-header">
          <div class="quiz-list-item-title">문제 ${index + 1}: ${escapeHtml(q.question)}</div>
          <div class="quiz-list-item-actions">
            <button class="history-item-btn download-excel-btn" data-quiz-id="${quiz.id}" title="엑셀 다운로드">📥</button>
          </div>
        </div>
        <div class="quiz-list-item-meta">
          <div><strong>정답:</strong> ${escapeHtml(correctAnswer)}</div>
          <div><strong>해설:</strong> ${escapeHtml(q.explanation)}</div>
        </div>
      </div>
    `;
  }).join('');
  
  setState(AppState.QUIZ_LIST);
}

// ============================================
// 엑셀 다운로드 기능
// ============================================

function initExcelExport() {
  // 프로젝트 전체 다운로드 버튼은 필요시 추가
}

function downloadQuizExcel(quizId) {
  const quiz = QuizService.getById(quizId);
  if (!quiz) {
    showError('퀴즈를 찾을 수 없습니다.');
    return;
  }
  
  try {
    const rows = formatQuizForExcel(quiz);
    const csv = convertToCSV(rows);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${escapeHtml(quiz.episodeName)}_${new Date(quiz.createdAt).toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    debugLog('EXCEL', '엑셀 다운로드 완료', { quizId, episodeName: quiz.episodeName });
  } catch (error) {
    errorLog('엑셀 다운로드 실패', error);
    showError('엑셀 다운로드에 실패했습니다.');
  }
}

function downloadProjectExcel(projectId) {
  const project = ProjectService.getAll().find(p => p.id === projectId);
  if (!project) {
    showError('프로젝트를 찾을 수 없습니다.');
    return;
  }
  
  try {
    const rows = formatProjectQuizzesForExcel(projectId);
    const csv = convertToCSV(rows);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${escapeHtml(project.name)}_전체_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    debugLog('EXCEL', '프로젝트 전체 엑셀 다운로드 완료', { projectId, projectName: project.name });
  } catch (error) {
    errorLog('프로젝트 엑셀 다운로드 실패', error);
    showError('엑셀 다운로드에 실패했습니다.');
  }
}

function convertToCSV(rows) {
  return rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell || '');
      // CSV 형식에 맞게 따옴표와 줄바꿈 처리
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
}

// ============================================
// 모달 관리
// ============================================

function initModals() {
  const projectModal = document.getElementById('project-modal');
  const episodeModal = document.getElementById('episode-modal');
  
  // 프로젝트 모달
  if (projectModal) {
    const cancelBtn = document.getElementById('project-modal-cancel');
    const confirmBtn = document.getElementById('project-modal-confirm');
    const input = document.getElementById('project-name-input');
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        closeProjectModal();
      });
    }
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        handleProjectModalConfirm();
      });
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleProjectModalConfirm();
        }
      });
    }
    
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        closeProjectModal();
      }
    });
  }
  
  // 회차명 모달
  if (episodeModal) {
    const cancelBtn = document.getElementById('episode-modal-cancel');
    const confirmBtn = document.getElementById('episode-modal-confirm');
    const input = document.getElementById('episode-name-input');
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        closeEpisodeModal();
      });
    }
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        handleEpisodeModalConfirm();
      });
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleEpisodeModalConfirm();
        }
      });
    }
    
    episodeModal.addEventListener('click', (e) => {
      if (e.target === episodeModal) {
        closeEpisodeModal();
      }
    });
  }
  
  // 새 퀴즈 만들기 버튼
  const backToCreateBtn = document.getElementById('back-to-create-btn');
  if (backToCreateBtn) {
    backToCreateBtn.addEventListener('click', () => {
      setState(AppState.IDLE);
    });
  }
}

let currentEditingProject = null;
let currentEditingQuiz = null;

function openProjectModal(project = null) {
  const modal = document.getElementById('project-modal');
  const title = document.getElementById('project-modal-title');
  const input = document.getElementById('project-name-input');
  
  if (!modal || !input) return;
  
  currentEditingProject = project;
  
  if (title) {
    title.textContent = project ? '프로젝트 이름 변경' : '새 프로젝트';
  }
  
  input.value = project ? project.name : '';
  input.focus();
  modal.classList.remove('hidden');
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  const input = document.getElementById('project-name-input');
  
  if (modal) modal.classList.add('hidden');
  if (input) input.value = '';
  currentEditingProject = null;
}

function handleProjectModalConfirm() {
  const input = document.getElementById('project-name-input');
  if (!input) return;
  
  const name = input.value.trim();
  if (!name) {
    showError('프로젝트명을 입력해주세요.');
    return;
  }
  
  try {
    if (currentEditingProject) {
      // 수정
      ProjectService.update(currentEditingProject.id, { name });
      debugLog('PROJECT', '프로젝트 수정', { id: currentEditingProject.id, name });
    } else {
      // 생성
      const project = ProjectService.create(name);
      currentProjectId = project.id;
      if (document.getElementById('project-select')) {
        document.getElementById('project-select').value = project.id;
      }
      debugLog('PROJECT', '프로젝트 생성', { id: project.id, name });
    }
    
    renderProjectList();
    renderProjectSelect();
    renderHistoryList();
    closeProjectModal();
  } catch (error) {
    errorLog('프로젝트 저장 실패', error);
    showError(error.message || '프로젝트 저장에 실패했습니다.');
  }
}

function openEpisodeModal(quiz) {
  const modal = document.getElementById('episode-modal');
  const input = document.getElementById('episode-name-input');
  
  if (!modal || !input) return;
  
  currentEditingQuiz = quiz;
  input.value = quiz.episodeName;
  input.focus();
  modal.classList.remove('hidden');
}

function closeEpisodeModal() {
  const modal = document.getElementById('episode-modal');
  const input = document.getElementById('episode-name-input');
  
  if (modal) modal.classList.add('hidden');
  if (input) input.value = '';
  currentEditingQuiz = null;
}

function handleEpisodeModalConfirm() {
  const input = document.getElementById('episode-name-input');
  if (!input) return;
  
  const episodeName = input.value.trim();
  if (!episodeName) {
    showError('회차명을 입력해주세요.');
    return;
  }
  
  // 새로 저장하는 경우
  if (!currentEditingQuiz) {
    handleSaveQuiz();
    return;
  }
  
  // 기존 퀴즈 수정하는 경우
  try {
    QuizService.update(currentEditingQuiz.id, { episodeName });
    renderHistoryList();
    closeEpisodeModal();
    debugLog('QUIZ', '회차명 수정', { quizId: currentEditingQuiz.id, episodeName });
  } catch (error) {
    errorLog('회차명 수정 실패', error);
    showError(error.message || '회차명 수정에 실패했습니다.');
  }
}

// ============================================
// 유틸리티 함수
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
