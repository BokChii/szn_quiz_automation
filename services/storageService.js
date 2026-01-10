// 로컬 스토리지 서비스
// 프로젝트와 퀴즈 데이터를 관리합니다.

const STORAGE_KEY = 'webtoon_quiz_master_data';

// 초기 데이터 구조
const getInitialData = () => ({
  projects: [],
  quizzes: [],
  settings: {
    lastSelectedProjectId: null
  }
});

// 데이터 로드
function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getInitialData();
    }
    const data = JSON.parse(stored);
    // 데이터 구조 검증 및 마이그레이션
    if (!data.projects) data.projects = [];
    if (!data.quizzes) data.quizzes = [];
    if (!data.settings) data.settings = { lastSelectedProjectId: null };
    return data;
  } catch (error) {
    console.error('데이터 로드 실패:', error);
    return getInitialData();
  }
}

// 데이터 저장
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('데이터 저장 실패:', error);
    return false;
  }
}

// 프로젝트 관리
const ProjectService = {
  // 모든 프로젝트 가져오기
  getAll() {
    const data = loadData();
    return data.projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  // 프로젝트 생성
  create(name) {
    if (!name || name.trim().length === 0) {
      throw new Error('프로젝트명을 입력해주세요.');
    }

    const data = loadData();
    const project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.projects.push(project);
    data.settings.lastSelectedProjectId = project.id;
    
    if (saveData(data)) {
      return project;
    } else {
      throw new Error('프로젝트 생성에 실패했습니다.');
    }
  },

  // 프로젝트 업데이트
  update(id, updates) {
    const data = loadData();
    const project = data.projects.find(p => p.id === id);
    
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    Object.assign(project, updates);
    project.updatedAt = new Date().toISOString();
    
    if (saveData(data)) {
      return project;
    } else {
      throw new Error('프로젝트 업데이트에 실패했습니다.');
    }
  },

  // 프로젝트 삭제
  delete(id) {
    const data = loadData();
    const projectIndex = data.projects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 해당 프로젝트의 퀴즈도 함께 삭제
    data.quizzes = data.quizzes.filter(q => q.projectId !== id);
    
    // 마지막 선택된 프로젝트가 삭제되는 경우 처리
    if (data.settings.lastSelectedProjectId === id) {
      data.settings.lastSelectedProjectId = data.projects.length > 1 
        ? data.projects.find(p => p.id !== id)?.id || null
        : null;
    }

    data.projects.splice(projectIndex, 1);
    
    if (saveData(data)) {
      return true;
    } else {
      throw new Error('프로젝트 삭제에 실패했습니다.');
    }
  },

  // 프로젝트 선택
  select(id) {
    const data = loadData();
    if (id && !data.projects.find(p => p.id === id)) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }
    data.settings.lastSelectedProjectId = id;
    saveData(data);
  },

  // 현재 선택된 프로젝트 가져오기
  getSelected() {
    const data = loadData();
    if (!data.settings.lastSelectedProjectId) {
      return null;
    }
    return data.projects.find(p => p.id === data.settings.lastSelectedProjectId) || null;
  }
};

// 퀴즈 관리
const QuizService = {
  // 모든 퀴즈 가져오기
  getAll(projectId = null) {
    const data = loadData();
    let quizzes = data.quizzes;
    
    if (projectId) {
      quizzes = quizzes.filter(q => q.projectId === projectId);
    }
    
    return quizzes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // 퀴즈 생성
  create(projectId, episodeName, questions) {
    if (!projectId) {
      throw new Error('프로젝트를 선택해주세요.');
    }
    if (!episodeName || episodeName.trim().length === 0) {
      throw new Error('회차명을 입력해주세요.');
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('퀴즈 데이터가 올바르지 않습니다.');
    }

    const data = loadData();
    
    // 프로젝트 존재 확인
    if (!data.projects.find(p => p.id === projectId)) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const quiz = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: projectId,
      episodeName: episodeName.trim(),
      questions: questions,
      questionCount: questions.length,
      createdAt: new Date().toISOString(),
      score: null // 나중에 풀이 시 저장
    };

    data.quizzes.push(quiz);
    
    // 프로젝트 업데이트 시간 갱신
    const project = data.projects.find(p => p.id === projectId);
    if (project) {
      project.updatedAt = new Date().toISOString();
    }
    
    if (saveData(data)) {
      return quiz;
    } else {
      throw new Error('퀴즈 저장에 실패했습니다.');
    }
  },

  // 퀴즈 업데이트
  update(id, updates) {
    const data = loadData();
    const quiz = data.quizzes.find(q => q.id === id);
    
    if (!quiz) {
      throw new Error('퀴즈를 찾을 수 없습니다.');
    }

    Object.assign(quiz, updates);
    
    if (saveData(data)) {
      return quiz;
    } else {
      throw new Error('퀴즈 업데이트에 실패했습니다.');
    }
  },

  // 퀴즈 삭제
  delete(id) {
    const data = loadData();
    const quizIndex = data.quizzes.findIndex(q => q.id === id);
    
    if (quizIndex === -1) {
      throw new Error('퀴즈를 찾을 수 없습니다.');
    }

    data.quizzes.splice(quizIndex, 1);
    
    if (saveData(data)) {
      return true;
    } else {
      throw new Error('퀴즈 삭제에 실패했습니다.');
    }
  },

  // 퀴즈 가져오기
  getById(id) {
    const data = loadData();
    return data.quizzes.find(q => q.id === id) || null;
  }
};

// 엑셀 다운로드용 데이터 변환
function formatQuizForExcel(quiz) {
  const rows = [];
  
  // 헤더 행
  rows.push([
    '문제 번호',
    '질문',
    '선택지 1',
    '선택지 2',
    '선택지 3',
    '정답',
    '오답 1',
    '오답 2',
    '해설'
  ]);

  // 데이터 행
  quiz.questions.forEach((q, index) => {
    const correctAnswer = q.options[q.correctIndex];
    const wrongAnswers = q.options.filter((_, idx) => idx !== q.correctIndex);
    
    rows.push([
      index + 1,
      q.question,
      q.options[0],
      q.options[1],
      q.options[2],
      correctAnswer,
      wrongAnswers[0] || '',
      wrongAnswers[1] || '',
      q.explanation
    ]);
  });

  return rows;
}

// 프로젝트 전체 퀴즈를 엑셀용으로 변환
function formatProjectQuizzesForExcel(projectId) {
  const quizzes = QuizService.getAll(projectId);
  const allRows = [];
  
  quizzes.forEach(quiz => {
    // 회차명 헤더 추가
    allRows.push([`=== ${quiz.episodeName} (${quiz.createdAt.split('T')[0]}) ===`]);
    allRows.push([]); // 빈 행
    
    // 헤더 행
    allRows.push([
      '문제 번호',
      '질문',
      '선택지 1',
      '선택지 2',
      '선택지 3',
      '정답',
      '오답 1',
      '오답 2',
      '해설'
    ]);

    // 데이터 행
    quiz.questions.forEach((q, index) => {
      const correctAnswer = q.options[q.correctIndex];
      const wrongAnswers = q.options.filter((_, idx) => idx !== q.correctIndex);
      
      allRows.push([
        index + 1,
        q.question,
        q.options[0],
        q.options[1],
        q.options[2],
        correctAnswer,
        wrongAnswers[0] || '',
        wrongAnswers[1] || '',
        q.explanation
      ]);
    });
    
    allRows.push([]); // 회차 간 구분을 위한 빈 행
    allRows.push([]);
  });

  return allRows;
}

// 전역으로 export
window.ProjectService = ProjectService;
window.QuizService = QuizService;
window.formatQuizForExcel = formatQuizForExcel;
window.formatProjectQuizzesForExcel = formatProjectQuizzesForExcel;

