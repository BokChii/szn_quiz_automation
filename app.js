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
  RESULT: 'RESULT'
};

// 전역 상태
let state = AppState.IDLE;
let images = [];
let questionCount = 5;
let questions = [];
let finalScore = 0;

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
    'querySelector': typeof document.querySelector !== 'undefined'
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

// 이미지 업로드 처리
function handleFileSelect(e) {
  try {
    debugLog('FILE', '파일 선택 이벤트', { fileCount: e.target.files.length });
    const files = Array.from(e.target.files);
    handleFiles(files);
  } catch (error) {
    errorLog('파일 선택 처리 실패', error);
    showError('파일을 읽는 중 오류가 발생했습니다.');
  }
}

fileInput.addEventListener('change', handleFileSelect);

// 드래그 앤 드롭
const uploader = document.querySelector('#image-uploader label');
if (uploader) {
  uploader.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploader.classList.add('bg-indigo-200');
    debugLog('DRAG', '드래그 오버');
  });

  uploader.addEventListener('dragleave', () => {
    uploader.classList.remove('bg-indigo-200');
    debugLog('DRAG', '드래그 리브');
  });

  uploader.addEventListener('drop', (e) => {
    try {
      e.preventDefault();
      uploader.classList.remove('bg-indigo-200');
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      debugLog('DRAG', '파일 드롭', { fileCount: files.length });
      handleFiles(files);
    } catch (error) {
      errorLog('드래그 앤 드롭 처리 실패', error);
      showError('파일을 드롭하는 중 오류가 발생했습니다.');
    }
  });
} else {
  errorLog('업로더 요소를 찾을 수 없습니다', null);
}

function handleFiles(files) {
  if (!files || files.length === 0) {
    debugLog('FILE', '처리할 파일이 없습니다');
    return;
  }

  debugLog('FILE', '파일 처리 시작', { count: files.length });
  let processedCount = 0;
  let errorCount = 0;

  files.forEach((file, index) => {
    try {
      // 파일 타입 검증
      if (!file.type.startsWith('image/')) {
        debugLog('FILE', '이미지가 아닌 파일 건너뜀', { fileName: file.name, type: file.type });
        errorCount++;
        return;
      }

      // 파일 크기 검증 (10MB 제한)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        debugLog('FILE', '파일 크기 초과', { fileName: file.name, size: file.size });
        errorCount++;
        showError(`${file.name} 파일이 너무 큽니다. (최대 10MB)`);
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const base64 = event.target.result;
          if (!base64) {
            throw new Error('파일 읽기 결과가 없습니다');
          }
          
          images.push(base64);
          processedCount++;
          debugLog('FILE', '이미지 로드 완료', { index: processedCount, total: files.length });
          
          renderImagePreview();
          updateGenerateButton();
        } catch (error) {
          errorLog('이미지 처리 실패', error);
          errorCount++;
        }
      };

      reader.onerror = (error) => {
        errorLog('파일 읽기 오류', error);
        errorCount++;
        showError(`${file.name} 파일을 읽는 중 오류가 발생했습니다.`);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      errorLog('파일 처리 중 예외 발생', error);
      errorCount++;
    }
  });

  if (errorCount > 0) {
    debugLog('FILE', '일부 파일 처리 실패', { errorCount, total: files.length });
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
        div.className = 'relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm';
        div.innerHTML = `
          <img src="${src}" alt="Webtoon ${idx + 1}" class="h-40 w-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3E이미지 로드 실패%3C/text%3E%3C/svg%3E';" />
          <button 
            class="remove-image-btn absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            data-index="${idx}"
            title="삭제"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        `;
        imagePreview.appendChild(div);
      } catch (error) {
        errorLog('이미지 미리보기 항목 생성 실패', error);
      }
    });

    // 삭제 버튼 이벤트 리스너
    document.querySelectorAll('.remove-image-btn').forEach(btn => {
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
          b.className = 'question-count-btn flex-1 py-3 rounded-xl border-2 transition-all font-bold bg-indigo-600 border-indigo-600 text-white';
        } else {
          b.className = 'question-count-btn flex-1 py-3 rounded-xl border-2 transition-all font-bold bg-white border-slate-200 text-slate-500 hover:border-indigo-300';
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
    if (images.length === 0) {
      generateBtn.className = 'mt-10 w-full py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-[0.98] bg-slate-200 text-slate-400 cursor-not-allowed';
      generateBtn.disabled = true;
    } else {
      generateBtn.className = 'mt-10 w-full py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-[0.98] bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200';
      generateBtn.disabled = false;
    }
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
      <div class="mb-8">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-bold text-indigo-600 uppercase tracking-wider">
            문제 ${currentQuestionIndex + 1} / ${questions.length}
          </span>
          <span class="text-sm font-medium text-slate-400">
            진행률 ${Math.round(progress)}%
          </span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-indigo-500 transition-all duration-300" style="width: ${progress}%"></div>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-slate-800 mb-8 leading-tight">
        ${escapeHtml(currentQuestion.question)}
      </h2>

      <div class="space-y-4" id="options-container">
        ${currentQuestion.options.map((option, idx) => {
          let buttonClass = "option-btn w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 text-lg font-medium ";
          if (selectedIdx === null) {
            buttonClass += "border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100";
          } else {
            if (idx === currentQuestion.correctIndex) {
              buttonClass += "border-green-500 bg-green-50 text-green-700";
            } else if (idx === selectedIdx) {
              buttonClass += "border-red-500 bg-red-50 text-red-700";
            } else {
              buttonClass += "border-slate-50 text-slate-400 opacity-60";
            }
          }
          
          return `
            <button
              class="${buttonClass}"
              data-index="${idx}"
              ${selectedIdx !== null ? 'disabled' : ''}
            >
              <div class="flex items-center gap-4">
                <span class="w-8 h-8 flex items-center justify-center rounded-full text-sm shrink-0 border-2 ${
                  selectedIdx === null ? "border-slate-200" : (idx === currentQuestion.correctIndex ? "border-green-500" : "border-slate-100")
                }">
                  ${idx + 1}
                </span>
                ${escapeHtml(option)}
              </div>
            </button>
          `;
        }).join('')}
      </div>

      ${showExplanation ? `
        <div class="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2 duration-300">
          <p class="text-slate-700 leading-relaxed">
            <span class="font-bold mr-2 ${selectedIdx === currentQuestion.correctIndex ? 'text-green-600' : 'text-red-600'}">
              ${selectedIdx === currentQuestion.correctIndex ? '정답입니다!' : '아쉽네요!'}
            </span>
            <span class="text-indigo-600 font-bold">해설:</span> ${escapeHtml(currentQuestion.explanation)}
          </p>
          <button
            id="next-question-btn"
            class="mt-6 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            ${currentQuestionIndex === questions.length - 1 ? '결과 확인하기' : '다음 문제로'}
          </button>
        </div>
      ` : ''}
    `;
    
    // 옵션 버튼 이벤트 리스너
    if (selectedIdx === null) {
      document.querySelectorAll('.option-btn').forEach(btn => {
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
    
    // XSS 방지
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    resultState.innerHTML = `
      <div class="inline-block p-4 bg-yellow-100 rounded-full mb-6">
        <svg class="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
      
      <h2 class="text-4xl font-black text-slate-800 mb-2">퀴즈 종료!</h2>
      <div class="my-8">
        <div class="text-7xl font-black text-indigo-600 mb-2">
          ${finalScore} / ${questions.length}
        </div>
        <p class="text-slate-400 font-bold uppercase tracking-widest">최종 점수</p>
      </div>

      <p class="text-slate-600 mb-10 text-lg font-medium">
        ${escapeHtml(scoreText)}
      </p>

      <div class="flex flex-col sm:flex-row gap-4">
        <button
          id="retry-btn"
          class="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
        >
          다시 시도
        </button>
        <button
          id="new-quiz-btn"
          class="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
          새로운 퀴즈 만들기
        </button>
      </div>
    `;
    
    const retryBtn = document.getElementById('retry-btn');
    const newQuizBtn = document.getElementById('new-quiz-btn');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        debugLog('RESULT', '다시 시도 클릭');
        setState(AppState.QUIZ);
      });
    } else {
      errorLog('다시 시도 버튼을 찾을 수 없습니다', null);
    }
    
    if (newQuizBtn) {
      newQuizBtn.addEventListener('click', () => {
        debugLog('RESULT', '새로운 퀴즈 만들기 클릭');
        images = [];
        questions = [];
        questionCount = 5;
        renderImagePreview();
        updateGenerateButton();
        questionCountBtns.forEach((btn, idx) => {
          if (idx === 1) { // 5개가 기본값
            btn.className = 'question-count-btn flex-1 py-3 rounded-xl border-2 transition-all font-bold bg-indigo-600 border-indigo-600 text-white';
          } else {
            btn.className = 'question-count-btn flex-1 py-3 rounded-xl border-2 transition-all font-bold bg-white border-slate-200 text-slate-500 hover:border-indigo-300';
          }
        });
        setState(AppState.IDLE);
      });
    } else {
      errorLog('새로운 퀴즈 만들기 버튼을 찾을 수 없습니다', null);
    }
  } catch (error) {
    errorLog('결과 화면 렌더링 실패', error);
    showError('결과를 표시하는 중 오류가 발생했습니다.');
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
    updateGenerateButton();
    debugLog('INIT', '앱 초기화 완료');
  }
} catch (error) {
  errorLog('앱 초기화 중 오류 발생', error);
  showError('앱을 초기화하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
}
