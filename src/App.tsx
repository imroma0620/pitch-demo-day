/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Timer, 
  Settings, 
  History, 
  LayoutList, 
  BookOpen, 
  RotateCcw, 
  Pause, 
  Play,
  Plus,
  ArrowRight,
  LogOut,
  User as UserIcon,
  ChevronLeft,
  Presentation,
  Upload,
  FileText,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, loginWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc 
} from 'firebase/firestore';

interface ProjectStage {
  id: string;
  label: string;
  title: string;
  desc: string;
  duration: number;
  slideUrl?: string;
}

interface PitchProject {
  id: string;
  name: string;
  studentId: string;
  stages: ProjectStage[];
  ownerId: string;
}

const DEFAULT_STAGES: ProjectStage[] = [
  { id: 'intro', label: 'INTRO', title: 'LA APERTURA', desc: 'Captura la atención. ¿Quién eres y por qué estamos aquí?', duration: 45, slideUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800' },
  { id: 'pain', label: 'PAIN', title: 'EL DOLOR', desc: '¿Quién sufre qué? ¿Por qué importa ahora?', duration: 60, slideUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800' },
  { id: 'sol', label: 'SOL', title: 'LA SOLUCIÓN', desc: 'Tu propuesta única. ¿Cómo resuelves el problema?', duration: 90, slideUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800' },
  { id: 'model', label: 'MODEL', title: 'EL MODELO', desc: 'Viabilidad y tracción. ¿Cómo crece este negocio?', duration: 60, slideUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800' },
  { id: 'ask', label: 'ASK', title: 'EL CIERRE', desc: 'La petición clara. ¿Qué necesitas del público?', duration: 45, slideUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=800' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [projects, setProjects] = useState<PitchProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PitchProject | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<'LIST' | 'TIMER'>('LIST');
  const [authError, setAuthError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab ] = useState('TIMER');
  const [wpm, setWpm] = useState(142);
  const timerRef = useRef<HTMLDivElement>(null);

  const canUseApp = Boolean(user) || isGuest;

  const loadGuestProjects = useCallback(() => {
    try {
      const raw = localStorage.getItem('pitch_precision_guest_projects');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PitchProject[]) : [];
    } catch {
      return [];
    }
  }, []);

  const saveGuestProjects = useCallback((next: PitchProject[]) => {
    try {
      localStorage.setItem('pitch_precision_guest_projects', JSON.stringify(next));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchProjects(u.uid);
      } else {
        if (isGuest) {
          const guestProjects = loadGuestProjects();
          setProjects(guestProjects);
          setSelectedProject(null);
          setView('LIST');
        } else {
          setProjects([]);
          setSelectedProject(null);
          setView('LIST');
        }
      }
    });
  }, [isGuest, loadGuestProjects]);

  useEffect(() => {
    if (isGuest && !user) {
      const guestProjects = loadGuestProjects();
      setProjects(guestProjects);
    }
  }, [isGuest, user, loadGuestProjects]);

  const fetchProjects = async (uid: string) => {
    const q = query(collection(db, 'projects'), where('ownerId', '==', uid));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PitchProject));
    setProjects(results);
  };

  const handleCreateProject = async (name: string, studentId: string) => {
    if (!user && !isGuest) return;

    if (!user && isGuest) {
      const newProject: PitchProject = {
        id: crypto.randomUUID(),
        name,
        studentId,
        ownerId: 'guest',
        stages: DEFAULT_STAGES,
      };
      setProjects(prev => {
        const next = [newProject, ...prev];
        saveGuestProjects(next);
        return next;
      });
      setIsCreating(false);
      return;
    }

    if (!user) return;
    const newProject = {
      name,
      studentId,
      ownerId: user.uid,
      stages: DEFAULT_STAGES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'projects'), newProject);
    const project = { id: docRef.id, ...newProject } as PitchProject;
    setProjects(prev => [project, ...prev]);
    setIsCreating(false);
  };

  const handleSelectProject = (project: PitchProject) => {
    setSelectedProject(project);
    const total = project.stages.reduce((acc, s) => acc + s.duration, 0);
    setTimeLeft(total);
    setView('TIMER');
  };

  const handleUpdateStageSlide = async (projectId: string, stageId: string, url: string) => {
    if (!selectedProject) return;
    
    // In a real app, we'd update Firestore here. 
    // For now, we update local state to reflect the change.
    const updatedStages = selectedProject.stages.map(s => 
      s.id === stageId ? { ...s, slideUrl: url } : s
    );
    
    setSelectedProject({ ...selectedProject, stages: updatedStages });
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, stages: updatedStages } : p));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeStage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        handleUpdateStageSlide(selectedProject!.id, activeStage.id, url);
      };
      reader.readAsDataURL(file);
    }
  };

  const getActiveStageIndex = useCallback((remainingSeconds: number, totalSeconds: number, stages: ProjectStage[]) => {
    const elapsed = totalSeconds - remainingSeconds;
    let accumulated = 0;
    for (let i = 0; i < stages.length; i++) {
      accumulated += stages[i].duration;
      if (elapsed < accumulated) return i;
    }
    return stages.length - 1;
  }, []);

  const totalSeconds = selectedProject?.stages.reduce((acc, s) => acc + s.duration, 0) || 0;
  const activeStageIndex = selectedProject ? getActiveStageIndex(timeLeft, totalSeconds, selectedProject.stages) : 0;
  const prevStageIndex = useRef(activeStageIndex);
  const activeStage = selectedProject?.stages[activeStageIndex];
  const nextStage = selectedProject?.stages[activeStageIndex + 1];
  const hasNextStage = Boolean(selectedProject && activeStageIndex < selectedProject.stages.length - 1 && timeLeft > 0);

  // Sound Synth Logic
  const playBeep = useCallback((frequency: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine', duration = 0.1) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Audio error:", e);
    }
  }, []);

  useEffect(() => {
    if (activeStageIndex !== prevStageIndex.current) {
      if (isRunning) playBeep(660, 'sine', 0.15); // Transition beep
      prevStageIndex.current = activeStageIndex;
    }
  }, [activeStageIndex, isRunning, playBeep]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          
          // Sound trigger logic
          if (next > 5) {
            // Standard clock tick every second
            playBeep(1200, 'sine', 0.02); 
          } else if (next <= 5 && next > 0) {
            // High beep for final countdown
            playBeep(1800, 'sine', 0.05);
          } else if (next === 0) {
            // Final terminal buzz
            playBeep(440, 'square', 0.5);
          }
          
          return Math.max(0, next);
        });
        setWpm(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, playBeep]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
  };

  const handleNext = () => {
    if (!selectedProject) return;
    if (activeStageIndex < selectedProject.stages.length - 1) {
      let accumulated = 0;
      for (let i = 0; i <= activeStageIndex; i++) {
        accumulated += selectedProject.stages[i].duration;
      }
      setTimeLeft(totalSeconds - accumulated);
    } else {
      setTimeLeft(0);
    }
  };

  const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  if (!canUseApp) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-8 font-mono text-white">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter">PITCH PRECISION</h1>
            <p className="text-zinc-500 text-sm">Controla cada segundo de tu presentación.</p>
          </div>
          
          <div className="space-y-4">
            <button onClick={handleLogin} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              <UserIcon size={18} /> ENTRAR CON GOOGLE
            </button>

            <button
              onClick={() => {
                setAuthError(null);
                setIsGuest(true);
              }}
              className="w-full py-4 border border-white/20 hover:border-white transition-colors text-xs font-black tracking-widest uppercase"
            >
              CONTINUAR COMO INVITADO
            </button>
            
            <AnimatePresence>
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-xs text-left space-y-2"
                >
                  <p className="font-bold flex items-center gap-2 uppercase tracking-tight">
                    <span className="bg-red-500 text-black px-1">ERROR</span> FALLÓ EL ACCESO
                  </p>
                  <p className="leading-relaxed">{authError}</p>
                  <div className="pt-2 border-t border-red-500/20 text-[10px] opacity-70 italic">
                    Sugerencia: Revisa los pop-ups y cookies de terceros en tu navegador.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-brand-black overflow-hidden font-mono text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/20 flex flex-col hidden md:flex">
        <div className="p-8 border-b border-white/20">
          <h1 className="text-xl font-black tracking-tighter text-white">
            {selectedProject ? selectedProject.studentId : (user ? (user.displayName?.split(' ')[0].toUpperCase() || 'USER') : 'INVITADO')}
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1">
            {selectedProject ? selectedProject.name : 'MIS PROYECTOS'}
          </p>
        </div>
        
        <nav className="flex-1">
          <NavItem 
            icon={<Timer size={18} />} 
            label="TIMER" 
            isActive={view === 'TIMER'} 
            onClick={() => selectedProject && setView('TIMER')}
          />
          <NavItem 
            icon={<LayoutList size={18} />} 
            label="PROJECTS" 
            isActive={view === 'LIST'} 
            onClick={() => setView('LIST')}
          />
          <NavItem 
            icon={<History size={18} />} 
            label="HISTORY" 
            isActive={false} 
            onClick={() => {}}
          />
        </nav>

        <button
          onClick={() => {
            if (user) return signOut(auth);
            setIsGuest(false);
            setProjects([]);
            setSelectedProject(null);
            setView('LIST');
          }}
          className="p-8 text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-2 mt-auto"
        >
          <LogOut size={14} /> {user ? 'CERRAR SESIÓN' : 'SALIR DE INVITADO'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        <header className="h-16 border-b border-white/20 flex items-center justify-between px-8 sticky top-0 bg-brand-black z-10">
          <div className="text-xl font-bold tracking-widest uppercase">
            {view === 'LIST' ? 'PITCH_TIMER_V1.0' : selectedProject?.name}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              <Settings size={20} className="cursor-pointer hover:text-brand-green transition-colors" />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'LIST' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-12 overflow-y-auto w-full"
            >
              <div className="max-w-5xl mx-auto space-y-12">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight uppercase">PROYECTOS_ACTIVOS</h2>
                    <p className="text-zinc-500 text-xs font-bold tracking-widest italic">Panel de gestión de presentaciones</p>
                  </div>
                  {!isCreating && (
                    <button onClick={() => setIsCreating(true)} className="btn-primary px-6 py-3 flex items-center gap-2">
                      <Plus size={18} /> NUEVO_PITCH
                    </button>
                  )}
                </div>

                {isCreating && (
                  <NewProjectForm 
                    onSubmit={handleCreateProject} 
                    onCancel={() => setIsCreating(false)} 
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => handleSelectProject(p)}
                      className="group relative bg-white/5 border border-white/10 p-8 cursor-pointer hover:border-brand-green transition-all"
                    >
                      <div className="absolute top-4 right-4 text-[10px] font-bold text-zinc-600 tracking-widest">
                        ID: {p.studentId}
                      </div>
                      <div className="space-y-4">
                        <div className="w-12 h-1 bg-white/20 group-hover:bg-brand-green transition-colors" />
                        <h3 className="text-xl font-bold tracking-tight uppercase group-hover:text-brand-green transition-colors">{p.name}</h3>
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold tracking-[0.2em]">
                          <ArrowRight size={12} /> VER_PRESENTACIÓN
                        </div>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && !isCreating && (
                    <div className="col-span-full py-20 border-2 border-dashed border-white/5 text-center flex flex-col items-center justify-center space-y-4">
                      <LayoutList size={40} className="text-zinc-800" />
                      <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">SIN PROYECTOS DISPONIBLES</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="timer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col relative bg-black"
            >
              {/* Central Presentation Area */}
              <div className="flex-1 relative flex items-center justify-center p-8 lg:p-16">
                <AnimatePresence mode="wait">
                  {activeStage?.slideUrl ? (
                    <motion.div
                      key={activeStage.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <div className="relative max-w-full max-h-full aspect-video shadow-2xl shadow-brand-green/20 border border-white/10 overflow-hidden bg-zinc-900 group">
                        <img 
                          src={activeStage.slideUrl} 
                          referrerPolicy="no-referrer"
                          alt={activeStage.title}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center">
                           <button 
                             onClick={() => fileInputRef.current?.click()}
                             className="btn-primary flex items-center gap-2"
                           >
                             <Upload size={16} /> CAMBIAR_RECURSO
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 bg-white/[0.02]">
                       <div className="space-y-6 text-center max-w-sm">
                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                            <FileText size={32} className="text-zinc-500" />
                         </div>
                         <div className="space-y-2">
                           <h4 className="text-lg font-bold tracking-tight">SIN RECURSO VISUAL</h4>
                           <p className="text-xs text-zinc-500 leading-relaxed">Carga una imagen (JPG/PNG) para esta etapa del pitch.</p>
                         </div>
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="btn-primary w-full flex items-center justify-center gap-2"
                         >
                           <Upload size={16} /> CARGAR_DIAPOSITIVA
                         </button>
                       </div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Top-Right Overlay Timer */}
                <div className="absolute top-8 right-8 z-30 flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3 bg-brand-black/80 backdrop-blur-md border border-white/20 p-4 shadow-xl">
                    <Clock size={20} className="text-brand-green" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-zinc-500 tracking-[0.3em] uppercase">TIEMPO_RESTANTE</span>
                      <span className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 bg-brand-black/80 backdrop-blur-md px-3 py-1 border border-white/20">
                    RITMO: <span className="text-brand-green">{wpm} WPM</span>
                  </div>
                </div>

                {/* Floating Stage Name Indicator */}
                <div className="absolute top-8 left-8 z-30 flex flex-col items-start gap-4">
                  <button onClick={() => setView('LIST')} className="flex items-center gap-1 text-[10px] font-bold bg-brand-black/80 backdrop-blur-md border border-white/10 px-3 py-2 hover:border-white transition-all">
                    <ChevronLeft size={14} /> LISTA
                  </button>
                  <div className="p-4 bg-brand-black/80 backdrop-blur-md border border-white/10 shadow-xl min-w-[200px]">
                    <div className="text-[8px] font-bold text-brand-green tracking-[0.4em] uppercase mb-1">STATION_ACTIVE</div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase">{activeStage?.title}</h2>
                    <div className="w-8 h-1 bg-brand-green mt-2" />
                  </div>
                </div>
              </div>

              {/* Bottom Timeline & Controls */}
              <div className="h-44 border-t border-white/10 bg-brand-black/90 backdrop-blur-sm p-8 flex flex-col gap-6 sticky bottom-0">
                {/* Timeline */}
                <div className="relative w-full">
                  <div className="grid grid-cols-5 gap-1">
                    {selectedProject?.stages.map((s, idx) => (
                      <div key={s.id} className="relative py-2 group">
                        <div className={`h-1.5 transition-all duration-500 
                          ${idx < activeStageIndex ? 'bg-white' : idx === activeStageIndex ? 'bg-brand-green' : 'bg-white/10'}`}
                        />
                        <div className="mt-3 flex flex-col">
                          <span className={`text-[9px] font-bold tracking-widest ${idx === activeStageIndex ? 'text-brand-green' : 'text-zinc-600'}`}>
                            {s.label}
                          </span>
                          <span className="text-[10px] text-zinc-500 hidden lg:block truncate max-w-[120px]">{s.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Animated Progress Dot on Timeline */}
                  <motion.div 
                    className="absolute top-[8px] -ml-1 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white] z-10"
                    animate={{ left: `${(100 - progress)}%` }}
                    transition={{ type: 'tween', ease: 'linear' }}
                  />
                </div>

                {/* Secondary Controls Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <MetricCard label="SIGUIENTE" value={nextStage?.title || 'FINISH'} />
                  </div>

                  <div className="flex items-center gap-4">
                    <button onClick={handleReset} className="w-12 h-12 flex items-center justify-center border border-white/10 hover:border-white transition-all text-zinc-500 hover:text-white">
                      <RotateCcw size={20} />
                    </button>
                    <button 
                      onClick={() => setIsRunning(!isRunning)} 
                      className={`w-32 h-12 flex items-center justify-center gap-3 font-black text-xs tracking-widest transition-all
                        ${isRunning ? "bg-red-500 text-white" : "bg-white text-black hover:bg-brand-green"}`}
                    >
                      {isRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>
                    {hasNextStage && (
                      <button onClick={handleNext} className="h-12 px-6 flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white transition-all font-black text-xs tracking-widest">
                        SIGUIENTE_ETAPA <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NewProjectForm({ onSubmit, onCancel }: { onSubmit: (n: string, s: string) => void, onCancel: () => void }) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="p-8 border-2 border-white bg-zinc-900 overflow-hidden space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-widest text-zinc-500">PROJECT_NAME</label>
          <input 
            value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-transparent border border-white/20 p-3 focus:border-white outline-none" placeholder="E.g. Pitch Final v2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-widest text-zinc-500">STUDENT_ID</label>
          <input 
            value={studentId} onChange={e => setStudentId(e.target.value)}
            className="w-full bg-transparent border border-white/20 p-3 focus:border-white outline-none" placeholder="E.g. USER_PRO_001"
          />
        </div>
      </div>
      <div className="flex justify-end gap-4">
        <button onClick={onCancel} className="text-xs font-bold text-zinc-500 hover:text-white uppercase">Cancel</button>
        <button onClick={() => name && studentId && onSubmit(name, studentId)} className="btn-primary px-6 py-2 text-sm">CREATE_PROJECT</button>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive?: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-8 py-5 transition-colors group relative ${isActive ? 'bg-white text-black font-black' : 'hover:bg-zinc-900 text-white/70 hover:text-white'}`}>
      {icon}
      <span className="text-xs font-bold tracking-[0.2em]">{label}</span>
      {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-green" />}
    </button>
  );
}

function MetricCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-4 border border-white/20 bg-zinc-900/10 transition-colors hover:border-white/40">
      <div className="text-[9px] font-bold text-zinc-500 tracking-[0.2em] uppercase mb-1">{label}</div>
      <div className="text-sm font-bold truncate uppercase">{value}</div>
    </div>
  );
}

