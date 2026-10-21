import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  ArrowRight,
  Eye,
  Globe,
  Shield,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import type { UserRole } from '../../components/navigation/Sidebar';

interface HomePageProps {
  currentUser?: { role: UserRole; name?: string } | null;
  onSelectRole?: (role: UserRole) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ currentUser, onSelectRole }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Interactive Sensory Simulation Desk state
  const [bionicActive, setBionicActive] = useState(true);
  const [rulerActive, setRulerActive] = useState(false);
  const [bilingualActive, setBilingualActive] = useState(false);
  const [fontFamily, setFontFamily] = useState<'font-lexend' | 'font-atkinson' | 'font-editorial'>('font-lexend');
  const [lineSpacing, setLineSpacing] = useState(1.9);
  const [tracking, setTracking] = useState(0.02);
  const [rulerTop, setRulerTop] = useState(38);

  const paperCanvasRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerActive || !paperCanvasRef.current) return;
    const rect = paperCanvasRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const targetTop = Math.max(16, Math.min(rect.height - 46, offsetY - 18));
    setRulerTop(targetTop);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!rulerActive || !paperCanvasRef.current || e.touches.length === 0) return;
    const rect = paperCanvasRef.current.getBoundingClientRect();
    const offsetY = e.touches[0].clientY - rect.top;
    const targetTop = Math.max(16, Math.min(rect.height - 46, offsetY - 18));
    setRulerTop(targetTop);
  };

  const getTrackingLabel = (val: number) => {
    if (val === 0) return t('home.trackingStandard', 'Standard');
    if (val > 0.06) return t('home.trackingWide', 'Wide');
    return t('home.trackingExpanded', 'Expanded');
  };

  const handlePortalClick = (role: UserRole) => {
    if (onSelectRole) onSelectRole(role);
    if (currentUser) {
      if (currentUser.role === role) {
        navigate(`/${role}/dashboard`);
      } else {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="w-full">
      {/* 1. HERO SECTION */}
      <section
        id="hero"
        aria-labelledby="hero-heading"
        className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low/40 to-background-cream"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Institutional Credential Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary/20 text-xs font-semibold text-primary mb-8 tracking-wide shadow-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary inline-block animate-pulse" />
            <span>{t('home.heroBadge', 'Cognitive Accessibility & Bilingual Saccadic Pacing')}</span>
            <span className="text-text-muted border-l border-primary/20 pl-2 ml-1 font-normal hidden sm:inline">
              WCAG 2.1 AAA Compliant
            </span>
          </div>

          {/* Main Editorial Headline */}
          <h1
            id="hero-heading"
            className={`tracking-tight text-text-primary max-w-4xl mx-auto mb-6 ${
              language === 'ML'
                ? 'text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-medium leading-snug'
                : 'text-3xl sm:text-5xl md:text-6xl font-editorial font-normal leading-[1.18]'
            }`}
          >
            {language === 'ML' ? (
              <>
                വായന എല്ലാവർക്കും ഒരേപോലെയല്ല. നിങ്ങളുടെ മസ്തിഷ്കം പ്രവർത്തിക്കുന്ന രീതിയിലേക്ക് ഞങ്ങൾ അക്ഷരങ്ങളെ{' '}
                <em className="italic text-primary font-medium underline decoration-secondary/80 underline-offset-8">
                  മാറ്റുന്നു
                </em>
                .
              </>
            ) : (
              <>
                Reading isn’t one-size-fits-all. We adapt the printed page to how your brain{' '}
                <em className="italic text-primary font-medium underline decoration-secondary/80 underline-offset-8">
                  actually works
                </em>
                .
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-text-secondary leading-relaxed mb-10 font-normal">
            {t(
              'home.heroDesc',
              'Designed alongside special education pedagogues and neurodivergent readers. ReadEase translates dense academic textbooks into high-legibility saccadic fixations, low-glare ochre focal bands, and syllable phonetics for both English and Malayalam learners.'
            )}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-lg mx-auto">
            <a
              href="#reading-desk"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white bg-tertiary hover:bg-tertiary-dark active:scale-[0.99] border border-tertiary-dark rounded-xl shadow-soft transition-all focus:outline-none focus:ring-2 focus:ring-tertiary focus:ring-offset-2 whitespace-nowrap shrink-0"
            >
              <span>{t('home.tryInteractiveReader', 'Try Interactive Reader')}</span>
              <ArrowRight className="ml-2 w-4 h-4 shrink-0" />
            </a>

            <a
              href="#pedagogy"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-text-primary bg-surface-lowest hover:bg-surface-low active:scale-[0.99] border border-surface-border rounded-xl shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 whitespace-nowrap shrink-0"
            >
              {t('home.viewEvidence', 'View Clinical Evidence')}
            </a>
          </div>

          {/* Footnote Metric Anchors */}
          <div className="mt-14 pt-8 border-t border-surface-border/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-left max-w-4xl mx-auto">
            <div className="p-3 rounded-lg bg-surface-lowest/70 border border-surface-border/60">
              <div className="text-2xl sm:text-3xl font-bold text-primary font-lexend">38.4%</div>
              <div className="text-xs text-text-secondary mt-1">
                {t('home.statFatigue', 'Reduction in visual regression fatigue')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-lowest/70 border border-surface-border/60">
              <div className="text-2xl sm:text-3xl font-bold text-primary font-lexend">2.1x</div>
              <div className="text-xs text-text-secondary mt-1">
                {t('home.statDuration', 'Sustained reading duration')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-lowest/70 border border-surface-border/60">
              <div className="text-2xl sm:text-3xl font-bold text-secondary-dark font-lexend">Dual-Script</div>
              <div className="text-xs text-text-secondary mt-1">
                {t('home.statDualScript', 'English & Malayalam segmentation')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-lowest/70 border border-surface-border/60">
              <div className="text-2xl sm:text-3xl font-bold text-tertiary-dark font-lexend">Zero Glare</div>
              <div className="text-xs text-text-secondary mt-1">
                {t('home.statZeroGlare', 'Paper-tinted cognitive underlays')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE SENSORY SIMULATION DESK */}
      <section
        id="reading-desk"
        aria-labelledby="desk-heading"
        className="py-16 md:py-24 bg-surface-lowest border-y border-surface-border"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header for Sandbox Desk */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-tertiary mb-2">
                <span className="w-2.5 h-2.5 bg-tertiary rounded-sm inline-block" />
                {t('home.deskTag', 'Live Sensory Simulation Desk')}
              </div>
              <h2
                id="desk-heading"
                className="text-2xl sm:text-4xl font-editorial text-text-primary font-normal"
              >
                {t('home.deskHeading', 'Calibrate the page to your personal optical bandwidth.')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary max-w-md leading-relaxed">
              {t(
                'home.deskDesc',
                'Adjust font weight, letter spacing, line height, and optical guidance overlays below. Experience the reduction in cognitive crowding in real time.'
              )}
            </p>
          </div>

          {/* Physicalized Reading Desk Container */}
          <div className="bg-surface-low border border-surface-border rounded-2xl p-4 sm:p-7 shadow-card">
            {/* Desk Control Bar */}
            <div
              data-purpose="desk-controls"
              className="bg-surface-lowest border border-surface-border rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center shadow-sm"
            >
              {/* Mode Switcher Tabs */}
              <div
                role="tablist"
                aria-label="Reading Mode Toggles"
                className="md:col-span-5 flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  onClick={() => setBionicActive(!bionicActive)}
                  aria-pressed={bionicActive}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    bionicActive
                      ? 'bg-primary text-white border-primary shadow-soft'
                      : 'bg-surface-lowest text-text-primary border-surface-border hover:bg-surface-low'
                  }`}
                >
                  {t('home.btnBionic', 'Bionic Fixation')}: {bionicActive ? 'ON' : 'OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => setRulerActive(!rulerActive)}
                  aria-pressed={rulerActive}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    rulerActive
                      ? 'bg-secondary text-text-primary border-secondary font-bold shadow-soft'
                      : 'bg-surface-lowest text-text-primary border-surface-border hover:bg-surface-low'
                  }`}
                >
                  {t('home.btnRuler', 'Optical Ruler (Ochre)')}: {rulerActive ? 'ACTIVE' : 'OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => setBilingualActive(!bilingualActive)}
                  aria-pressed={bilingualActive}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    bilingualActive
                      ? 'bg-tertiary text-white border-tertiary shadow-soft'
                      : 'bg-surface-lowest text-text-primary border-surface-border hover:bg-surface-low'
                  }`}
                >
                  {t('home.btnBilingual', 'Malayalam Phonics')}: {bilingualActive ? 'SHOWN' : 'HIDDEN'}
                </button>
              </div>

              {/* Font Family Selector */}
              <div className="md:col-span-3 flex items-center gap-2">
                <label htmlFor="fontSelect" className="text-xs font-medium text-text-secondary whitespace-nowrap">
                  {t('home.typefaceLabel', 'Typeface:')}
                </label>
                <select
                  id="fontSelect"
                  value={fontFamily}
                  onChange={(e) =>
                    setFontFamily(e.target.value as 'font-lexend' | 'font-atkinson' | 'font-editorial')
                  }
                  className="w-full text-xs font-medium border border-surface-border rounded-lg bg-surface-low text-text-primary py-2 px-2.5 focus:ring-2 focus:ring-tertiary focus:border-tertiary focus:outline-none"
                >
                  <option value="font-lexend">Lexend (De-crowded)</option>
                  <option value="font-atkinson">Atkinson Hyperlegible</option>
                  <option value="font-editorial">Newsreader (Editorial Serif)</option>
                </select>
              </div>

              {/* Fine-Tuning Sliders */}
              <div className="md:col-span-4 flex items-center gap-4">
                {/* Line Spacing Slider */}
                <div className="w-1/2 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-medium text-text-secondary">
                    <span>{t('home.lineHeight', 'Line Height')}</span>
                    <span className="text-primary font-semibold">{lineSpacing}x</span>
                  </div>
                  <input
                    id="lineSpacingSlider"
                    type="range"
                    min="1.4"
                    max="2.6"
                    step="0.1"
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-surface-border rounded-lg cursor-pointer accent-tertiary"
                  />
                </div>

                {/* Tracking / Letter Spacing Slider */}
                <div className="w-1/2 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-medium text-text-secondary">
                    <span>{t('home.tracking', 'Tracking')}</span>
                    <span className="text-primary font-semibold">{getTrackingLabel(tracking)}</span>
                  </div>
                  <input
                    id="trackingSlider"
                    type="range"
                    min="0"
                    max="0.12"
                    step="0.02"
                    value={tracking}
                    onChange={(e) => setTracking(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-surface-border rounded-lg cursor-pointer accent-tertiary"
                  />
                </div>
              </div>
            </div>

            {/* Realistic Paper Sheet (Reading Area) */}
            <div
              ref={paperCanvasRef}
              id="paperCanvas"
              data-purpose="reading-paper-sheet"
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              className="relative bg-paper-texture border border-surface-border rounded-xl p-6 sm:p-10 shadow-sm overflow-hidden select-text min-h-[360px]"
            >
              {/* Interactive Visual Ruler Bar (Position updated via Mouse/Touch) */}
              {rulerActive && (
                <div
                  className="reading-ruler-guide pointer-events-none"
                  style={{ top: `${rulerTop}px` }}
                />
              )}

              {/* Rendered Text Content Body */}
              <div
                id="readingContent"
                className={`text-base sm:text-lg text-text-primary transition-all duration-150 ${fontFamily}`}
                style={{
                  lineHeight: lineSpacing,
                  letterSpacing: `${tracking}em`
                }}
              >
                {/* English Passage with Bionic Anchors */}
                <div className="space-y-4">
                  <p>
                    {bionicActive ? (
                      <>
                        <strong className="font-bold text-primary">Tra</strong>ditional{' '}
                        <strong className="font-bold text-primary">pub</strong>lishing{' '}
                        <strong className="font-bold text-primary">as</strong>sumes{' '}
                        <strong className="font-bold text-primary">th</strong>at{' '}
                        <strong className="font-bold text-primary">eve</strong>ry{' '}
                        <strong className="font-bold text-primary">hu</strong>man{' '}
                        <strong className="font-bold text-primary">br</strong>ain{' '}
                        <strong className="font-bold text-primary">pro</strong>cesses{' '}
                        <strong className="font-bold text-primary">un</strong>broken{' '}
                        <strong className="font-bold text-primary">typ</strong>ographic{' '}
                        <strong className="font-bold text-primary">str</strong>ings{' '}
                        <strong className="font-bold text-primary">wi</strong>th{' '}
                        <strong className="font-bold text-primary">iden</strong>tical{' '}
                        <strong className="font-bold text-primary">vis</strong>ual{' '}
                        <strong className="font-bold text-primary">effi</strong>ciency.{' '}
                        <strong className="font-bold text-primary">Ho</strong>wever,{' '}
                        <strong className="font-bold text-primary">clini</strong>cal{' '}
                        <strong className="font-bold text-primary">neu</strong>ropsychology{' '}
                        <strong className="font-bold text-primary">dem</strong>onstrates{' '}
                        <strong className="font-bold text-primary">th</strong>at{' '}
                        <strong className="font-bold text-primary">dys</strong>lexic{' '}
                        <strong className="font-bold text-primary">rea</strong>ders{' '}
                        <strong className="font-bold text-primary">fre</strong>quently{' '}
                        <strong className="font-bold text-primary">exp</strong>erience{' '}
                        <strong className="font-bold text-primary">vis</strong>ual{' '}
                        <strong className="font-bold text-primary">cro</strong>wding—
                        <strong className="font-bold text-primary">whe</strong>re{' '}
                        <strong className="font-bold text-primary">adj</strong>acent{' '}
                        <strong className="font-bold text-primary">let</strong>terforms{' '}
                        <strong className="font-bold text-primary">col</strong>lide{' '}
                        <strong className="font-bold text-primary">an</strong>d{' '}
                        <strong className="font-bold text-primary">tri</strong>gger{' '}
                        <strong className="font-bold text-primary">inv</strong>oluntary{' '}
                        <strong className="font-bold text-primary">sac</strong>cadic{' '}
                        <strong className="font-bold text-primary">reg</strong>ressions.
                      </>
                    ) : (
                      'Traditional publishing assumes that every human brain processes unbroken typographic strings with identical visual efficiency. However, clinical neuropsychology demonstrates that dyslexic readers frequently experience visual crowding—where adjacent letterforms collide and trigger involuntary saccadic regressions.'
                    )}
                  </p>

                  <p>
                    {bionicActive ? (
                      <>
                        <strong className="font-bold text-primary">By</strong>{' '}
                        <strong className="font-bold text-primary">arti</strong>ficially{' '}
                        <strong className="font-bold text-primary">wei</strong>ghting{' '}
                        <strong className="font-bold text-primary">ini</strong>tial{' '}
                        <strong className="font-bold text-primary">pho</strong>netic{' '}
                        <strong className="font-bold text-primary">fix</strong>ation{' '}
                        <strong className="font-bold text-primary">poi</strong>nts,{' '}
                        <strong className="font-bold text-primary">Rea</strong>dEase{' '}
                        <strong className="font-bold text-primary">cre</strong>ates{' '}
                        <strong className="font-bold text-primary">nat</strong>ural{' '}
                        <strong className="font-bold text-primary">step</strong>ping{' '}
                        <strong className="font-bold text-primary">sto</strong>nes{' '}
                        <strong className="font-bold text-primary">acr</strong>oss{' '}
                        <strong className="font-bold text-primary">ea</strong>ch{' '}
                        <strong className="font-bold text-primary">sen</strong>tence.{' '}
                        <strong className="font-bold text-primary">Th</strong>e{' '}
                        <strong className="font-bold text-primary">res</strong>ult{' '}
                        <strong className="font-bold text-primary">i</strong>s{' '}
                        <strong className="font-bold text-primary">me</strong>asurable:{' '}
                        <strong className="font-bold text-primary">cog</strong>nitive{' '}
                        <strong className="font-bold text-primary">res</strong>ources{' '}
                        <strong className="font-bold text-primary">shi</strong>ft{' '}
                        <strong className="font-bold text-primary">fr</strong>om{' '}
                        <strong className="font-bold text-primary">lab</strong>ored{' '}
                        <strong className="font-bold text-primary">vis</strong>ual{' '}
                        <strong className="font-bold text-primary">dec</strong>oding{' '}
                        <strong className="font-bold text-primary">di</strong>rectly{' '}
                        <strong className="font-bold text-primary">in</strong>to{' '}
                        <strong className="font-bold text-primary">dee</strong>p{' '}
                        <strong className="font-bold text-primary">tex</strong>tual{' '}
                        <strong className="font-bold text-primary">com</strong>prehension.
                      </>
                    ) : (
                      'By artificially weighting initial phonetic fixation points, ReadEase creates natural stepping stones across each sentence. The result is measurable: cognitive resources shift from labored visual decoding directly into deep textual comprehension.'
                    )}
                  </p>
                </div>

                {/* Malayalam Script Phonetic Breakdown */}
                {bilingualActive && (
                  <div className="space-y-4 font-malayalam border-t border-surface-border/80 pt-5 mt-5">
                    <div className="text-xs uppercase font-sans font-semibold tracking-wider text-secondary-dark flex items-center gap-1.5">
                      <Globe size={14} className="text-secondary" />
                      <span>{t('home.bilingualTag', 'Bilingual Malayalam Orthography Breakdown')}</span>
                    </div>
                    <p className="text-lg leading-relaxed">
                      <span className="inline-block px-2 py-0.5 bg-primary-50 border border-primary/20 rounded mr-1.5 text-primary font-bold">
                        വായന
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-primary-50 border border-primary/20 rounded mr-1.5 text-primary font-bold">
                        എല്ലാവർക്കും
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-secondary-50 border border-secondary/30 rounded mr-1.5 text-secondary-dark font-bold">
                        ലളിതമാക്കുക
                      </span>
                      . മലയാളത്തിലെ കൂട്ടക്ഷരങ്ങളും സങ്കീർണ്ണ സ്വരങ്ങളും വേർതിരിച്ച് വായിക്കാൻ കുട്ടികളെ സഹായിക്കുന്ന സാങ്കേതികവിദ്യ.
                    </p>
                    <p className="text-xs font-sans text-text-secondary leading-relaxed">
                      {t(
                        'home.malayalamPhoneticNote',
                        'Phonetic translation: Segmenting Malayalam conjunct ligatures reduces phonological stress for bilingual dyslexic students learning in dual-medium classrooms.'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Paper Sheet Footer Meta */}
              <div className="mt-8 pt-4 border-t border-surface-border/80 flex flex-wrap items-center justify-between text-xs text-text-secondary gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  <span>
                    {t('home.paperSpec', 'Active Spec: Lexend Optical 12pt / Warm Ochre Contrast Band')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-text-primary">
                    {t('home.paperSpeed', 'Standardized Reading Speed Target: 185 WPM')}
                  </span>
                </div>
              </div>
            </div>

            {/* Ruler Interactive Tip */}
            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-text-secondary px-1 gap-2">
              <span className="flex items-center gap-1">
                <Lightbulb size={13} className="text-secondary" />
                {t(
                  'home.rulerTip',
                  'Tip: Move your mouse or touch over the paper above to reposition the Ochre Reading Guide line.'
                )}
              </span>
              <span className="font-semibold text-primary">100% Client-Side Rendered</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PEDAGOGY & CLINICAL EVIDENCE GRID */}
      <section
        id="pedagogy"
        aria-labelledby="features-heading"
        className="py-20 md:py-28 bg-surface-low/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <div className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-2">
              {t('home.pedagogyTag', 'Pedagogical Framework')}
            </div>
            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl font-editorial text-text-primary font-normal mb-4"
            >
              {t('home.pedagogyHeading', 'Built upon clinical cognitive research, not fleeting novelty.')}
            </h2>
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
              {t(
                'home.pedagogyDesc',
                'Every feature within ReadEase corresponds directly to published neuropsychological protocols for mitigating visual stress (Meares-Irlen syndrome), phonemic processing delays, and working memory overload.'
              )}
            </p>
          </div>

          {/* 3-Column Editorial Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Saccadic Fixation */}
            <div className="bg-surface-lowest border border-surface-border p-7 rounded-2xl shadow-card hover:border-primary/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-primary-50 border border-primary/20 rounded-xl flex items-center justify-center text-primary mb-5 group-hover:scale-105 transition-transform">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {t('home.cardSaccadicTitle', 'Saccadic Fixation Guidance')}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                  {t(
                    'home.cardSaccadicDesc',
                    'Rather than forcing the eye to decode uniform letterforms, ReadEase algorithmically weights phonetic anchor letters. This prevents saccadic regressions and lowers the ocular energy expenditure required to finish a single chapter.'
                  )}
                </p>
              </div>
              <div className="pt-4 border-t border-surface-border text-[11px] font-semibold text-primary flex items-center gap-1.5">
                <span>Research: Rayner &amp; Pollatsek Eye-Movement Matrix</span>
              </div>
            </div>

            {/* Card 2: Bilingual Dual-Script */}
            <div
              id="bilingual"
              className="bg-surface-lowest border border-surface-border p-7 rounded-2xl shadow-card hover:border-secondary/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 bg-secondary-50 border border-secondary/30 rounded-xl flex items-center justify-center text-secondary-dark mb-5 group-hover:scale-105 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {t('home.cardBilingualTitle', 'Bilingual Dual-Script Parsing')}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                  {t(
                    'home.cardBilingualDesc',
                    'South Asian syllabic orthographies (like Malayalam) pose distinct challenges for dyslexic children due to stacked ligatures and vowel diacritics. Our parser cleanly isolates conjunct consonants into digestible syllable blocks.'
                  )}
                </p>
              </div>
              <div className="pt-4 border-t border-surface-border text-[11px] font-semibold text-secondary-dark flex items-center gap-1.5">
                <span>Co-developed for Kerala State Educational Curriculums</span>
              </div>
            </div>

            {/* Card 3: Visual Stress & Tint */}
            <div className="bg-surface-lowest border border-surface-border p-7 rounded-2xl shadow-card hover:border-tertiary/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-tertiary-50 border border-tertiary/20 rounded-xl flex items-center justify-center text-tertiary mb-5 group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {t('home.cardVisualStressTitle', 'Visual Stress & Tint Shielding')}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                  {t(
                    'home.cardVisualStressDesc',
                    'High-contrast pure black-on-white causes optical glare and perceived "letter vibration" for 46% of individuals with dyslexia. Our warm paper backdrops and ochre focal bands preserve visual comfort during multi-hour study sessions.'
                  )}
                </p>
              </div>
              <div className="pt-4 border-t border-surface-border text-[11px] font-semibold text-tertiary flex items-center gap-1.5">
                <span>Calibrated via Wilkins Colorimeter Standards</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LEARNING CIRCLE BAYS (STAKEHOLDER PORTALS) */}
      <section
        id="circle"
        aria-labelledby="circle-heading"
        className="py-20 md:py-28 bg-surface-lowest border-t border-surface-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2
              id="circle-heading"
              className="text-3xl sm:text-4xl font-editorial text-text-primary font-normal mb-3"
            >
              {t('home.learningCircleTitle', 'Designed for the entire learning circle.')}
            </h2>
            <p className="text-sm sm:text-base text-text-secondary">
              {t(
                'home.learningCircleDesc',
                'Assistive reading succeeds only when the student, educator, clinician, and guardian operate from the same synchronized accommodation model.'
              )}
            </p>
          </div>

          {/* 4 Humanized Stakeholder Bays */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Student Portal */}
            <div className="bg-surface-low border border-surface-border rounded-2xl p-6 hover:border-primary/60 hover:shadow-card transition-all flex flex-col justify-between group">
              <div>
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  {t('home.roleStudentSub', 'Independent Learner')}
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1 mb-2">
                  {t('home.roleStudentTitle', 'Student Studio')}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(
                    'home.roleStudentDescNew',
                    'Ad-free reading environment, instant document upload, customized visual rulers, and synchronized text-to-speech with bilingual syllable tracking.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePortalClick('student')}
                className="mt-6 inline-flex items-center text-xs font-semibold text-primary group-hover:underline gap-1 text-left"
              >
                <span>{t('home.accessStudent', 'Access Student Studio')}</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Teacher Portal */}
            <div className="bg-surface-low border border-surface-border rounded-2xl p-6 hover:border-secondary/60 hover:shadow-card transition-all flex flex-col justify-between group">
              <div>
                <span className="text-[11px] font-semibold text-secondary-dark uppercase tracking-wider">
                  {t('home.roleTeacherSub', 'Classroom Integration')}
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1 mb-2">
                  {t('home.roleTeacherTitle', 'Teacher Portal')}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(
                    'home.roleTeacherDescNew',
                    'Batch convert curriculum worksheets and reading assignments into accommodated formats. Track cohort engagement without stigmatizing students.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePortalClick('teacher')}
                className="mt-6 inline-flex items-center text-xs font-semibold text-secondary-dark group-hover:underline gap-1 text-left"
              >
                <span>{t('home.exploreTeacher', 'Explore Teacher Tools')}</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Specialist Portal */}
            <div className="bg-surface-low border border-surface-border rounded-2xl p-6 hover:border-tertiary/60 hover:shadow-card transition-all flex flex-col justify-between group">
              <div>
                <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wider">
                  {t('home.roleSpecialistSub', 'Clinical Guidance')}
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1 mb-2">
                  {t('home.roleSpecialistTitle', 'Special Educator & IEP')}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(
                    'home.roleSpecialistDescNew',
                    'Document accommodation efficacy directly for IEP compliance. Export reading velocity, error regressions, and visual fatigue logs.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePortalClick('special-educator')}
                className="mt-6 inline-flex items-center text-xs font-semibold text-tertiary group-hover:underline gap-1 text-left"
              >
                <span>{t('home.viewSpecialist', 'View Clinical IEP Bay')}</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Parent Portal */}
            <div className="bg-surface-low border border-surface-border rounded-2xl p-6 hover:border-primary-container/60 hover:shadow-card transition-all flex flex-col justify-between group">
              <div>
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  {t('home.roleParentSub', 'Home Practice')}
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1 mb-2">
                  {t('home.roleParentTitle', 'Parent Dashboard')}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(
                    'home.roleParentDescNew',
                    'Clear, compassionate growth markers without complex medical jargon. Support 15 minutes of evening reading with frictionless digital tools.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePortalClick('parent')}
                className="mt-6 inline-flex items-center text-xs font-semibold text-text-primary group-hover:underline gap-1 text-left"
              >
                <span>{t('home.openFamily', 'Open Family Hub')}</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VOICES FROM CLASSROOMS & CLINICAL OBSERVATIONS */}
      <section
        id="voices"
        aria-labelledby="voices-heading"
        className="py-20 md:py-28 bg-surface-low/50 border-t border-surface-border"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <div className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-2">
              {t('home.voicesTag', 'Observations from the Field')}
            </div>
            <h2
              id="voices-heading"
              className="text-3xl sm:text-4xl font-editorial text-text-primary font-normal"
            >
              {t('home.voicesHeading', 'Voices from classrooms, reading clinics, and homes.')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <article className="bg-surface-lowest border border-surface-border rounded-2xl p-7 shadow-card flex flex-col justify-between">
              <p className="font-editorial text-text-primary text-base sm:text-lg leading-relaxed italic mb-6">
                "{t(
                  'home.testimonial1',
                  'For my 5th-grade dyslexic students, the combination of ochre visual shielding with saccadic fixations stopped the endless page headaches. They read for 25 continuous minutes without asking for a cognitive break.'
                )}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
                  MR
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary">Meera Ramachandran</div>
                  <div className="text-[11px] text-text-muted">Reading Specialist, Kozhikode District</div>
                </div>
              </div>
            </article>

            {/* Testimonial 2 */}
            <article className="bg-surface-lowest border border-surface-border rounded-2xl p-7 border-l-4 border-l-tertiary shadow-card flex flex-col justify-between">
              <p className="font-editorial text-text-primary text-base sm:text-lg leading-relaxed italic mb-6">
                "{t(
                  'home.testimonial2',
                  'I spent college having to re-read every single paragraph three times because my eyes drifted between sentences. Being able to set custom line spacing and font tracking in ReadEase has honestly changed how I study law.'
                )}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
                <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary-dark font-bold text-xs flex items-center justify-center border border-secondary/30">
                  AK
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary">Arun Kurien</div>
                  <div className="text-[11px] text-text-muted">Dyslexic Law Student, Trivandrum</div>
                </div>
              </div>
            </article>

            {/* Testimonial 3 */}
            <article className="bg-surface-lowest border border-surface-border rounded-2xl p-7 shadow-card flex flex-col justify-between">
              <p className="font-editorial text-text-primary text-base sm:text-lg leading-relaxed italic mb-6">
                "{t(
                  'home.testimonial3',
                  'The bilingual Malayalam support is unprecedented. Most assistive software only cares about standard English texts. Seeing stacked Malayalam letters rendered with phoneme spacing gave my daughter her confidence back.'
                )}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
                <div className="w-10 h-10 rounded-xl bg-tertiary-50 text-tertiary font-bold text-xs flex items-center justify-center border border-tertiary/20">
                  SB
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary">Sunita Balan</div>
                  <div className="text-[11px] text-text-muted">Parent &amp; Special Needs Advocate</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 6. PRE-FOOTER CALL TO ACTION BANNER */}
      <section
        aria-labelledby="cta-heading"
        className="py-16 md:py-24 bg-surface-lowest border-t border-surface-border"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            id="cta-heading"
            className="text-3xl sm:text-4xl font-editorial text-text-primary font-normal mb-3"
          >
            {t('home.ctaHeading', 'Every reader deserves a page that meets them halfway.')}
          </h2>
          <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto mb-8">
            {t(
              'home.ctaSubtitle',
              'Free for neurodivergent individuals, public school classrooms, and special education clinics. No tracking, no paywalls on basic accommodations.'
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  navigate('/student/reading-studio');
                } else {
                  navigate('/signup');
                }
              }}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-white bg-tertiary hover:bg-tertiary-dark rounded-xl shadow-soft transition-all focus:outline-none focus:ring-2 focus:ring-tertiary focus:ring-offset-2 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>{t('home.launchStudio', 'Launch Reading Studio Now')}</span>
              <ArrowRight size={16} className="shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-text-primary bg-surface-lowest hover:bg-surface-low border border-surface-border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 whitespace-nowrap shrink-0"
            >
              {t('home.institutionalPilots', 'UI Component Catalog & Demos')}
            </button>
          </div>

          {/* Quick link to 404 or other design mockups */}
          <div className="mt-8 text-xs text-text-muted flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/404')}
              className="hover:underline text-text-secondary"
            >
              {t('home.view404', 'View 404 Screen')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
