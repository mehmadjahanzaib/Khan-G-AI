import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  Calculator,
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BrainCircuit,
  FileCheck,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface StudyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptText: string) => void;
}

export const StudyModeModal: React.FC<StudyModeModalProps> = ({ isOpen, onClose, onSelectPrompt }) => {
  const [activeTab, setActiveTab] = useState<'study' | 'math' | 'mcqs' | 'plan'>('study');

  // Study Form State
  const [grade, setGrade] = useState('FSc Pre-Medical (Part 1 & 2)');
  const [subject, setSubject] = useState('Biology');
  const [board, setBoard] = useState('Punjab Board (BISE Lahore / Rawalpindi)');
  const [topic, setTopic] = useState('');

  // Math Solver State
  const [mathProblem, setMathProblem] = useState('');
  const [mathType, setMathType] = useState('algebra');

  if (!isOpen) return null;

  const handleLaunchStudy = (action: string) => {
    let prompt = '';
    const cleanTopic = topic.trim() || 'the entire high-yield syllabus';

    if (action === 'summary') {
      prompt = `Please generate comprehensive, exam-oriented study notes and high-yield summary for:\n- Level: ${grade}\n- Board: ${board}\n- Subject: ${subject}\n- Topic / Chapter: ${cleanTopic}\n\nInclude:\n1. Core definitions & formulas\n2. High-yield board concepts\n3. Common examination traps\n4. Memory mnemonics.`;
    } else if (action === 'mcqs') {
      prompt = `Generate 10 challenging past-paper style MCQs with complete answer keys and step-by-step explanations for:\n- Exam: ${grade}\n- Subject: ${subject}\n- Topic: ${cleanTopic}\n\nFormat each question with 4 clear options (A, B, C, D), indicate the correct answer, and explain the scientific/mathematical reason.`;
    } else if (action === 'questions') {
      prompt = `Provide the top 10 most frequently repeated Short & Long Examination Questions with model answers for:\n- Class/Board: ${grade} (${board})\n- Subject: ${subject}\n- Chapter: ${cleanTopic}.`;
    }

    onSelectPrompt(prompt);
    onClose();
  };

  const handleLaunchMath = () => {
    if (!mathProblem.trim()) return;
    const prompt = `Solve this mathematical problem step-by-step with complete mathematical derivations, formula explanations, and boxed final result:\n\nProblem:\n${mathProblem}\n\nCategory: ${mathType}\n\nShow:\n1. Given data & formulas used\n2. Step-by-step algebraic/calculus simplification\n3. Final Answer clearly highlighted\n4. Verification check.`;
    onSelectPrompt(prompt);
    onClose();
  };

  const handleLaunchPlan = () => {
    const prompt = `Please create an intensive, realistic Exam Revision Schedule for:\n- Level: ${grade}\n- Subject: ${subject}\n- Board: ${board}\n\nOrganize into weekly milestones, daily 2-hour study slots, active recall checkpoints, and past-paper mock test days.`;
    onSelectPrompt(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#111e17] text-stone-900 dark:text-stone-100 rounded-3xl max-w-2xl w-full border border-emerald-900/20 dark:border-emerald-700/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#01411C] via-[#025625] to-[#043317] p-5 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center font-bold shrink-0">
              <GraduationCap className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Academic Study & Math Hub
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-semibold border border-emerald-300/30">
                  Pakistani Curricula
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Tailored for Matric, FSc, MDCAT, ECAT, CSS, O/A Levels & University STEM.
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 mt-4 bg-black/20 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('study')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'study'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Notes & Topics</span>
            </button>
            <button
              onClick={() => setActiveTab('math')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'math'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Math Solver</span>
            </button>
            <button
              onClick={() => setActiveTab('mcqs')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'mcqs'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Past-Paper MCQs</span>
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'plan'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Revision Plan</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {activeTab !== 'math' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Grade / Examination Level
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MDCAT (Pre-Medical Entry Test)">MDCAT (Pre-Medical Entry Test)</option>
                  <option value="ECAT / NUST NET (Engineering Entry Test)">ECAT / NUST NET (Engineering)</option>
                  <option value="CSS / PMS (Competitive Exam)">CSS / PMS (Civil Services)</option>
                  <option value="FSc Pre-Medical (Part 1 & 2)">FSc Pre-Medical (11th & 12th)</option>
                  <option value="FSc Pre-Engineering (Part 1 & 2)">FSc Pre-Engineering</option>
                  <option value="ICS (Computer Science Part 1 & 2)">ICS (Computer Science)</option>
                  <option value="Matric (9th & 10th Science)">Matric (9th & 10th Science)</option>
                  <option value="Cambridge O/A Levels">Cambridge O/A Levels</option>
                  <option value="University / Bachelor STEM">University / Bachelor STEM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Biology (Cell, Genetics, Physiology)">Biology</option>
                  <option value="Physics (Mechanics, Waves, Electromagnetism)">Physics</option>
                  <option value="Chemistry (Organic, Inorganic, Physical)">Chemistry</option>
                  <option value="Mathematics (Calculus, Algebra, Geometry)">Mathematics</option>
                  <option value="Computer Science (Python, C++, OOP, DB)">Computer Science</option>
                  <option value="English (Grammar, Vocabulary, Essay)">English</option>
                  <option value="Pakistan Affairs & Current Affairs">Pakistan Affairs / Current Affairs</option>
                  <option value="Islamiat / Islamic Studies">Islamiat</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Board / Curriculum
                </label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Federal Board (FBISE Islamabad)">Federal Board (FBISE Islamabad)</option>
                  <option value="Punjab Board (BISE Lahore / Rawalpindi / Faisalabad / Multan)">Punjab Board (BISE Lahore, RWP, etc.)</option>
                  <option value="Sindh Board (BSEK / BIEK Karachi / Hyderabad)">Sindh Board (BSEK/BIEK Karachi)</option>
                  <option value="KPK Board (BISE Peshawar / Abbottabad / Mardan)">KPK Board (BISE Peshawar, etc.)</option>
                  <option value="Balochistan Board (BISE Quetta)">Balochistan Board (BISE Quetta)</option>
                  <option value="Cambridge Assessment International Education (CAIE)">Cambridge (CAIE O/A Levels)</option>
                  <option value="UHS / NUMS Medical Syllabus">UHS / NUMS Medical Syllabus</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Specific Chapter, Theorem, or Topic (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thermodynamics, Photosynthesis, Organic Reaction Mechanisms, Integration by Parts"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 p-2.5 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* TAB 1: Notes & Concepts */}
          {activeTab === 'study' && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                Choose the type of academic content you need Khan G AI to prepare:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleLaunchStudy('summary')}
                  className="flex items-start gap-3 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors group"
                >
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      Chapter Summary & Key Concepts
                    </div>
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                      High-yield definitions, textbook formulas & memory hacks.
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleLaunchStudy('questions')}
                  className="flex items-start gap-3 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors group"
                >
                  <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      Repeated Board Questions
                    </div>
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                      Top 10 short & long questions with full model answers.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Math Mode */}
          {activeTab === 'math' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Problem Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Algebra', 'Calculus / Derivatives', 'Integration', 'Trigonometry', 'Matrices & Vectors', 'Physics Numerical'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMathType(type)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-colors ${
                        mathType === type
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Type or Paste your Math Problem / Numerical Equation
                </label>
                <textarea
                  rows={4}
                  value={mathProblem}
                  onChange={(e) => setMathProblem(e.target.value)}
                  placeholder="e.g. Find the derivative of f(x) = (3x^2 + 5x) / sqrt(x^2 + 1), or: An electron moves with velocity 2x10^6 m/s in magnetic field 0.5 T..."
                  className="w-full text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 p-3 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleLaunchMath}
                disabled={!mathProblem.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.99]"
              >
                <Calculator className="w-4 h-4" />
                <span>Solve Step-by-Step with Formulas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 3: MCQs */}
          {activeTab === 'mcqs' && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs">
                💡 <strong>Exam Practice Mode:</strong> Khan G AI will generate 10 high-standard multiple-choice questions matching actual board & entrance test patterns with complete justifications.
              </div>

              <button
                onClick={() => handleLaunchStudy('mcqs')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
              >
                <FileCheck className="w-4 h-4" />
                <span>Generate 10 Past-Paper MCQs Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 4: Revision Plan */}
          {activeTab === 'plan' && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 text-xs">
                📅 <strong>Smart Timetable:</strong> Get a tailored study routine structured around your specific board exam, prioritizing difficult chapters and active recall sessions.
              </div>

              <button
                onClick={handleLaunchPlan}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
              >
                <Calendar className="w-4 h-4" />
                <span>Generate Customized Study Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
