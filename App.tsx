
import React, { useState } from 'react';
import { AppState, QuizQuestion } from './types';
import { generateWebtoonQuiz } from './services/geminiService';
import { ImageUploader } from './components/ImageUploader';
import { QuizPlayer } from './components/QuizPlayer';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('IDLE');
  const [images, setImages] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startProcessing = async () => {
    if (images.length === 0) {
      setError("최소 한 장 이상의 스크린샷을 업로드해주세요!");
      return;
    }
    setError(null);
    setState('PROCESSING');
    try {
      const generated = await generateWebtoonQuiz(images, questionCount);
      setQuestions(generated);
      setState('QUIZ');
    } catch (err) {
      console.error(err);
      setError("퀴즈를 생성하는 데 실패했습니다. 이미지 화질을 확인하거나 잠시 후 다시 시도해주세요.");
      setState('IDLE');
    }
  };

  const onFinishQuiz = (score: number) => {
    setFinalScore(score);
    setState('RESULT');
  };

  const resetApp = () => {
    setImages([]);
    setQuestions([]);
    setError(null);
    setState('IDLE');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-4xl w-full text-center mb-12">
        <h1 className="webtoon-font text-5xl md:text-6xl text-indigo-600 mb-2 transform -rotate-2">
          웹툰 퀴즈 마스터
        </h1>
        <p className="text-slate-500 font-bold text-lg">
          좋아하는 웹툰 장면을 업로드하고 AI가 만든 퀴즈에 도전하세요!
        </p>
      </header>

      <main className="max-w-2xl w-full">
        {state === 'IDLE' && (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-black">1</span>
              스크린샷 업로드
            </h2>
            
            <ImageUploader images={images} setImages={setImages} />

            <div className="mt-10 pt-10 border-t border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-black">2</span>
                퀴즈 설정
              </h2>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-500 uppercase">생성할 문제 수</label>
                <div className="flex items-center gap-4">
                  {[3, 5, 7, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold ${
                        questionCount === n 
                        ? "bg-indigo-600 border-indigo-600 text-white" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                      }`}
                    >
                      {n}개
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold text-center">
                {error}
              </div>
            )}

            <button
              onClick={startProcessing}
              disabled={images.length === 0}
              className={`mt-10 w-full py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-[0.98] ${
                images.length === 0 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
              }`}
            >
              퀴즈 생성하기 ✨
            </button>
          </div>
        )}

        {state === 'PROCESSING' && (
          <div className="bg-white rounded-3xl shadow-xl p-12 border border-slate-100 text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">AI 분석 중...</h2>
            <p className="text-slate-500 leading-relaxed">
              Gemini가 스크린샷의 텍스트를 읽고 스토리를 이해하며<br />
              재미있는 퀴즈를 만들고 있습니다. 잠시만 기다려주세요!
            </p>
            <div className="mt-8 space-y-3">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 animate-pulse w-3/4"></div>
              </div>
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
                OCR • 문맥 분석 • 문제 출제 중
              </p>
            </div>
          </div>
        )}

        {state === 'QUIZ' && (
          <QuizPlayer questions={questions} onFinish={onFinishQuiz} />
        )}

        {state === 'RESULT' && (
          <div className="bg-white rounded-3xl shadow-2xl p-12 border border-slate-100 text-center animate-in zoom-in duration-500">
            <div className="inline-block p-4 bg-yellow-100 rounded-full mb-6">
              <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            
            <h2 className="text-4xl font-black text-slate-800 mb-2">퀴즈 종료!</h2>
            <div className="my-8">
              <div className="text-7xl font-black text-indigo-600 mb-2">
                {finalScore} / {questions.length}
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest">최종 점수</p>
            </div>

            <p className="text-slate-600 mb-10 text-lg font-medium">
              {finalScore === questions.length 
                ? "완벽해요! 이 웹툰의 진정한 팬이시군요!" 
                : finalScore > questions.length / 2 
                ? "훌륭합니다! 세부적인 내용까지 잘 파악하고 계시네요." 
                : "나쁘지 않아요! 웹툰을 다시 정주행하고 도전해보는 건 어떨까요?"}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setQuestions([...questions]); // 질문 데이터 유지
                  setState('QUIZ');
                }}
                className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              >
                다시 시도
              </button>
              <button
                onClick={resetApp}
                className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                새로운 퀴즈 만들기
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto py-12 text-slate-400 text-sm flex flex-col items-center gap-4">
        <div className="flex items-center gap-6 font-medium">
          <a href="#" className="hover:text-indigo-500 transition-colors">이용 방법</a>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <a href="#" className="hover:text-indigo-500 transition-colors">개인정보 처리방침</a>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <a href="#" className="hover:text-indigo-500 transition-colors">문의하기</a>
        </div>
        <p>© 2024 웹툰 퀴즈 마스터 • Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
