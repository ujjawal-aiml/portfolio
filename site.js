/*
 * CENTRAL CONFIGURATION — edit this file to update the whole site.
 * Everything below comes from Ujjawal Chaurasia's resume. Empty strings / empty arrays hide a section.
 */
window.SITE = {
  websiteUrl: '', // add your final domain here when you deploy (used for the canonical tag if set)

  identity: {
    fullName: 'Ujjawal Chaurasia',
    displayName: 'Ujjawal',
    firstName: 'Ujjawal',
    lastName: 'Chaurasia',
    initials: 'UC',
    profession: 'AI & ML Developer',
    roleLine2: 'B.Tech CSE (AI & ML) · GenAI · RAG · Full-stack',
    location: 'Noida, India',
    availability: 'OPEN TO WORK',  // e.g. "Open to internships" — empty hides it
    headline: 'Turning data and language models into working AI apps.',
    intro:
      'Computer Science (AI & ML) student building LLM apps, RAG pipelines and machine-learning models — ' +
      'from LangChain-powered medical retrieval to fraud detection on 284,808 transactions.',
    about: [
      'I’m pursuing a B.Tech in Computer Science & Engineering (AI & ML) at Noida Institute of Engineering and ' +
        'Technology (2023–2027). My projects cover the whole path from data to product: preprocessing and ' +
        'benchmarking models, building retrieval pipelines with LangChain and Gemini, and wrapping them in APIs and ' +
        'interfaces people can use.',
      'Outside code, I’ve been a freelance content creator since 2023, editing promotional and social-media video ' +
        'for brands such as Japam India and Souled Theory — which taught me storytelling, pacing and delivering to deadlines.'
    ],
    portrait: 'portrait.jpeg',
    portraitAlt: 'Portrait of Ujjawal Chaurasia',
    resume: 'Ujjawal_Chaurasia_Resume_final.pdf'
  },

  contact: {
    email: 'ujjawalchaurasiamau8@gmail.com',
    phone: '+91 8115544392',     // resume lists a phone number; hidden on the page — add it here if you want it public
    whatsapp: '+91 8115544392',
    github: 'https://github.com/ujjawal-aiml',
    linkedin: 'https://www.linkedin.com/in/ujjawal-chaurasia-246966223/'
  },

  metrics: [
    { value: '130+', label: 'LeetCode problems solved' },
    { value: '284,808', label: 'transactions in the fraud-detection pipeline' },
    { value: '2027', label: 'B.Tech graduation (expected)' }
  ],

  // Scrolling ticker under the hero (uses real skills; edit freely)
  marquee: ['LangChain', 'RAG Pipelines', 'Google Gemini', 'FastAPI', 'Scikit-learn', 'ChromaDB', 'Python', 'Node.js', 'Prompt Engineering', 'Streamlit'],

  // "What I do" — each line is backed by a project or role on the resume
  services: [
    { title: 'LLM & RAG apps', text: 'Retrieval pipelines over documents with LangChain, Gemini and a vector database (ChromaDB), as in DigiCare.' },
    { title: 'Machine-learning pipelines', text: 'Preprocessing, class-imbalance handling, model training and benchmarking, as in the 284,808-transaction fraud detector.' },
    { title: 'AI backends & APIs', text: 'Async AI services in FastAPI alongside Node.js, secured with JWT and connected to MongoDB.' },
    { title: 'Video & content editing', text: 'Promotional and social-media video for brands since 2023, with a focus on storytelling and pacing.' }
  ],

  // "How I build" — the workflow that runs through the projects above
  process: [
    { step: '01', title: 'Understand the data', text: 'Clean, explore and shape the data, and handle problems like class imbalance before any model is trained.' },
    { step: '02', title: 'Prototype & benchmark', text: 'Try several models or prompt chains, such as KNN, Logistic Regression and Decision Tree, and compare them on unseen data.' },
    { step: '03', title: 'Wrap it as a service', text: 'Expose the model or pipeline through an API (FastAPI / Node.js) with authentication and storage.' },
    { step: '04', title: 'Ship an interface', text: 'Put a usable front end on top, for example a Streamlit app, so people can try it live.' }
  ],

  projects: [
    {
      id: 'digicare',
      title: 'DigiCare',
      subtitle: 'AI-Powered Medical Platform',
      category: 'GenAI / RAG',
      summary: 'A medical platform with an end-to-end RAG pipeline for querying patient-history PDFs.',
      highlights: [
        'Built an end-to-end RAG pipeline using LangChain and Google Gemini to ingest and query medical PDFs, with ChromaDB for patient-history retrieval.',
        'Architected a hybrid microservices system (Node.js + Python/FastAPI) for async AI task handling, secured with JWT authentication and Cloudinary document storage.'
      ],
      tools: ['LangChain', 'RAG', 'Gemini', 'FastAPI', 'Node.js', 'ChromaDB', 'MongoDB'],
      githubUrl: 'https://github.com/ujjawal-aiml/DigiCare'
    },
    {
      id: 'fraud-detection',
      title: 'Credit Card Fraud Detection',
      subtitle: 'End-to-end ML pipeline',
      category: 'Machine Learning',
      summary: 'A fraud-detection pipeline trained and benchmarked on 284,808 transactions.',
      highlights: [
        'Designed an end-to-end ML pipeline on 284,808 transactions covering preprocessing, class-imbalance handling, feature scaling, model training and evaluation.',
        'Implemented and benchmarked KNN, Logistic Regression and Decision Tree models with a structured performance comparison on unseen data.'
      ],
      tools: ['Python', 'Scikit-learn', 'Pandas', 'NumPy', 'Seaborn', 'JupyterLab'],
      githubUrl: 'https://github.com/ujjawal-aiml/Real-Time-Credit-Card-Fraud-Detection-System'
    },
    {
      id: 'restaurant-idea-generator',
      title: 'Restaurant Idea Generator',
      subtitle: 'LangChain LLM App',
      category: 'LLM App',
      summary: 'A multi-step LLM workflow that turns user inputs into structured restaurant ideas.',
      highlights: [
        'Built a multi-step LLM workflow using PromptTemplate, LLMChain and SequentialChain for structured AI output generation from user inputs.',
        'Deployed a real-time interactive Streamlit UI demonstrating prompt engineering and modular LLM application design.'
      ],
      tools: ['LangChain', 'OpenAI API', 'Streamlit', 'Python'],
      githubUrl: 'https://github.com/ujjawal-aiml/Restaurant-Idea-Generator'
    }
  ],

  skills: [
    { group: 'Languages', items: ['Python', 'SQL', 'C++', 'JavaScript'] },
    { group: 'AI / GenAI', items: ['LangChain', 'Google Gemini', 'OpenAI API', 'RAG Pipelines', 'Prompt Engineering', 'ChromaDB (Vector DB)', 'LLMs'] },
    { group: 'ML / Data', items: ['NumPy', 'Pandas', 'Matplotlib', 'Scikit-learn', 'ML Pipelines', 'ETL Concepts', 'Seaborn'] },
    { group: 'Web / Tools', items: ['Node.js', 'React', 'FastAPI', 'MongoDB', 'Git', 'GitHub', 'Postman', 'JupyterLab'] }
  ],

  experience: [
    {
      role: 'Artificial Intelligence Intern',
      org: 'CodeSoft',
      dates: 'June – July 2025',
      points: [
        'Worked on AI-based tasks and projects, gaining hands-on experience in machine learning concepts.',
        'Implemented basic models and explored real-world AI applications.'
      ]
    },
    {
      role: 'Freelance Content Creator',
      org: 'Instagram',
      dates: 'Jan 2023 – Present',
      points: [
        'Collaborated with Japam India and Souled Theory to create engaging video content for digital platforms.',
        'Edited promotional and social-media videos focusing on storytelling, pacing and audience engagement.',
        'Delivered high-quality content while maintaining brand consistency and meeting deadlines.'
      ]
    }
  ],

  education: [
    { title: 'B.Tech, Computer Science & Engineering (AI & ML)', place: 'Noida Institute of Engineering and Technology, Greater Noida, UP', dates: 'Sept 2023 – May 2027', note: 'CGPA: 7.0' },
    { title: 'Senior Secondary (PCM)', place: 'Fatima Convent School, Tajopur', dates: '2021 – 2022', note: 'Percentage: 80%' },
    { title: 'High School', place: 'Fatima Convent School, Tajopur', dates: '2019 – 2020', note: 'Percentage: 87%' }
  ],

  achievements: [
    'ML with Python: Foundations — Infosys Springboard',
    'Data Analytics Job Simulation — Deloitte',
    'Solved 130+ problems — LeetCode',
    'Core Event Member, Machine Magnet Tech Club'
  ],

  preferences: {
    showEducation: true,
    showExperience: true,
    showMetrics: true,
    showDownloadResume: true,
    showContactForm: true
  }
};
