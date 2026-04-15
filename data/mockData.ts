import { Subject, Question, Note } from '../types';

export const MOCK_SUBJECTS: Subject[] = [
  { id: 'eng', name: 'English Language', icon: 'book', questionCount: 20 },
  { id: 'math', name: 'Mathematics', icon: 'calculator', questionCount: 20 },
  { id: 'phy', name: 'Physics', icon: 'flash', questionCount: 15 },
  { id: 'bio', name: 'Biology', icon: 'leaf', questionCount: 15 },
  { id: 'chm', name: 'Chemistry', icon: 'flask', questionCount: 15 },
];

export const MOCK_QUESTIONS: Record<string, Question[]> = {
  math: [
    {
      id: 'math-q-1',
      subjectId: 'math',
      text: 'What is the sum of the internal angles of a hexagon?',
      options: [
        { id: 'a', text: '540°' },
        { id: 'b', text: '720°' },
        { id: 'c', text: '900°' },
        { id: 'd', text: '1080°' },
      ],
      correctOptionId: 'b',
      explanation: 'Sum = (n-2) * 180. For n=6, 4 * 180 = 720.',
    },
    {
      id: 'math-q-2',
      subjectId: 'math',
      text: 'If 3x + 5 = 20, what is x?',
      options: [{ id: 'a', text: '3' }, { id: 'b', text: '5' }, { id: 'c', text: '6' }, { id: 'd', text: '7' }],
      correctOptionId: 'b',
      explanation: '3x = 15 => x = 5.',
    },
    {
      id: 'math-q-3',
      subjectId: 'math',
      text: 'Find the simple interest on ₦10,000 for 2 years at 5% per annum.',
      options: [{ id: 'a', text: '₦500' }, { id: 'b', text: '₦1,000' }, { id: 'c', text: '₦1,500' }, { id: 'd', text: '₦2,000' }],
      correctOptionId: 'b',
      explanation: 'SI = (P*R*T)/100 = (10000 * 5 * 2) / 100 = 1000.',
    },
    {
      id: 'math-q-4',
      subjectId: 'math',
      text: 'The probability of rolling a 6 on a fair die is:',
      options: [{ id: 'a', text: '1/2' }, { id: 'b', text: '1/3' }, { id: 'c', text: '1/6' }, { id: 'd', text: '5/6' }],
      correctOptionId: 'c',
      explanation: 'A die has 6 faces, so the probability of any one face is 1/6.',
    },
    {
      id: 'math-q-5',
      subjectId: 'math',
      text: 'If a triangle has sides 3cm, 4cm, and 5cm, it is a ____ triangle.',
      options: [{ id: 'a', text: 'Equilateral' }, { id: 'b', text: 'Isosceles' }, { id: 'c', text: 'Right-angled' }, { id: 'd', text: 'Acute' }],
      correctOptionId: 'c',
      explanation: '3² + 4² = 9 + 16 = 25 = 5². By Pythagoras, it is right-angled.',
    }
  ],
  eng: [
    {
      id: 'eng-q-1',
      subjectId: 'eng',
      text: 'Choose the option nearest in meaning to the underlined word: The witness was **impeccable** in his testimony.',
      options: [
        { id: 'a', text: 'Careless' },
        { id: 'b', text: 'Flawless' },
        { id: 'c', text: 'Doubtful' },
        { id: 'd', text: 'Aggressive' },
      ],
      correctOptionId: 'b',
      explanation: 'Impeccable means flawless or faultless.',
    },
    {
      id: 'eng-q-2',
      subjectId: 'eng',
      text: 'Identify the odd word in the following list:',
      options: [{ id: 'a', text: 'Happy' }, { id: 'b', text: 'Joyful' }, { id: 'c', text: 'Ecstatic' }, { id: 'd', text: 'Gloomy' }],
      correctOptionId: 'd',
      explanation: 'Gloomy is an antonym of the other three words.',
    },
    {
      id: 'eng-q-3',
      subjectId: 'eng',
      text: 'Fill in the gap: Neither the principal nor the teachers ____ present.',
      options: [{ id: 'a', text: 'is' }, { id: 'b', text: 'are' }, { id: 'c', text: 'was' }, { id: 'd', text: 'has' }],
      correctOptionId: 'b',
      explanation: 'When using "neither/nor", the verb agrees with the closer subject ("teachers").',
    },
    {
      id: 'eng-q-4',
      subjectId: 'eng',
      text: 'Which of the following describes a word formed from the first letters of other words?',
      options: [{ id: 'a', text: 'Homonym' }, { id: 'b', text: 'Acronym' }, { id: 'c', text: 'Synonym' }, { id: 'd', text: 'Antonym' }],
      correctOptionId: 'b',
      explanation: 'An acronym is a word formed from the initial letters of a name or phrase, e.g., NASA.',
    },
    {
      id: 'eng-q-5',
      subjectId: 'eng',
      text: 'Select the option that best completes the sentence: The students were told to ____ their voices.',
      options: [{ id: 'a', text: 'low' }, { id: 'b', text: 'lower' }, { id: 'c', text: 'lowered' }, { id: 'd', text: 'lowering' }],
      correctOptionId: 'b',
      explanation: '"Lower" is the base form of the verb required after "to".',
    }
  ],
  phy: [
    {
      id: 'phy-q-1',
      subjectId: 'phy',
      text: 'The power of a convex lens of focal length 20cm is:',
      options: [{ id: 'a', text: '5.0 D' }, { id: 'b', text: '0.05 D' }, { id: 'c', text: '20.0 D' }, { id: 'd', text: '0.5 D' }],
      correctOptionId: 'a',
      explanation: 'Power P = 1/f (in meters). P = 1/0.2 = 5 Dioptres.',
    },
    {
      id: 'phy-q-2',
      subjectId: 'phy',
      text: 'Which of the following is NOT a fundamental quantity?',
      options: [{ id: 'a', text: 'Mass' }, { id: 'b', text: 'Length' }, { id: 'c', text: 'Volume' }, { id: 'd', text: 'Time' }],
      correctOptionId: 'c',
      explanation: 'Volume is a derived quantity (L³).',
    }
  ],
  bio: [
    {
      id: 'bio-q-1',
      subjectId: 'bio',
      text: 'The group of animals that can live both on land and in water are:',
      options: [{ id: 'a', text: 'Reptiles' }, { id: 'b', text: 'Mammals' }, { id: 'c', text: 'Amphibians' }, { id: 'd', text: 'Aves' }],
      correctOptionId: 'c',
      explanation: 'Amphibians like frogs have dual life cycles in water and on land.',
    },
    {
      id: 'bio-q-2',
      subjectId: 'bio',
      text: 'The green pigment in plants responsible for photosynthesis is:',
      options: [{ id: 'a', text: 'Hemoglobin' }, { id: 'b', text: 'Chlorophyll' }, { id: 'c', text: 'Melanin' }, { id: 'd', text: 'Bile' }],
      correctOptionId: 'b',
      explanation: 'Chlorophyll captures light energy for photosynthesis.',
    },
    {
      id: 'bio-q-3',
      subjectId: 'bio',
      text: 'The part of the heart that pumps oxygenated blood to the body is:',
      options: [{ id: 'a', text: 'Right Atrium' }, { id: 'b', text: 'Left Ventricle' }, { id: 'c', text: 'Right Ventricle' }, { id: 'd', text: 'Left Atrium' }],
      correctOptionId: 'b',
      explanation: 'The left ventricle has the thickest walls to pump blood into the aorta.',
    }
  ],
  chm: [
    {
      id: 'chm-q-1',
      subjectId: 'chm',
      text: 'The valency of Oxygen is:',
      options: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }, { id: 'c', text: '3' }, { id: 'd', text: '4' }],
      correctOptionId: 'b',
      explanation: 'Oxygen has 6 valence electrons and needs 2 more for stability.',
    },
    {
      id: 'chm-q-2',
      subjectId: 'chm',
      text: 'Hard water contains high concentrations of:',
      options: [{ id: 'a', text: 'Sodium' }, { id: 'b', text: 'Calcium' }, { id: 'c', text: 'Potassium' }, { id: 'd', text: 'Chlorine' }],
      correctOptionId: 'b',
      explanation: 'Water hardness is caused by dissolved calcium and magnesium ions.',
    }
  ]
};

export const MOCK_PAPERS: any[] = [ // type as any for now to avoid circular or strict typing issues in this step
  {
    id: 'eng-2023',
    subjectId: 'eng',
    year: 2023,
    name: 'Paper 1',
    questions: MOCK_QUESTIONS.eng,
  },
  {
    id: 'eng-2022',
    subjectId: 'eng',
    year: 2022,
    name: 'Main Paper',
    questions: MOCK_QUESTIONS.eng.slice(0, 2),
  },
  {
    id: 'math-2023',
    subjectId: 'math',
    year: 2023,
    name: 'Main',
    questions: MOCK_QUESTIONS.math,
  },
  {
    id: 'phy-2023',
    subjectId: 'phy',
    year: 2023,
    name: 'Main',
    questions: MOCK_QUESTIONS.phy,
  }
];

export const MOCK_NOTES: Note[] = [
  {
    id: 'n1',
    subjectId: 'math',
    title: 'Circle Geometry Theorems',
    content: '1. The angle at the center is twice the angle at the circumference standing on the same arc.\n2. Angles in the same segment of a circle are equal.\n3. The angle in a semi-circle is 90 degrees.\n4. Opposite angles of a cyclic quadrilateral are supplementary (add up to 180°).',
    date: new Date().toISOString(),
  },
  {
    id: 'n2',
    subjectId: 'phy',
    title: 'Newton\'s Laws of Motion',
    content: '1. First Law (Inertia): An object remains at rest or in uniform motion unless acted upon by an external force.\n2. Second Law (F=ma): The force applied to an object is equal to the mass of the object multiplied by its acceleration.\n3. Third Law (Action & Reaction): For every action, there is an equal and opposite reaction.',
    date: new Date().toISOString(),
  },
  {
    id: 'n3',
    subjectId: 'chm',
    title: 'Periodic Table Basics',
    content: 'The periodic table organizes elements by atomic number. Groups (vertical) share chemical properties, while Periods (horizontal) indicate the number of electron shells.',
    date: new Date().toISOString(),
  }
];