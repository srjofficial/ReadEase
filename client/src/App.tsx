import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { PublicLayout, AuthenticatedLayout } from './layouts';
import type { UserRole } from './components/navigation/Sidebar';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Textarea,
  Modal,
  Badge,
  Alert,
  ScreeningDisclaimer
} from './components/ui';
import {
  Sparkles,
  BookOpen,
  Sliders,
  Award,
  Brain,
  Play,
  ArrowRight,
  TrendingUp,
  FileText,
  Check,
  Send,
  Layers,
  ArrowLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { NotFoundPage, LoginPage, SignUpPage } from './pages';
import { ReadingPreferencesProvider } from './context/ReadingPreferencesContext';
import { useLanguage } from './context/LanguageContext';
import {
  StudentDashboardView,
  ReadingStudioView,
  MyDocumentsView,
  AchievementsBadgesView,
  ReadingAssessmentView,
  ReadingCustomizerView,
  type DocumentData
} from './pages/student';
import {
  TeacherDashboardView,
  TeacherStudentsView,
  TeacherAnalyticsView,
  TeacherAssignmentsView
} from './pages/teacher';
import { SpecialEducatorDashboardView, EducatorStudentsView } from './pages/educator';
import { ParentDashboardView, ParentReadingLogView } from './pages/parent';

export function App() {
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();

  // Active User session with persistent role storage
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: UserRole;
    provider?: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('readease_user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch {
          // ignore corrupted payload
        }
      }
    }
    return null;
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('readease_role');
      if (savedRole && ['student', 'teacher', 'special-educator', 'parent'].includes(savedRole)) {
        return savedRole as UserRole;
      }
    }
    return 'student';
  });
  const [activeNavId, setActiveNavId] = useState('dashboard');
  const [studioDocument, setStudioDocument] = useState<DocumentData | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('readease_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  // Live Interactive Demo State on Landing Page
  const [bionicActive, setBionicActive] = useState(true);
  const [readingRulerActive, setReadingRulerActive] = useState(false);
  const [fontScale, setFontScale] = useState<'normal' | 'large'>('normal');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('readease_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('readease_theme', 'light');
    }
  }, [isDarkMode]);

  const handleLanguageToggle = () => {
    toggleLanguage();
  };

  const handleDarkModeToggle = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleLoginSuccess = (
    role: UserRole,
    user: { name: string; email: string; role?: UserRole; provider?: string }
  ) => {
    const session = { ...user, role };
    setCurrentUser(session);
    setActiveRole(role);
    localStorage.setItem('readease_user', JSON.stringify(session));
    localStorage.setItem('readease_role', role);
    setActiveNavId('dashboard');
    const roleRoutes: Record<UserRole, string> = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      'special-educator': '/educator/dashboard',
      parent: '/parent/dashboard',
      admin: '/dashboard'
    };
    navigate(roleRoutes[role] || '/dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('readease_user');
    localStorage.removeItem('readease_role');
    localStorage.removeItem('readease_access_token');
    navigate('/');
  };

  const handleStudentNavSelect = (id: string) => {
    setActiveNavId(id);
    if (id !== 'reading-studio') {
      setStudioDocument(null);
    }
    const routeMap: Record<string, string> = {
      dashboard: '/student/dashboard',
      'reading-studio': '/student/reading-studio',
      library: '/student/documents',
      progress: '/student/achievements',
      assessment: '/student/reading-assessment',
      preferences: '/student/customizer'
    };
    if (routeMap[id]) {
      navigate(routeMap[id]);
    }
  };

  const getStudentPageTitleFor = (navId: string) => {
    switch (navId) {
      case 'reading-studio':
        return t('nav.readingStudio', 'Reading Studio');
      case 'library':
        return t('nav.myDocuments', 'My Documents');
      case 'progress':
        return t('nav.achievements', 'Achievements & Badges');
      case 'assessment':
        return t('nav.assessment', 'Reading Assessment');
      case 'preferences':
        return t('nav.customizer', 'Reading Customizer');
      case 'dashboard':
      default:
        return t('nav.dashboard', 'Student Dashboard');
    }
  };

  const renderStudentView = (navId = activeNavId) => {
    switch (navId) {
      case 'reading-studio':
        return (
          <ReadingStudioView
            initialDocument={studioDocument}
            onBackToDashboard={() => {
              setActiveNavId('dashboard');
              navigate('/student/dashboard');
            }}
            onNavigateProgress={() => {
              setActiveNavId('progress');
              navigate('/student/achievements');
            }}
          />
        );
      case 'library':
        return (
          <MyDocumentsView
            onOpenDocumentInStudio={(doc) => {
              setStudioDocument(doc);
              setActiveNavId('reading-studio');
              navigate('/student/reading-studio');
            }}
          />
        );
      case 'progress':
        return <AchievementsBadgesView />;
      case 'assessment':
        return (
          <ReadingAssessmentView
            onApplyAccommodationsAndGoToStudio={() => {
              setActiveNavId('reading-studio');
              navigate('/student/reading-studio');
            }}
          />
        );
      case 'preferences':
        return <ReadingCustomizerView />;
      case 'dashboard':
      default:
        return (
          <StudentDashboardView
            userName={currentUser?.name?.split(' ')[0] || 'Alex'}
            onNavigateTab={(tabId) => {
              handleStudentNavSelect(tabId);
            }}
          />
        );
    }
  };

  // ─── Teacher Portal Rendering ─────────────────────────────────────
  const handleTeacherNavSelect = (id: string) => {
    setActiveNavId(id);
    const routeMap: Record<string, string> = {
      dashboard: '/teacher/dashboard',
      roster: '/teacher/students',
      assignments: '/teacher/assignments',
      'student-reports': '/teacher/analytics',
      'lesson-plans': '/teacher/dashboard',
      settings: '/teacher/dashboard'
    };
    if (routeMap[id]) navigate(routeMap[id]);
  };

  const renderTeacherView = (navId = activeNavId) => {
    switch (navId) {
      case 'roster':
        return <TeacherStudentsView />;
      case 'assignments':
        return <TeacherAssignmentsView />;
      case 'student-reports':
        return <TeacherAnalyticsView />;
      default:
        return (
          <TeacherDashboardView
            userName={currentUser?.name?.split(' ')[0] || 'Teacher'}
            onNavigateTab={handleTeacherNavSelect}
          />
        );
    }
  };

  const renderTeacherPage = (navId: string) => (
    <AuthenticatedLayout
      role="teacher"
      activeItemId={navId}
      onItemSelect={handleTeacherNavSelect}
      pageTitle="Educator Portal"
      breadcrumbs={['ReadEase', 'teacher', navId]}
      topBarProps={{
        currentLanguage: language,
        onLanguageToggle: handleLanguageToggle,
        isDarkMode,
        onDarkModeToggle: handleDarkModeToggle,
        onPreferencesClick: () => {}
      }}
      sidebarProps={{
        userName: currentUser?.name || 'Teacher',
        userEmail: currentUser?.email || 'teacher@readease.edu',
        onLogout: handleLogout,
        onPrimaryAction: () => handleTeacherNavSelect('assignments')
      }}
    >
      {renderTeacherView(navId)}
    </AuthenticatedLayout>
  );

  // ─── Special Educator Portal Rendering ───────────────────────────────
  const handleEducatorNavSelect = (id: string) => {
    setActiveNavId(id);
    const routeMap: Record<string, string> = {
      dashboard: '/educator/dashboard',
      'iep-tracking': '/educator/students',
      diagnostics: '/educator/dashboard',
      'phoneme-analytics': '/educator/dashboard',
      'custom-profiles': '/educator/students'
    };
    if (routeMap[id]) navigate(routeMap[id]);
  };

  const renderEducatorView = (navId = activeNavId) => {
    switch (navId) {
      case 'iep-tracking':
      case 'custom-profiles':
        return <EducatorStudentsView />;
      default:
        return (
          <SpecialEducatorDashboardView
            userName={currentUser?.name?.split(' ')[0] || 'Specialist'}
            onNavigateTab={handleEducatorNavSelect}
          />
        );
    }
  };

  const renderEducatorPage = (navId: string) => (
    <AuthenticatedLayout
      role="special-educator"
      activeItemId={navId}
      onItemSelect={handleEducatorNavSelect}
      pageTitle="Special Education Suite"
      breadcrumbs={['ReadEase', 'educator', navId]}
      topBarProps={{
        currentLanguage: language,
        onLanguageToggle: handleLanguageToggle,
        isDarkMode,
        onDarkModeToggle: handleDarkModeToggle,
        onPreferencesClick: () => {}
      }}
      sidebarProps={{
        userName: currentUser?.name || 'Specialist',
        userEmail: currentUser?.email || 'educator@readease.edu',
        onLogout: handleLogout,
        onPrimaryAction: () => handleEducatorNavSelect('diagnostics')
      }}
    >
      {renderEducatorView(navId)}
    </AuthenticatedLayout>
  );

  // ─── Parent Portal Rendering ──────────────────────────────────────────
  const handleParentNavSelect = (id: string) => {
    setActiveNavId(id);
    const routeMap: Record<string, string> = {
      dashboard: '/parent/dashboard',
      'reading-log': '/parent/reading-log',
      presets: '/parent/dashboard',
      'educator-notes': '/parent/dashboard'
    };
    if (routeMap[id]) navigate(routeMap[id]);
  };

  const renderParentView = (navId = activeNavId) => {
    switch (navId) {
      case 'reading-log':
        return <ParentReadingLogView />;
      default:
        return (
          <ParentDashboardView
            userName={currentUser?.name?.split(' ')[0] || 'Parent'}
            onNavigateTab={handleParentNavSelect}
          />
        );
    }
  };

  const renderParentPage = (navId: string) => (
    <AuthenticatedLayout
      role="parent"
      activeItemId={navId}
      onItemSelect={handleParentNavSelect}
      pageTitle="Parent Companion"
      breadcrumbs={['ReadEase', 'parent', navId]}
      topBarProps={{
        currentLanguage: language,
        onLanguageToggle: handleLanguageToggle,
        isDarkMode,
        onDarkModeToggle: handleDarkModeToggle,
        onPreferencesClick: () => {}
      }}
      sidebarProps={{
        userName: currentUser?.name || 'Parent',
        userEmail: currentUser?.email || 'parent@readease.edu',
        onLogout: handleLogout,
        onPrimaryAction: () => handleParentNavSelect('reading-log')
      }}
    >
      {renderParentView(navId)}
    </AuthenticatedLayout>
  );

  const renderStudentPage = (navId: string) => {
    return (
      <AuthenticatedLayout
        role="student"
        activeItemId={navId}
        onItemSelect={handleStudentNavSelect}
        pageTitle={getStudentPageTitleFor(navId)}
        breadcrumbs={['ReadEase', 'student', navId]}
        topBarProps={{
          currentLanguage: language,
          onLanguageToggle: handleLanguageToggle,
          isDarkMode: isDarkMode,
          onDarkModeToggle: handleDarkModeToggle,
          onPreferencesClick: () => {
            setActiveNavId('preferences');
            navigate('/student/customizer');
          }
        }}
        sidebarProps={{
          userName: currentUser?.name || 'Alex Johnson',
          userEmail: currentUser?.email || 'alex@readease.edu',
          onLogout: handleLogout,
          onPrimaryAction: () => {
            setActiveNavId('reading-studio');
            navigate('/student/reading-studio');
          }
        }}
      >
        {renderStudentView(navId)}
      </AuthenticatedLayout>
    );
  };

  return (
    <ReadingPreferencesProvider>
      <div className="min-h-screen bg-background-cream text-text-primary">
        <Routes>
          {/* 1. PUBLIC LANDING PAGE */}
          <Route
            path="/"
            element={
              <PublicLayout
                navbarProps={{
                  currentLanguage: language,
                  onLanguageToggle: handleLanguageToggle,
                  isDarkMode: isDarkMode,
                  onDarkModeToggle: handleDarkModeToggle,
                  onLoginClick: () => navigate('/login'),
                  onSignUpClick: () => navigate('/signup')
                }}
              >
                <div className="max-w-container mx-auto px-6 py-12 md:py-20 space-y-20">
                  {/* Hero Section */}
                  <section className="text-center max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 text-primary-container rounded-full text-label-md font-semibold border border-primary-200 shadow-soft animate-fade-in">
                      <Sparkles size={16} className="text-secondary" />
                      <span>Empowering Neurodivergent & Dyslexic Readers</span>
                    </div>

                    <h1 className="text-display-lg-mobile md:text-display-lg font-bold text-text-primary tracking-tight leading-tight">
                      Reading Without Barriers. <br />
                      <span className="text-primary">Confidence Without Friction.</span>
                    </h1>

                    <p className="text-body-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
                      ReadEase transforms standard documents into dyslexia-friendly formats using AI
                      fixation points, bilingual Malayalam/English phonemic breakdowns, and
                      customizable visual rulers.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                      <Button
                        size="lg"
                        variant="primary"
                        iconRight={<ArrowRight size={18} />}
                        onClick={() => {
                          if (currentUser) {
                            setActiveNavId('reading-studio');
                            navigate('/student/reading-studio');
                          } else {
                            navigate('/signup');
                          }
                        }}
                      >
                        {currentUser
                          ? 'Return to Reading Studio'
                          : 'Experience Reading Studio Free'}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        iconLeft={<Sliders size={18} />}
                        onClick={() => {
                          if (currentUser) {
                            setActiveNavId('preferences');
                            navigate('/student/customizer');
                          } else {
                            navigate('/login');
                          }
                        }}
                      >
                        Customize Accommodations
                      </Button>
                    </div>
                  </section>

                  {/* Live Interactive Reading Simulator */}
                  <section className="max-w-4xl mx-auto">
                    <Card
                      variant="highlight"
                      padding="lg"
                      className="border-2 border-primary/20 shadow-elevated"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-border">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="primary" dot>
                              LIVE DEMO
                            </Badge>
                            <h3 className="text-headline-sm font-bold text-text-primary">
                              Interactive Dyslexia Reader
                            </h3>
                          </div>
                          <p className="text-body-sm text-text-secondary">
                            Toggle assistive technologies below to feel the cognitive difference in
                            real-time.
                          </p>
                        </div>

                        {/* Simulator Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setBionicActive(!bionicActive)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                              bionicActive
                                ? 'bg-primary text-white border-primary shadow-soft'
                                : 'bg-surface-lowest text-text-secondary border-surface-border hover:bg-surface-low'
                            }`}
                          >
                            Bionic Fixation: {bionicActive ? 'ON' : 'OFF'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReadingRulerActive(!readingRulerActive)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                              readingRulerActive
                                ? 'bg-secondary text-primary-dark border-secondary shadow-soft'
                                : 'bg-surface-lowest text-text-secondary border-surface-border hover:bg-surface-low'
                            }`}
                          >
                            Reading Ruler: {readingRulerActive ? 'ACTIVE' : 'OFF'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFontScale(fontScale === 'normal' ? 'large' : 'normal')
                            }
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-border bg-surface-lowest text-text-secondary hover:bg-surface-low transition-all"
                          >
                            Font: {fontScale === 'normal' ? 'Lexend (Default)' : 'Lexend (120%)'}
                          </button>
                        </div>
                      </div>

                      {/* Simulated Passage */}
                      <div
                        className={`mt-6 p-6 rounded-xl transition-all relative ${
                          readingRulerActive
                            ? 'bg-secondary-50/70 border-l-4 border-secondary shadow-inner'
                            : 'bg-surface-lowest border border-surface-border'
                        } ${fontScale === 'large' ? 'text-lg leading-loose' : 'text-base leading-relaxed'}`}
                        style={{ fontFamily: 'Lexend, sans-serif' }}
                      >
                        {readingRulerActive && (
                          <div className="absolute -top-3 right-4 px-2 py-0.5 bg-secondary text-primary-dark text-[0.68rem] font-bold rounded-full uppercase tracking-wider">
                            Optical Focus Guide
                          </div>
                        )}

                        <p className="text-text-primary">
                          {bionicActive ? (
                            <>
                              <strong className="text-primary font-bold">Read</strong>Ease{' '}
                              <strong className="text-primary font-bold">tra</strong>nsforms{' '}
                              <strong className="text-primary font-bold">sta</strong>ndard{' '}
                              <strong className="text-primary font-bold">tex</strong>t into{' '}
                              <strong className="text-primary font-bold">dys</strong>lexia-friendly{' '}
                              <strong className="text-primary font-bold">for</strong>mats. By{' '}
                              <strong className="text-primary font-bold">gui</strong>ding your{' '}
                              <strong className="text-primary font-bold">ey</strong>es with{' '}
                              <strong className="text-primary font-bold">art</strong>ificial{' '}
                              <strong className="text-primary font-bold">fix</strong>ation{' '}
                              <strong className="text-primary font-bold">poi</strong>nts,{' '}
                              <strong className="text-primary font-bold">cog</strong>nitive{' '}
                              <strong className="text-primary font-bold">loa</strong>d is{' '}
                              <strong className="text-primary font-bold">dra</strong>stically{' '}
                              <strong className="text-primary font-bold">red</strong>uced,{' '}
                              <strong className="text-primary font-bold">allo</strong>wing{' '}
                              <strong className="text-primary font-bold">stud</strong>ents to{' '}
                              <strong className="text-primary font-bold">com</strong>prehend{' '}
                              <strong className="text-primary font-bold">fas</strong>ter and with{' '}
                              <strong className="text-primary font-bold">dee</strong>per{' '}
                              <strong className="text-primary font-bold">conf</strong>idence.
                            </>
                          ) : (
                            <>
                              ReadEase transforms standard text into dyslexia-friendly formats. By
                              guiding your eyes with artificial fixation points, cognitive load is
                              drastically reduced, allowing students to comprehend faster and with
                              deeper confidence.
                            </>
                          )}
                        </p>
                      </div>
                    </Card>
                  </section>

                  {/* Feature Cards Grid */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card variant="default">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-container flex items-center justify-center mb-2">
                          <BookOpen size={24} />
                        </div>
                        <CardTitle>Bionic Reading Engine</CardTitle>
                        <CardDescription>
                          Artificial fixation highlights guide saccadic eye movements to minimize
                          reading fatigue and regressions.
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card variant="default">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-secondary-50 text-secondary-dark flex items-center justify-center mb-2">
                          <Sliders size={24} className="text-secondary" />
                        </div>
                        <CardTitle>Dyslexia Customizer</CardTitle>
                        <CardDescription>
                          Adjust typography, line spacing, low-glare cream tinting, and digital
                          reading rulers in real-time.
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card variant="default">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-tertiary-50 text-tertiary-dark flex items-center justify-center mb-2">
                          <Brain size={24} className="text-tertiary" />
                        </div>
                        <CardTitle>Bilingual AI Vision</CardTitle>
                        <CardDescription>
                          Scan textbooks and PDFs with automated Malayalam and English text
                          segmentation and synchronized syllable TTS.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </section>

                  {/* Quick Role Exploration */}
                  <section className="p-8 bg-surface-lowest border border-surface-border rounded-2xl space-y-6">
                    <div className="text-center max-w-xl mx-auto space-y-2">
                      <h2 className="text-headline-md font-bold text-text-primary">
                        Designed for the Entire Learning Circle
                      </h2>
                      <p className="text-body-md text-text-secondary">
                        Whether you are a student, classroom teacher, specialist, or parent,
                        ReadEase gives you a dedicated workspace.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          role: 'student' as UserRole,
                          title: 'Student Studio',
                          desc: 'Bionic reader, audio highlighting & reading rulers',
                          icon: <BookOpen size={20} className="text-primary" />
                        },
                        {
                          role: 'teacher' as UserRole,
                          title: 'Teacher Portal',
                          desc: 'Classroom roster, assignments & student tracking',
                          icon: <Users size={20} className="text-secondary" />
                        },
                        {
                          role: 'special-educator' as UserRole,
                          title: 'Special Educator',
                          desc: 'Clinical screening data, IEP plans & accommodations',
                          icon: <Brain size={20} className="text-tertiary" />
                        },
                        {
                          role: 'parent' as UserRole,
                          title: 'Parent Dashboard',
                          desc: 'Weekly milestones, home practice & growth charts',
                          icon: <Award size={20} className="text-primary-container" />
                        }
                      ].map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => {
                            setActiveRole(item.role);
                            navigate('/login');
                          }}
                          className="p-5 rounded-xl border border-surface-border bg-surface-low hover:bg-surface-lowest hover:border-primary-200 hover:shadow-soft transition-all text-left flex flex-col justify-between group"
                        >
                          <div className="space-y-2">
                            <div className="p-2.5 w-fit rounded-lg bg-surface-lowest border border-surface-border shadow-soft group-hover:scale-105 transition-transform">
                              {item.icon}
                            </div>
                            <h4 className="font-bold text-text-primary text-label-lg">
                              {item.title}
                            </h4>
                            <p className="text-xs text-text-secondary leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                            <span>Explore Workspace</span>
                            <ChevronRight size={14} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Subtle Developer/Design Resources in Footer Section */}
                  <div className="text-center pt-8 border-t border-surface-border text-xs text-text-muted flex flex-wrap items-center justify-center gap-6">
                    <span>Looking for platform assets?</span>
                    <button
                      type="button"
                      onClick={() => navigate('/catalog')}
                      className="text-primary hover:underline font-medium"
                    >
                      UI Component Catalog
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => navigate('/404')}
                      className="text-primary hover:underline font-medium"
                    >
                      404 Not Found Page
                    </button>
                  </div>
                </div>
              </PublicLayout>
            }
          />

          {/* Dedicated Individual Authentication Pages with Navbar and Footer */}
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/signup" element={<SignUpPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/register" element={<SignUpPage onLoginSuccess={handleLoginSuccess} />} />

          {/* 2. AUTHENTICATED DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              activeRole === 'student' ? (
                renderStudentPage(activeNavId)
              ) : (
                <AuthenticatedLayout
                  role={activeRole}
                  activeItemId={activeNavId}
                  onItemSelect={(id) => {
                    setActiveNavId(id);
                    if (id !== 'reading-studio' && activeNavId === 'reading-studio') {
                      setStudioDocument(null);
                    }
                  }}
                  pageTitle={`${activeRole.charAt(0).toUpperCase() + activeRole.slice(1).replace('-', ' ')} Dashboard`}
                  breadcrumbs={['ReadEase', activeRole, activeNavId]}
                  topBarProps={{
                    currentLanguage: language,
                    onLanguageToggle: handleLanguageToggle,
                    isDarkMode: isDarkMode,
                    onDarkModeToggle: handleDarkModeToggle,
                    onPreferencesClick: () => {
                      setIsPreferencesModalOpen(true);
                    }
                  }}
                  sidebarProps={{
                    userName: currentUser?.name || 'Teacher / Specialist',
                    userEmail: currentUser?.email || `${activeRole}@readease.edu`,
                    onLogout: handleLogout,
                    onPrimaryAction: () => {
                      setIsPreferencesModalOpen(true);
                    }
                  }}
                >
                  <div className="space-y-8">
                    <Card variant="highlight" padding="lg">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                          <Badge variant="primary" dot>
                            {activeRole.toUpperCase().replace('-', ' ')} WORKSPACE ACTIVE
                          </Badge>
                          <h2 className="text-display-lg-mobile font-bold text-text-primary">
                            Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}
                          </h2>
                          <p className="text-body-md text-text-secondary max-w-xl">
                            Your personalized cognitive accessibility environment is active. All
                            reading passages and sessions are formatted with your preset
                            accommodations.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="primary"
                            size="md"
                            iconLeft={<Play size={18} />}
                            onClick={() => setIsPreferencesModalOpen(true)}
                          >
                            Adjust Accommodations
                          </Button>
                          <Button variant="outline" size="md" onClick={() => navigate('/')}>
                            Public Site View
                          </Button>
                        </div>
                      </div>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card variant="subtle" padding="sm">
                        <div className="flex items-center justify-between text-text-muted mb-2">
                          <span className="text-label-md font-semibold">Active Sessions</span>
                          <TrendingUp size={18} className="text-tertiary" />
                        </div>
                        <p className="text-display-lg-mobile font-bold text-text-primary">14</p>
                        <p className="text-xs text-text-muted">+24% reading stamina</p>
                      </Card>

                      <Card variant="subtle" padding="sm">
                        <div className="flex items-center justify-between text-text-muted mb-2">
                          <span className="text-label-md font-semibold">Processed Docs</span>
                          <FileText size={18} className="text-primary" />
                        </div>
                        <p className="text-display-lg-mobile font-bold text-text-primary">38</p>
                        <p className="text-xs text-text-muted">PDF & Bionic format</p>
                      </Card>

                      <Card variant="subtle" padding="sm">
                        <div className="flex items-center justify-between text-text-muted mb-2">
                          <span className="text-label-md font-semibold">Accommodations</span>
                          <Sliders size={18} className="text-secondary" />
                        </div>
                        <p className="text-display-lg-mobile font-bold text-text-primary">98%</p>
                        <p className="text-xs text-text-muted">Lexend & Bionic Active</p>
                      </Card>

                      <Card variant="subtle" padding="sm">
                        <div className="flex items-center justify-between text-text-muted mb-2">
                          <span className="text-label-md font-semibold">Badges Earned</span>
                          <Award size={18} className="text-secondary" />
                        </div>
                        <p className="text-display-lg-mobile font-bold text-text-primary">7</p>
                        <p className="text-xs text-text-muted">Top reader milestone</p>
                      </Card>
                    </div>
                  </div>
                </AuthenticatedLayout>
              )
            }
          />

          {/* 2b. STUDENT DIRECT PORTAL ROUTES */}
          <Route path="/student/reading-assessment" element={renderStudentPage('assessment')} />
          <Route path="/student/assessment" element={renderStudentPage('assessment')} />
          <Route path="/student/reading-studio" element={renderStudentPage('reading-studio')} />
          <Route path="/student/studio" element={renderStudentPage('reading-studio')} />
          <Route path="/student/documents" element={renderStudentPage('library')} />
          <Route path="/student/library" element={renderStudentPage('library')} />
          <Route path="/student/achievements" element={renderStudentPage('progress')} />
          <Route path="/student/progress" element={renderStudentPage('progress')} />
          <Route path="/student/customizer" element={renderStudentPage('preferences')} />
          <Route path="/student/preferences" element={renderStudentPage('preferences')} />
          <Route path="/student/dashboard" element={renderStudentPage('dashboard')} />
          <Route path="/student" element={renderStudentPage('dashboard')} />

          {/* 2c. TEACHER PORTAL ROUTES */}
          <Route path="/teacher/dashboard" element={renderTeacherPage('dashboard')} />
          <Route path="/teacher/students" element={renderTeacherPage('roster')} />
          <Route path="/teacher/assignments" element={renderTeacherPage('assignments')} />
          <Route path="/teacher/analytics" element={renderTeacherPage('student-reports')} />
          <Route path="/teacher" element={renderTeacherPage('dashboard')} />

          {/* 2d. SPECIAL EDUCATOR PORTAL ROUTES */}
          <Route path="/educator/dashboard" element={renderEducatorPage('dashboard')} />
          <Route path="/educator/students" element={renderEducatorPage('iep-tracking')} />
          <Route path="/educator" element={renderEducatorPage('dashboard')} />

          {/* 2e. PARENT PORTAL ROUTES */}
          <Route path="/parent/dashboard" element={renderParentPage('dashboard')} />
          <Route path="/parent/reading-log" element={renderParentPage('reading-log')} />
          <Route path="/parent" element={renderParentPage('dashboard')} />

          {/* 3. UI COMPONENT CATALOG */}
          <Route
            path="/catalog"
            element={
              <div className="min-h-screen bg-background-cream text-text-primary p-6 md:p-12 space-y-12">
                <div className="max-w-container mx-auto space-y-12">
                  {/* Header & Back Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-container rounded-full text-label-md font-semibold">
                        <Layers size={16} /> ReadEase Design System
                      </div>
                      <h1 className="text-display-lg font-bold text-text-primary tracking-tight">
                        UI Component Library
                      </h1>
                      <p className="text-body-md text-text-secondary">
                        Accessible, tactile, cognitive-first React components located in{' '}
                        <code className="px-2 py-0.5 bg-surface-low rounded border border-surface-border font-mono text-sm">
                          client/src/components/ui/
                        </code>
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="md"
                      iconLeft={<ArrowLeft size={16} />}
                      onClick={() => navigate('/')}
                    >
                      Back to ReadEase
                    </Button>
                  </div>

                  {/* Buttons */}
                  <Card variant="default" padding="lg" className="space-y-6">
                    <div>
                      <CardTitle>1. Button Variants & Sizes</CardTitle>
                      <CardDescription>
                        Touch-target compliant buttons with loading states, icons, and keyboard
                        focus rings.
                      </CardDescription>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <Button variant="primary" iconLeft={<Sparkles size={16} />}>
                          Primary Action
                        </Button>
                        <Button variant="secondary" iconLeft={<BookOpen size={16} />}>
                          Secondary Amber
                        </Button>
                        <Button variant="tertiary" iconLeft={<Check size={16} />}>
                          Tertiary Sage
                        </Button>
                        <Button variant="outline">Outline Button</Button>
                        <Button variant="ghost">Ghost Button</Button>
                        <Button variant="danger">Danger Action</Button>
                      </div>
                    </div>
                  </Card>

                  {/* Cards */}
                  <div className="space-y-4">
                    <h2 className="text-headline-md font-bold text-text-primary">
                      2. Card Surface Hierarchy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card variant="default">
                        <CardHeader>
                          <Badge variant="primary" dot>
                            DEFAULT SURFACE
                          </Badge>
                          <CardTitle>Default Card</CardTitle>
                          <CardDescription>Standard card with ambient shadow.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-body-md text-text-secondary">
                            Clear visual boundary for modules.
                          </p>
                        </CardContent>
                      </Card>

                      <Card variant="subtle">
                        <CardHeader>
                          <Badge variant="secondary">SUBTLE TINT</Badge>
                          <CardTitle>Subtle Tint Card</CardTitle>
                          <CardDescription>
                            Soft cream background for secondary info.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-body-md text-text-secondary">
                            Reduces contrast against background canvas.
                          </p>
                        </CardContent>
                      </Card>

                      <Card variant="interactive" onClick={() => setIsPreferencesModalOpen(true)}>
                        <CardHeader>
                          <Badge variant="tertiary" dot>
                            INTERACTIVE
                          </Badge>
                          <CardTitle>Clickable Card</CardTitle>
                          <CardDescription>Elevates on hover. Click to test Modal.</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>

                  {/* Alerts & Screening Disclaimer */}
                  <div className="space-y-6">
                    <h2 className="text-headline-md font-bold text-text-primary">
                      3. Alerts & Clinical Disclaimers
                    </h2>
                    <div className="space-y-4">
                      <Alert
                        variant="info"
                        title="Bionic Reading Accommodation Active"
                        onDismiss={() => {}}
                      >
                        Visual fixation points are calculated at 50% fixation strength across all
                        paragraphs.
                      </Alert>
                      <ScreeningDisclaimer />
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          {/* 4. 404 NOT FOUND PAGE (Google Stitch Design Catch-All) */}
          <Route
            path="*"
            element={
              <NotFoundPage
                onNavigateHome={() => navigate('/')}
                onNavigateLibrary={() => navigate('/catalog')}
                onNavigateDashboard={() => {
                  if (!currentUser) {
                    navigate('/login');
                    return;
                  }
                  setActiveNavId('dashboard');
                  navigate('/student/dashboard');
                }}
                onNavigateAssessment={() => {
                  if (!currentUser) {
                    navigate('/login');
                    return;
                  }
                  setActiveNavId('assessment');
                  navigate('/student/reading-assessment');
                }}
                onNavigateAiAssistant={() => {
                  if (!currentUser) {
                    navigate('/login');
                    return;
                  }
                  setActiveNavId('reading-studio');
                  navigate('/student/reading-studio');
                }}
                onNavigateSettings={() => {
                  if (!currentUser) {
                    navigate('/login');
                    return;
                  }
                  setActiveNavId('preferences');
                  navigate('/student/customizer');
                }}
              />
            }
          />
        </Routes>

        {/* Global Reading Accommodation Customizer Modal */}
        <Modal
          isOpen={isPreferencesModalOpen}
          onClose={() => setIsPreferencesModalOpen(false)}
          title="Reading Accommodation Customizer"
          description="Adjust typography scale, fixation intensity, and digital rulers in real time."
        >
          <div className="space-y-6">
            <Input
              label="Reading Fixation Strength (%)"
              type="number"
              defaultValue={50}
              helperText="Recommended: 40% to 60% for optimal saccadic flow"
            />

            <Textarea
              label="Live Reading Sample"
              defaultValue="ReadEase applies research-backed typography, warm low-glare cream backgrounds, and tactile color coding to eliminate visual stress."
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
              <Button variant="ghost" onClick={() => setIsPreferencesModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                iconLeft={<Send size={16} />}
                onClick={() => setIsPreferencesModalOpen(false)}
              >
                Save Accommodations
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ReadingPreferencesProvider>
  );
}

export default App;
