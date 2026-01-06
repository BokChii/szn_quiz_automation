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

// DOM 요소
const idleState = document.getElementById('idle-state');
const processingState = document.getElementById('processing-state');
const quizState = document.getElementById('quiz-state');
const resultState = document.getElementById('result-state');
const fileInput = document.getElementById('file-input');
const imagePreview = document.getElementById('image-preview');
const questionCountBtns = document.querySelectorAll('.question-count-btn');
const generateBtn = document.getElementById('generate-btn');
const errorMessage = document.getElementById('error-message');

// 이미지 업로드 처리
fileInput.addEventListener('change', handleFileSelect);

// 드래그 앤 드롭
const uploader = document.querySelector('#image-uploader label');
uploader.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploader.classList.add('bg-indigo-200');
});

uploader.addEventListener('dragleave', () => {
  uploader.classList.remove('bg-indigo-200');
});

uploader.addEventListener('drop', (e) => {
  e.preventDefault();
  uploader.classList.remove('bg-indigo-200');
  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
  handleFiles(files);
});

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  handleFiles(files);
}

function handleFiles(files) {
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      images.push(base64);
      renderImagePreview();
      updateGenerateButton();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreview() {
  imagePreview.innerHTML = '';
  images.forEach((src, idx) => {
    const div = document.createElement('div');
    div.className = 'relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm';
    div.innerHTML = `
      <img src="${src}" alt="Webtoon ${idx}" class="h-40 w-full object-cover" />
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
  });

  // 삭제 버튼 이벤트 리스너
  document.querySelectorAll('.remove-image-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('button').dataset.index);
      images.splice(index, 1);
      renderImagePreview();
      updateGenerateButton();
    });
  });
}

// 문제 수 선택
questionCountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    questionCount = parseInt(btn.dataset.count);
    questionCountBtns.forEach(b => {
      if (parseInt(b.dataset.count) === questionCount) {
        b.className = 'question-count-btn flex-1 py-3 rounded-xl border-2 transition-all font-bold bg-indigo-600 border-indigo-600 text-white';
      } else {
        b.className = 'question-count-btn flex-1 py-3 rounded-xl border-2 transition-all font-bold bg-white border-slate-200 text-slate-500 hover:border-indigo-300';
      }
    });
  });
});

// 생성 버튼 업데이트
function updateGenerateButton() {
  if (images.length === 0) {
    generateBtn.className = 'mt-10 w-full py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-[0.98] bg-slate-200 text-slate-400 cursor-not-allowed';
    generateBtn.disabled = true;
  } else {
    generateBtn.className = 'mt-10 w-full py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-[0.98] bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200';
    generateBtn.disabled = false;
  }
}

// 퀴즈 생성
generateBtn.addEventListener('click', async () => {
  if (images.length === 0) {
    showError("최소 한 장 이상의 스크린샷을 업로드해주세요!");
    return;
  }
  
  hideError();
  setState(AppState.PROCESSING);
  
  try {
    const generated = await generateWebtoonQuiz(images, questionCount);
    questions = generated;
    setState(AppState.QUIZ);
  } catch (err) {
    console.error(err);
    showError("퀴즈를 생성하는 데 실패했습니다. 이미지 화질을 확인하거나 잠시 후 다시 시도해주세요.");
    setState(AppState.IDLE);
  }
});

// 상태 변경
function setState(newState) {
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
  }
}

// 퀴즈 렌더링
let currentQuestionIndex = 0;
let selectedIdx = null;
let score = 0;
let showExplanation = false;

function renderQuiz() {
  currentQuestionIndex = 0;
  selectedIdx = null;
  score = 0;
  showExplanation = false;
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
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
      ${currentQuestion.question}
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
              ${option}
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
          <span class="text-indigo-600 font-bold">해설:</span> ${currentQuestion.explanation}
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
        const idx = parseInt(btn.dataset.index);
        handleSelectOption(idx);
      });
    });
  }
  
  // 다음 문제 버튼
  if (showExplanation) {
    document.getElementById('next-question-btn').addEventListener('click', nextQuestion);
  }
}

function handleSelectOption(idx) {
  if (selectedIdx !== null) return;
  selectedIdx = idx;
  showExplanation = true;
  if (idx === questions[currentQuestionIndex].correctIndex) {
    score++;
  }
  renderCurrentQuestion();
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    selectedIdx = null;
    showExplanation = false;
    renderCurrentQuestion();
  } else {
    finalScore = score;
    setState(AppState.RESULT);
  }
}

// 결과 렌더링
function renderResult() {
  const scoreText = finalScore === questions.length 
    ? "완벽해요! 이 웹툰의 진정한 팬이시군요!" 
    : finalScore > questions.length / 2 
    ? "훌륭합니다! 세부적인 내용까지 잘 파악하고 계시네요." 
    : "나쁘지 않아요! 웹툰을 다시 정주행하고 도전해보는 건 어떨까요?";
  
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
      ${scoreText}
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
  
  document.getElementById('retry-btn').addEventListener('click', () => {
    setState(AppState.QUIZ);
  });
  
  document.getElementById('new-quiz-btn').addEventListener('click', () => {
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
}

// 에러 메시지
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

// 초기화
updateGenerateButton();

