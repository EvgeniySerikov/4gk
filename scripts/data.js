export const STORAGE_KEY = 'chgk-batumi-state';

const initialData = {
  hostPassword: 'batumi-owl-2025',
  users: [
    {
      id: 'u1',
      name: 'Нино Тариели',
      email: 'nino@example.com',
      password: 'demo123',
      telegram: '@nino',
      tags: ['история', 'искусство', 'путешествия'],
      avatar: '',
      role: 'viewer',
      expert: true,
      status: 'новичок',
      captain: false,
      notifications: [
        { id: 'n1', text: 'Ваш вопрос «Маяк в Батуми» одобрен ведущим', date: '2025-02-12' },
        { id: 'n2', text: 'Вы выбраны на игру «Весенняя серия» в роли знатока', date: '2025-03-01', important: true }
      ],
      archivedNews: [],
      archivedPolls: [],
      votes: { p1: ['o1'] },
      assignedGames: ['g1'],
    },
    {
      id: 'u2',
      name: 'Гия Мераб',
      email: 'gia@example.com',
      password: 'demo123',
      telegram: '@gia',
      tags: ['кино', 'технологии'],
      avatar: '',
      role: 'viewer',
      expert: false,
      status: 'опытный',
      captain: false,
      notifications: [],
      archivedNews: [],
      archivedPolls: [],
      votes: {},
      assignedGames: [],
    }
  ],
  questions: [
    {
      id: 'q1',
      authorId: 'u1',
      text: 'Какой символ на башне альфы в Батуми виден только из моря?',
      answer: 'Фигура сокола',
      status: 'approved',
      createdAt: '2025-02-05',
      tag: 'черный ящик',
      questionImage: '',
      answerImage: '',
      gameId: 'g1',
    },
    {
      id: 'q2',
      authorId: 'u2',
      text: 'В каком году в Батуми прошла первая телевизионная трансляция ЧГК?',
      answer: 'В 2011',
      status: 'pending',
      createdAt: '2025-02-10',
      tag: 'блиц',
      questionImage: '',
      answerImage: '',
      gameId: null,
    }
  ],
  news: [
    {
      id: 'n1',
      title: 'Открыта весенняя серия игр',
      text: 'Подготовка к новой серии началась. Принимаем вопросы до 20 марта.',
      image: '',
      buttonLabel: 'Положение',
      buttonUrl: 'https://chgk-world.example.com',
      views: ['u1'],
      createdAt: '2025-02-01'
    }
  ],
  polls: [
    {
      id: 'p1',
      text: 'Когда удобнее играть весеннюю серию?',
      options: [
        { id: 'o1', text: 'По субботам днём', votes: ['u1'] },
        { id: 'o2', text: 'По воскресеньям вечером', votes: [] },
        { id: 'o3', text: 'Будни после 20:00', votes: [] }
      ],
      multi: false,
      deadline: '2025-03-30',
      createdAt: '2025-02-02'
    }
  ],
  games: [
    {
      id: 'g1',
      title: 'Весенняя серия',
      date: '2025-04-05',
      questions: ['q1'],
      experts: ['u1'],
      captain: 'u1'
    }
  ],
};

export function loadState() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return JSON.parse(existing);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
  return { ...initialData };
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const statusLabels = {
  pending: 'в обработке',
  approved: 'одобрен',
  selected: 'выбран на игру',
  played: 'сыгран',
};

export const tagLabels = ['черный ящик', 'блиц', 'супер-блиц'];
