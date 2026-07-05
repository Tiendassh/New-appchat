'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, Search, Bell, Home, MessageSquare, BookOpen, Rss, 
  Heart, MessageCircle, Play, Pause, SkipBack, SkipForward, 
  List, Volume2, Clock, Star, FastForward, Rewind
} from 'lucide-react';
import Link from 'next/link';

// Feed Component
function Feed({ onPlayTrack }: { onPlayTrack: (track: any) => void }) {
  const sampleRelato = {
    id: 1,
    title: "El Faro del Fin del Mundo",
    author: "Carlos Mendoza",
    duration: "15:00",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Sample audio
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-900/30 to-slate-950 space-y-6 pb-32">
      {/* FILTROS DE CONTENIDO */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-indigo-500 text-indigo-400">Todo el Feed</button>
        <button className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 border-b-2 border-transparent">Solo Relatos</button>
        <button className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 border-b-2 border-transparent">Comunidad</button>
      </div>

      {/* POST DE USUARIO */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold">EA</div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Elena_Aris</h4>
              <span className="text-xs text-slate-500">Hace 12 min</span>
            </div>
          </div>
          <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full border border-slate-700/50">💬 Debate</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          ¿Alguien ya escuchó el último relato de terror de medianoche? Los efectos de sonido en estéreo ambiental son brutales. Me dejó con la piel de gallina... ¡Recomendadísimo para escuchar a oscuras! 🍿
        </p>
        <div className="flex items-center gap-6 text-slate-400 text-xs pt-2 border-t border-slate-800/60">
          <button className="hover:text-indigo-400 flex items-center gap-1.5 transition-colors"><Heart size={14} /> 42</button>
          <button className="hover:text-indigo-400 flex items-center gap-1.5 transition-colors"><MessageCircle size={14} /> 15 comentarios</button>
        </div>
      </div>

      {/* TARJETA DE RELATO DESTACADO */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-950">
              ⚓
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">🎙️ Nuevo Relato Pro</span>
              <h3 className="text-lg font-bold text-white">{sampleRelato.title}</h3>
              <p className="text-sm text-slate-400">Por {sampleRelato.author} • <span className="text-slate-500">Aventuras / Misterio</span></p>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                <span className="flex items-center"><Clock size={12} className="mr-1" /> {sampleRelato.duration}</span>
                <span className="flex items-center"><Star size={12} className="mr-1 text-amber-400" /> 4.9 (128 votos)</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <button 
              onClick={() => onPlayTrack(sampleRelato)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Play size={16} fill="currentColor" /> Escuchar Relato
            </button>
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm px-4 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-2">
              <BookOpen size={16} /> Leer Blog
            </button>
          </div>
        </div>
      </div>

      {/* ENCUESTA COMUNITARIA */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div>
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">📊 Encuesta</span>
          <h4 className="text-sm font-semibold text-slate-200 mt-1">¿Cuál debería ser la temática del relato interactivo de la próxima semana?</h4>
        </div>
        <div className="space-y-2">
          <button className="w-full text-left text-sm bg-slate-800/50 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center transition-all">
            <span>🚀 Ciencia Ficción (Cyberpunk)</span>
            <span className="text-xs font-semibold text-slate-400">64%</span>
          </button>
          <button className="w-full text-left text-sm bg-slate-800/50 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center transition-all">
            <span>🧙‍♂️ Fantasía Oscura</span>
            <span className="text-xs font-semibold text-slate-400">36%</span>
          </button>
        </div>
      </div>
    </main>
  );
}

// Player Component
function Player({ track, isPlaying, setIsPlaying }: { track: any, isPlaying: boolean, setIsPlaying: (val: boolean) => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current || !track) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(err => console.log("Error al reproducir:", err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, track]);

  if (!track) {
    return (
      <footer className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-800 text-slate-500 flex items-center justify-center text-sm z-20">
        Ningún relato seleccionado — Elige uno del feed para comenzar.
      </footer>
    );
  }

  return (
    <footer className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-800/80 px-6 flex items-center justify-between z-20 shadow-2xl">
      <audio ref={audioRef} src={track.audioUrl} />

      {/* Izquierda: Info de reproducción */}
      <div className="flex items-center gap-3 w-1/4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center text-xl shadow">⚓</div>
        <div className="truncate hidden sm:block">
          <h5 className="text-sm font-semibold text-slate-200 truncate">{track.title}</h5>
          <p className="text-xs text-slate-400 truncate">{track.author}</p>
        </div>
      </div>

      {/* Centro: Controles del reproductor */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        <div className="flex items-center gap-5 text-slate-300">
          <button className="hover:text-indigo-400 text-sm transition-colors"><SkipBack size={16} fill="currentColor" /></button>
          <button className="hover:text-indigo-400 text-sm transition-colors"><Rewind size={16} fill="currentColor" /></button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button className="hover:text-indigo-400 text-sm transition-colors"><FastForward size={16} fill="currentColor" /></button>
          <button className="hover:text-indigo-400 text-sm transition-colors"><SkipForward size={16} fill="currentColor" /></button>
        </div>
        <div className="w-full flex items-center gap-3 text-[10px] text-slate-500 font-mono">
          <span>00:00</span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden relative cursor-pointer group">
            <div className="absolute top-0 left-0 h-full w-1/4 bg-indigo-500 group-hover:bg-indigo-400 transition-colors"></div>
          </div>
          <span>{track.duration}</span>
        </div>
      </div>

      {/* Derecha: Opciones y volumen */}
      <div className="flex items-center justify-end gap-4 w-1/4">
        <button className="text-xs font-bold text-indigo-400 bg-indigo-950 border border-indigo-900 px-2 py-1 rounded-md hover:bg-indigo-900/50 transition-colors">1.25x</button>
        <button className="text-slate-400 hover:text-white transition-colors hidden sm:block"><List size={16} /></button>
        <div className="flex items-center gap-2 text-slate-400 hidden md:flex">
          <Volume2 size={16} />
          <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-slate-400"></div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function DashboardApp() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayTrack = (track: any) => {
    if (currentTrack?.id === track.id) {
        setIsPlaying(!isPlaying);
    } else {
        setCurrentTrack(track);
        setIsPlaying(true);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 font-sans h-screen flex flex-col overflow-hidden">
      {/* BARRA SUPERIOR */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold text-xl"><Brain size={24} /></div>
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">CEREBRO</span>
        </div>
        <div className="w-1/3 relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Buscar relatos, salas o amigos..." className="w-full bg-slate-800/60 border border-slate-700/50 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 mr-2">
            Volver a App
          </Link>
          <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-slate-700 flex items-center justify-center font-bold text-sm">U</div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR IZQUIERDO */}
        <aside className="w-64 border-r border-slate-800/60 bg-slate-900/20 p-4 flex-col justify-between hidden md:flex">
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600/10 text-indigo-400 font-medium transition-all">
              <Home size={18} /> Inicio
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all">
              <MessageSquare size={18} /> Salas de Chat
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all">
              <BookOpen size={18} /> Relatos y Blog
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all">
              <Rss size={18} /> Feed Global
            </a>
          </nav>
          <div className="p-4 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl">
            <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider mb-1">Escuchando ahora</p>
            <p className="text-sm font-medium text-slate-200 truncate">{currentTrack ? currentTrack.title : "Ninguno"}</p>
            <span className="text-xs text-slate-400">{currentTrack ? currentTrack.author : "-"}</span>
          </div>
        </aside>

        {/* CONTENIDO CENTRAL */}
        <Feed onPlayTrack={handlePlayTrack} />

        {/* SIDEBAR DERECHO */}
        <aside className="w-80 border-l border-slate-800/60 bg-slate-900/20 p-5 space-y-6 hidden lg:flex flex-col">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Salas de Chat Activas
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎧</span>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">Club de Lectura</h4>
                    <p className="text-xs text-slate-500">Debatiendo el capítulo 3</p>
                  </div>
                </div>
                <span className="bg-indigo-950 text-indigo-400 text-[10px] px-2 py-0.5 rounded-md border border-indigo-900/50 font-bold">42 online</span>
              </div>
              <div className="p-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👹</span>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">Terror Nocturno</h4>
                    <p className="text-xs text-slate-500">Historias paranormales reales</p>
                  </div>
                </div>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-bold">18 online</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🔥 Tendencias hoy</h3>
            <div className="space-y-2 text-sm">
              <a href="#" className="block font-medium text-slate-300 hover:text-indigo-400 transition-colors">#RelatosCortos</a>
              <a href="#" className="block font-medium text-slate-300 hover:text-indigo-400 transition-colors">#Cyberpunk2026</a>
              <a href="#" className="block font-medium text-slate-300 hover:text-indigo-400 transition-colors">#Audiolibros</a>
            </div>
          </div>
        </aside>

      </div>

      {/* REPRODUCTOR PERSISTENTE */}
      <Player 
        track={currentTrack} 
        isPlaying={isPlaying} 
        setIsPlaying={setIsPlaying} 
      />
    </div>
  );
}
