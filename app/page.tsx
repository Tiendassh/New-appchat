'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Send,
  RefreshCw,
  Users,
  Lock,
  Music,
  Film,
  Cpu,
  Compass,
  X,
  Check,
  Volume2,
  VolumeX,
  Tv,
  Camera,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ScreenShare,
  Heart,
  CreditCard,
  Share2
} from 'lucide-react';
import { User, ChatMessage, SignalingQueueItem, RoomInfo, DebateTopic, ConfessionStory } from '@/lib/types';
import { STATIC_ROOMS } from '@/lib/chatStore';

// Generate a client-side temporary user ID
const generateUniqueId = () => {
  return 'user_' + Math.random().toString(36).substring(2, 11);
};

// Name lists for fun random anonymous names
const adjectives = [
  'Lobo', 'Eco', 'Neón', 'Sombra', 'Susurro', 'Rayo', 'Fuego', 'Fénix', 
  'Glaciar', 'Zorro', 'Vórtice', 'Espectro', 'Aura', 'Átomo', 'Siberiano', 
  'Cósmico', 'Cápsula', 'Halcón', 'Pantera', 'Abismo', 'Eclipse', 'Delta'
];

const nouns = [
  'Estelar', 'Místico', 'Furtivo', 'Cíborg', 'Galáctico', 'Cuántico', 
  'Radiante', 'Sigiloso', 'Veloz', 'Abisal', 'Eterno', 'Astral', 
  'Fluorescente', 'Luminoso', 'Sónico', 'Virtual', 'Magnético', 'Solar'
];

const getRandomName = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}_${noun}_${num}`;
};

const avatarColors = [
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#eab308', // Yellow
  '#ff4500', // Orange-red
];

// Helper to render static icon representing rooms
const getRoomIcon = (iconName: string) => {
  switch (iconName) {
    case 'Lock': return <Lock className="w-5 h-5 text-indigo-400" />;
    case 'Music': return <Music className="w-5 h-5 text-indigo-400" />;
    case 'Film': return <Film className="w-5 h-5 text-indigo-400" />;
    case 'Cpu': return <Cpu className="w-5 h-5 text-indigo-400" />;
    default: return <MessageSquare className="w-5 h-5 text-indigo-400" />;
  }
};

const getGenderLabel = (g?: string) => {
  if (!g) return '';
  switch (g) {
    case 'male': return 'Hombre ♂';
    case 'female': return 'Mujer ♀';
    case 'couple': return 'Pareja ⚤';
    case 'nonbinary': return 'No Binario ⚨';
    default: return 'Anónimo';
  }
};

export default function AnonymousChatApp() {
  const [mounted, setMounted] = useState<boolean>(false);

  // Session / Profile State
  const [userId, setUserId] = useState<string>('');
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<string>('unspecified');
  const [age, setAge] = useState<string>('18');
  const [color, setColor] = useState<string>('');
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<string>('unspecified');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCVC, setCardCVC] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setUserId('user_' + Math.random().toString(36).substring(2, 11));
      setName(getRandomName());
      setColor(avatarColors[Math.floor(Math.random() * avatarColors.length)]);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Layout & Lobby States
  const [currentRoom, setCurrentRoom] = useState<string | null>('general');
  const [isSearchingRandom, setIsSearchingRandom] = useState<boolean>(false);
  const [lobbyStats, setLobbyStats] = useState({ totalOnline: 1, searchingRandomCount: 0 });
  const [rooms, setRooms] = useState<(RoomInfo & { activeUsers: number })[]>([]);
  const [roomUsers, setRoomUsers] = useState<Partial<User>[]>([]);
  const [coverTab, setCoverTab] = useState<'chat' | 'debates' | 'photos' | 'match' | 'shows' | 'relatos'>('chat');

  // Girlfriend configuration state
  const [girlfriendConfig, setGirlfriendConfig] = useState<{
    name: string;
    personality: string;
    avatarStyle: string;
    avatarUrl: string;
    mood: string;
  } | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState<boolean>(false);
  const [gfEditingName, setGfEditingName] = useState<string>('Sofía');
  const [gfEditingPersonality, setGfEditingPersonality] = useState<string>('cariñosa');
  const [gfEditingStyle, setGfEditingStyle] = useState<string>('anime');
  const [showGfConfigModal, setShowGfConfigModal] = useState<boolean>(false);

  // Copy Link helper function
  const handleCopyRoomLink = (roomId: string, roomName?: string) => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCallRejectedNotification(`¡Enlace de la sala ${roomName ? `"${roomName}" ` : ''}copiado! 🔗`);
    setTimeout(() => setCallRejectedNotification(null), 3500);
  };

  // URL parser effect to auto-join rooms shared by link (with state safety)
  useEffect(() => {
    if (mounted && userId) {
      const searchParams = new URLSearchParams(window.location.search);
      const urlRoom = searchParams.get('room');
      if (urlRoom) {
        const timer = setTimeout(() => {
          setCurrentRoom(urlRoom);
          if (!name.trim() || name === 'Espectador') {
            setName(getRandomName());
          }
          setAgeConfirmed(true);
          setHasEntered(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, userId, name]);

  const fetchGirlfriendConfig = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      const response = await fetch('/api/girlfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, action: 'get-config' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setGirlfriendConfig(data.config);
          setGfEditingName(data.config.name);
          setGfEditingPersonality(data.config.personality);
          setGfEditingStyle(data.config.avatarStyle);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch girlfriend config', error);
    }
  }, []);

  const handleSaveGirlfriendConfig = async () => {
    if (!userId) return;
    try {
      const response = await fetch('/api/girlfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'save-config',
          config: {
            name: gfEditingName,
            personality: gfEditingPersonality,
            avatarStyle: gfEditingStyle,
          }
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setGirlfriendConfig(data.config);
          setCallRejectedNotification(`¡Personalización de ${data.config.name} guardada correctamente! 💕`);
          setTimeout(() => setCallRejectedNotification(null), 3000);
        }
      }
    } catch (err) {
      console.error('Error saving girlfriend config', err);
    }
  };

  const handleGenerateGfAvatar = async () => {
    if (!userId) return;
    setIsGeneratingAvatar(true);
    try {
      await fetch('/api/girlfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'save-config',
          config: {
            name: gfEditingName,
            personality: gfEditingPersonality,
            avatarStyle: gfEditingStyle,
          }
        }),
      });

      const response = await fetch('/api/girlfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'generate-avatar'
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.avatarUrl) {
          setGirlfriendConfig(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
          setCallRejectedNotification(`¡Nueva foto de perfil generada con éxito para ${gfEditingName}! ✨🎨`);
          setTimeout(() => setCallRejectedNotification(null), 3000);
        } else {
          throw new Error(data.error || 'No avatar returned');
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Server error');
      }
    } catch (err: any) {
      console.error('Error generating avatar:', err);
      alert(err.message || 'Error al generar la imagen de perfil.');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  useEffect(() => {
    if (hasEntered && userId) {
      const timer = setTimeout(() => {
        fetchGirlfriendConfig(userId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasEntered, userId, fetchGirlfriendConfig]);

  // Debate Forums States (Moved up to prevent early access)
  const [debates, setDebates] = useState<DebateTopic[]>([]);
  const [newDebateTitle, setNewDebateTitle] = useState<string>('');
  const [newDebateDesc, setNewDebateDesc] = useState<string>('');
  const [newDebateCat, setNewDebateCat] = useState<string>('Tecnología');
  const [showDebateForm, setShowDebateForm] = useState<boolean>(false);

  // Stories & Confessions States
  const [stories, setStories] = useState<ConfessionStory[]>([]);
  const [newStoryTitle, setNewStoryTitle] = useState<string>('');
  const [newStoryContent, setNewStoryContent] = useState<string>('');
  const [newStoryCat, setNewStoryCat] = useState<string>('Secreto');
  const [showStoryForm, setShowStoryForm] = useState<boolean>(false);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState<string>('');

  // Load initial lobby stats & debates for the landing page before login
  useEffect(() => {
    if (!mounted || !userId || hasEntered) return;
    
    let active = true;
    const fetchInitialData = async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            name: 'Espectador',
            color: '#ffffff',
            currentRoom: null,
            isSearchingRandom: false,
          })
        });
        if (response.ok && active) {
          const data = await response.json();
          if (data.stats) setLobbyStats(data.stats);
          if (data.rooms) setRooms(data.rooms);
          if (data.debates) setDebates(data.debates);
          if (data.stories) setStories(data.stories);
        }
      } catch (err) {
        console.warn('Failed to fetch initial cover data:', err);
      }
    };
    
    fetchInitialData();
    const interval = setInterval(fetchInitialData, 10000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [mounted, userId, hasEntered]);

  // Text Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'rooms' | 'debates' | 'users'>('rooms');

  // Audio Recording States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordingInterval, setRecordingInterval] = useState<any>(null);

  // Sounds Notifications State & Refs
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  const roomUsersRef = useRef<Partial<User>[]>([]);
  const soundsEnabledRef = useRef<boolean>(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    roomUsersRef.current = roomUsers;
  }, [roomUsers]);

  useEffect(() => {
    soundsEnabledRef.current = soundsEnabled;
  }, [soundsEnabled]);



  // Play sound notifications using Web Audio API
  const playNotificationSound = (type: 'message' | 'join') => {
    if (!soundsEnabledRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === 'message') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'join') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        gain1.gain.setValueAtTime(0.06, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08);
        gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start();
        osc1.stop(ctx.currentTime + 0.12);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }
    } catch (err) {
      console.warn('Audio play failed or blocked:', err);
    }
  };

  // Play sweet UI feedback sounds
  const playInteractionMode = (type: 'color' | 'click' | 'randomize' | 'select', optionIndex?: number) => {
    if (!soundsEnabledRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      if (type === 'color') {
        const frequencies = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        const freq = frequencies[optionIndex ?? 0] ?? 329.63;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'randomize') {
        const notes = [293.66, 392.00, 587.33];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
          gain.gain.setValueAtTime(0.03, ctx.currentTime + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.05);
          osc.stop(ctx.currentTime + i * 0.05 + 0.08);
        });
      } else if (type === 'select') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (err) {
      console.warn('UI Audio synthesis blocked:', err);
    }
  };

  // Direct access to specific room or debate from landing/cover page
  const handleDirectRoomAccess = (roomId: string) => {
    // Set the target room or debate
    setCurrentRoom(roomId);

    // Auto-fill random name if empty or default spectator name
    let activeName = name.trim();
    if (!activeName || activeName === 'Espectador') {
      const generated = getRandomName();
      setName(generated);
    }

    // Ensure age confirmation is checked
    setAgeConfirmed(true);

    // Instantly enter the chat!
    setHasEntered(true);
    playInteractionMode('click');
  };
  
  // WebRTC & Call States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<{ id: string; name: string; color?: string; age?: string; gender?: string } | null>(null);
  const [activeCall, setActiveCall] = useState<boolean>(false);
  const [isCaller, setIsCaller] = useState<boolean>(false);
  
  // Call Controls
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [incomingCallRequest, setIncomingCallRequest] = useState<{ fromId: string; fromName: string } | null>(null);
  const [callRejectedNotification, setCallRejectedNotification] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);

  // Call Text Chat Overlay
  const [callMessages, setCallMessages] = useState<{ sender: string; color: string; text: string }[]>([]);
  const [callMessageInput, setCallMessageInput] = useState<string>('');

  // Refs for tracking connections & video rendering
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const outgoingSignalsRef = useRef<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- WEBRTC CORE FUNCTIONS (Declared first to avoid early access errors) ---

  const stopAllMedia = React.useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, [localStream]);

  // Trigger matchmaking
  const startRandomMatch = () => {
    stopAllMedia();
    setPeer(null);
    setActiveCall(false);
    setIsSearchingRandom(true);
    setCurrentRoom(null);
  };

  // Stop matchmaking
  const cancelRandomMatch = React.useCallback(() => {
    setIsSearchingRandom(false);
    setCurrentRoom('general');
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'leave-random',
        isSearchingRandom: false,
        currentRoom: 'general'
      })
    }).catch(err => console.warn('Cancel match endpoint error gracefully', err));
  }, [userId]);

  // Trigger a simulated virtual match for Premium users after 5 seconds if no peer is matched yet
  useEffect(() => {
    if (!isSearchingRandom || !isPremium) return;

    const timer = setTimeout(() => {
      // Create a simulated premium peer
      const premiumNames = [
        'Sofía_VIP', 'Álex_Premium', 'Elena_Zafiro', 'Mateo_Espectro', 'Luna_Radiante', 
        'Carlos_Vórtice', 'Valeria_Estelar', 'Gabriel_Cuántico', 'Daphne_Aura', 'Hugo_Sónico'
      ];
      const virtualName = premiumNames[Math.floor(Math.random() * premiumNames.length)] + '_' + Math.floor(100 + Math.random() * 900);
      const virtualGender = gender === 'male' ? 'female' : gender === 'female' ? 'male' : ['male', 'female', 'couple', 'nonbinary'][Math.floor(Math.random() * 4)];
      
      const virtualPeer = {
        id: 'virtual_peer_' + Math.random().toString(36).substring(2, 9),
        name: virtualName,
        color: avatarColors[Math.floor(Math.random() * avatarColors.length)],
        gender: virtualGender,
        age: String(18 + Math.floor(Math.random() * 15))
      };

      // Set matched state locally
      stopAllMedia();
      setPeer(virtualPeer);
      setIsCaller(true);
      setActiveCall(true);
      setIsSearchingRandom(false);

      // Add welcome message from virtual peer
      setCallMessages([
        {
          sender: virtualPeer.name,
          color: virtualPeer.color,
          text: `¡Hola! Soy ${virtualPeer.name} de la red Premium. ¿Cómo estás hoy? ✨`
        }
      ]);

    }, 5000); // 5 seconds of scanning, then match with VIP host!

    return () => clearTimeout(timer);
  }, [isSearchingRandom, isPremium, gender]);

  // Turn local camera/mic on and retrieve stream
  const getMediaStream = async (retryAudioOnly = false): Promise<MediaStream | null> => {
    try {
      setCameraError(null);
      const constraints = retryAudioOnly 
        ? { audio: true, video: false }
        : { audio: true, video: { width: 640, height: 480, facingMode: 'user' } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setVideoEnabled(!retryAudioOnly);
      setAudioEnabled(true);

      // If we are currently screen sharing, let's create a combined stream with the screen sharing track instead!
      if (isScreenSharing && screenStreamRef.current) {
        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (screenTrack) {
          const tracks = [screenTrack];
          if (audioTrack) tracks.push(audioTrack);
          const combinedStream = new MediaStream(tracks);
          setLocalStream(combinedStream);
          return combinedStream;
        }
      }

      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn("Camera media retrieval failed, attempting audio-only fallback:", err);
      if (!retryAudioOnly) {
        return getMediaStream(true);
      }
      setCameraError("No se pudo acceder a la cámara ni al micrófono. Asegúrate de otorgar permisos.");
      return null;
    }
  };

  // Handle HTML media streaming attachment when state changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall]);

  // Scroll to bottom helper for public chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up WebRTC resources on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
      if (userId) {
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, action: 'disconnect' }),
          keepalive: true,
        }).catch(err => console.error('Disconnect failed', err));
      }
    };
  }, [userId, stopAllMedia]);

  // Initialize a new RTCPeerConnection and bind callbacks
  const createPeerConnection = (targetPeerId: string, currentLocalStream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    // Attach local stream tracks to WebRTC connection
    currentLocalStream.getTracks().forEach(track => {
      pc.addTrack(track, currentLocalStream);
    });

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      console.log('WebRTC: Remote track received', event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Gather and send ICE Candidates to target peer via server signaling queue
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('WebRTC: Generated ICE candidate');
        outgoingSignalsRef.current.push({
          from: userId,
          to: targetPeerId,
          type: 'candidate',
          payload: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC: Connection state updated to', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleHangup(false);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Trigger outbound call signaling
  const initiateCall = async (targetId: string, targetName: string) => {
    const stream = await getMediaStream();
    if (!stream) return;

    setPeer({ id: targetId, name: targetName });
    setIsCaller(true);
    setActiveCall(true);
    setIsSearchingRandom(false);

    // Create RTCPeerConnection
    const pc = createPeerConnection(targetId, stream);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Dispatch Offer signal
      outgoingSignalsRef.current.push({
        from: userId,
        to: targetId,
        type: 'offer',
        payload: offer
      });
      console.log('WebRTC: Offer initialized and sent to', targetId);
    } catch (e) {
      console.error('WebRTC: Failed to initiate call offer', e);
    }
  };

  // Answer an incoming call request
  const acceptIncomingCall = async (callerId: string, callerName: string, offerSdp: any) => {
    setIncomingCallRequest(null);
    const stream = await getMediaStream();
    if (!stream) {
      // Reject if we fail to get media
      outgoingSignalsRef.current.push({
        from: userId,
        to: callerId,
        type: 'hangup',
        payload: { reason: 'media-access-denied' }
      });
      return;
    }

    setPeer({ id: callerId, name: callerName });
    setIsCaller(false);
    setActiveCall(true);
    setIsSearchingRandom(false);

    const pc = createPeerConnection(callerId, stream);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Dispatch Answer signal
      outgoingSignalsRef.current.push({
        from: userId,
        to: callerId,
        type: 'answer',
        payload: answer
      });
      console.log('WebRTC: Answer created and dispatched');
    } catch (e) {
      console.error('WebRTC: Failed to accept call offer', e);
    }
  };

  // Toggle local Audio track
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle local Video track
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Screen Sharing Functions
  const startScreenShare = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("La compartición de pantalla no está soportada en este navegador.");
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];

      // Replace local video preview with screen sharing stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Replace video track in the active WebRTC peer connection
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      // Revert to camera stream when the user stops sharing via the native browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Error al iniciar compartición de pantalla:", err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    // Restore local camera video track preview
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      const cameraTrack = localStream.getVideoTracks()[0];
      
      // Replace video track in active WebRTC peer connection
      if (peerConnectionRef.current && cameraTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleChatScreenShare = async () => {
    if (activeCall) {
      toggleScreenShare();
    } else {
      if (isScreenSharing) {
        await stopScreenShare();
        setCallRejectedNotification("Compartición de pantalla desactivada.");
        setTimeout(() => setCallRejectedNotification(null), 3500);
      } else {
        await startScreenShare();
        setCallRejectedNotification("¡Pantalla compartida! Llama a un usuario o inicia un Match 1-a-1.");
        setTimeout(() => setCallRejectedNotification(null), 5000);
      }
    }
  };

  // Hangup active session
  const handleHangup = (notifyPeer = true) => {
    console.log('WebRTC: Hanging up call');
    if (notifyPeer && peer) {
      outgoingSignalsRef.current.push({
        from: userId,
        to: peer.id,
        type: 'hangup',
        payload: { reason: 'user-hungup' }
      });
    }

    stopAllMedia();
    setPeer(null);
    setActiveCall(false);
    setCallMessages([]);
    setIsSearchingRandom(false);
  };

  // --- MAIN POLL LOOP FOR HEARTBEAT & SIGNALING ---

  useEffect(() => {
    if (!hasEntered || !userId) return;

    let isPolling = true;
    let pendingMessage: string | null = null;

    const poll = async () => {
      if (!isPolling) return;

      const signalsToSend = [...outgoingSignalsRef.current];
      outgoingSignalsRef.current = []; // Reset queue

      const msgToSend = pendingMessage;
      pendingMessage = null; // Clear trigger

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            name,
            color,
            gender,
            age,
            orientation,
            isPremium,
            currentRoom: isSearchingRandom ? null : currentRoom,
            isSearchingRandom,
            sendMessage: msgToSend || undefined,
            outgoingSignals: signalsToSend
          })
        });

        if (!response.ok) throw new Error('API request failed');
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Lobby polling: Received non-JSON response from server, retrying...');
          if (isPolling) {
            setTimeout(poll, 1500);
          }
          return;
        }

        const data = await response.json();

        if (!isPolling) return;

        // Check for sexual orientation matchmaking barriers (if no free compatible matches exist)
        if (data.noCompatibleMatchesLeft && isSearchingRandom && !isPremium) {
          cancelRandomMatch();
          setShowPremiumModal(true);
          return;
        }

        // Sync system metrics
        if (data.stats) {
          setLobbyStats(data.stats);
        }
        if (data.rooms) {
          setRooms(data.rooms);
        }
        if (data.roomUsers) {
          const newUsers = data.roomUsers as Partial<User>[];
          const oldUsers = roomUsersRef.current;
          if (mounted && hasEntered && oldUsers.length > 0 && newUsers.length > 0) {
            const oldUserIds = new Set(oldUsers.map(u => u.id).filter(Boolean));
            const newlyJoined = newUsers.some(u => u.id && u.id !== userId && !oldUserIds.has(u.id));
            if (newlyJoined) {
              playNotificationSound('join');
            }
          }
          setRoomUsers(newUsers);
        }
        if (data.messages && !isSearchingRandom) {
          const newMsgs = data.messages as ChatMessage[];
          const oldMsgs = messagesRef.current;
          if (mounted && hasEntered && oldMsgs.length > 0 && newMsgs.length > 0) {
            const lastNew = newMsgs[newMsgs.length - 1];
            const lastOld = oldMsgs[oldMsgs.length - 1];
            if (lastNew && lastOld && lastNew.id !== lastOld.id) {
              if (lastNew.senderId !== userId) {
                playNotificationSound('message');
              }
            }
          }
          setMessages(newMsgs);
        }
        if (data.debates) {
          setDebates(data.debates);
        }
        if (data.stories) {
          setStories(data.stories);
        }

        // Process incoming signaling array
        if (data.signals && data.signals.length > 0) {
          for (const sig of data.signals) {
            console.log('Signaling received:', sig.type, sig);

            switch (sig.type) {
              case 'matched':
                // Random chat matched event
                console.log('Signaling: Match confirmed with', sig.payload.peer.name);
                const matchedPeer = sig.payload.peer;
                const matchCaller = sig.payload.isCaller;

                // Stop any other media first
                stopAllMedia();

                // Instantly notify local UI state
                setPeer(matchedPeer);
                setIsCaller(matchCaller);
                setActiveCall(true);
                setIsSearchingRandom(false);

                // Initialize camera stream and trigger RTC connection
                const matchStream = await getMediaStream();
                if (matchStream) {
                  const pc = createPeerConnection(matchedPeer.id, matchStream);
                  if (matchCaller) {
                    try {
                      const offer = await pc.createOffer();
                      await pc.setLocalDescription(offer);
                      outgoingSignalsRef.current.push({
                        from: userId,
                        to: matchedPeer.id,
                        type: 'offer',
                        payload: offer
                      });
                    } catch (err) {
                      console.error('WebRTC: Failed to initiate random match offer', err);
                    }
                  }
                }
                break;

              case 'offer':
                // Incoming WebRTC Offer
                await acceptIncomingCall(sig.from, sig.fromName, sig.payload);
                break;

              case 'answer':
                // WebRTC Answer
                if (peerConnectionRef.current) {
                  await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sig.payload));
                  console.log('WebRTC: Remote description set from Answer');
                }
                break;

              case 'candidate':
                // ICE Candidate
                if (peerConnectionRef.current) {
                  try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(sig.payload));
                    console.log('WebRTC: Added ICE Candidate');
                  } catch (e) {
                    console.error('WebRTC: Candidate attachment error', e);
                  }
                }
                break;

              case 'hangup':
                // Remote Hung Up
                console.log('Signaling: Remote user terminated connection');
                handleHangup(false);
                if (sig.payload?.reason === 'media-access-denied') {
                  setCallRejectedNotification("La llamada finalizó porque el par no tiene acceso a cámara/micrófono.");
                } else {
                  setCallRejectedNotification(`${sig.fromName} abandonó la llamada.`);
                }
                setTimeout(() => setCallRejectedNotification(null), 4000);
                break;

              case 'call-request':
                // Invite to direct call in room
                if (activeCall) {
                  // Auto-reject if already busy in call
                  outgoingSignalsRef.current.push({
                    from: userId,
                    to: sig.from,
                    type: 'call-response',
                    payload: { accepted: false, reason: 'busy' }
                  });
                } else {
                  setIncomingCallRequest({ fromId: sig.from, fromName: sig.fromName });
                }
                break;

              case 'call-response':
                // direct call invitation response
                if (sig.payload.accepted) {
                  // If accepted, initiate WebRTC offer immediately
                  initiateCall(sig.from, sig.fromName);
                } else {
                  setCallRejectedNotification(`${sig.fromName} rechazó tu llamada.`);
                  setTimeout(() => setCallRejectedNotification(null), 4000);
                }
                break;
            }
          }
        }

      } catch (err: any) {
        // Log network failures gracefully, as they are expected during HMR/server reloads
        const isTransient = err instanceof TypeError || 
          (err.message && (
            err.message.includes('Failed to fetch') || 
            err.message.includes('JSON') || 
            err.message.includes('Unexpected token') ||
            err.message.includes('is not valid JSON')
          ));
        if (isTransient) {
          console.warn('Lobby polling: Conexión temporalmente no disponible o recargando...', err.message);
        } else {
          console.error('Lobby polling error:', err);
        }
      }

      // Schedule next poll interval (1500ms) only if we are still active
      if (isPolling) {
        setTimeout(poll, 1500);
      }
    };

    // Begin loop
    poll();

    return () => {
      isPolling = false;
    };
  }, [hasEntered, currentRoom, isSearchingRandom]);

  // Handle direct text message dispatch to room
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const textToSend = messageInput.trim();
    setMessageInput('');

    // Send on the next poll cycle instantly
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentRoom,
        sendMessage: textToSend,
        isSearchingRandom: false
      })
    })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Immediate dispatch non-JSON or error response');
    })
    .then(data => {
      if (data.messages) setMessages(data.messages);
    })
    .catch(err => console.warn('Immediate dispatch failed gracefully', err));
  };

  // Dispatch recorded voice note as Base64 to room
  const handleSendAudioMessage = (base64Audio: string) => {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentRoom,
        sendAudioMessage: base64Audio,
        isSearchingRandom: false
      })
    })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Audio note dispatch non-JSON or error response');
    })
    .then(data => {
      if (data.messages) setMessages(data.messages);
    })
    .catch(err => console.warn('Audio note dispatch failed gracefully', err));
  };

  // Create a new Debate Topic
  const handleCreateDebate = (title: string, description: string, category: string) => {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentRoom,
        createDebate: { title, description, category },
        isSearchingRandom: false
      })
    })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Create debate non-JSON or error response');
    })
    .then(data => {
      if (data.debates) setDebates(data.debates);
      // Let's find the new debate we just created to enter it
      const createdDebate = data.debates?.find((d: any) => d.creatorId === userId);
      if (createdDebate) {
        joinRoom(createdDebate.id);
      }
    })
    .catch(err => console.warn('Create debate failed gracefully', err));
  };

  // Upvote or retract vote on a debate topic
  const handleVoteDebate = (debateId: string) => {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentRoom,
        voteDebateId: debateId,
        isSearchingRandom: false
      })
    })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Vote non-JSON or error response');
    })
    .then(data => {
      if (data.debates) setDebates(data.debates);
    })
    .catch(err => console.warn('Vote action failed gracefully', err));
  };

  // Create a new Story / Confession
  const handleCreateStory = (title: string, content: string, category: string) => {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentRoom,
        createStory: { title, content, category },
        isSearchingRandom: false
      })
    })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Create story non-JSON or error response');
    })
    .then(data => {
      if (data.stories) setStories(data.stories);
      // Reset inputs
      setNewStoryTitle('');
      setNewStoryContent('');
      setNewStoryCat('Secreto');
      setShowStoryForm(false);
    })
    .catch(err => console.warn('Create story failed gracefully', err));
  };

  // Upvote or retract vote on a story
  const handleVoteStory = (storyId: string) => {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentRoom,
        voteStoryId: storyId,
        isSearchingRandom: false
      })
    })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Vote story non-JSON or error response');
    })
    .then(data => {
      if (data.stories) setStories(data.stories);
    })
    .catch(err => console.warn('Vote story failed gracefully', err));
  };

  // Add a comment to a story
  const handleCommentStory = (storyId: string, content: string) => {
    if (!content.trim()) return;
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentRoom,
        commentStory: { storyId, content },
        isSearchingRandom: false
      })
    })
    .then(res => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Comment story non-JSON or error response');
    })
    .then(data => {
      if (data.stories) setStories(data.stories);
      setNewCommentContent('');
    })
    .catch(err => console.warn('Comment story failed gracefully', err));
  };

  // Browser MediaRecorder voice capture start
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('UserMedia API not supported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          if (base64Data && base64Data.startsWith('data:audio/')) {
            handleSendAudioMessage(base64Data);
          }
        };
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      const interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);

    } catch (err: any) {
      console.error("Recording error:", err);
      setCallRejectedNotification("Permiso de micrófono denegado para grabar audio.");
      setTimeout(() => setCallRejectedNotification(null), 4000);
    }
  };

  // Stop current voice recording and decide whether to send or discard
  const stopRecording = (cancel = false) => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      if (cancel) {
        recorder.onstop = () => {
          // Discard tracks on close
          recorder.stream.getTracks().forEach(track => track.stop());
        };
      }
      recorder.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Direct room-to-room navigation
  const joinRoom = (roomId: string) => {
    setIsSearchingRandom(false);
    setCurrentRoom(roomId);
    setMessages([]);
  };

  // Handle room user Direct Call Invite
  const requestDirectCall = (targetId: string, targetName: string) => {
    if (targetId === userId) return;
    setCallRejectedNotification(`Llamando a ${targetName}...`);
    outgoingSignalsRef.current.push({
      from: userId,
      fromName: name,
      to: targetId,
      type: 'call-request',
      payload: {}
    });
  };

  // Format timestamp helper
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Render loading screen if client-side hydration hasn't completed yet
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-mono">Iniciando Anonymous Chat...</p>
        </div>
      </div>
    );
  }

  // Render Login Layout
  const isFormComplete = !!(name.trim() && age.trim() && parseInt(age, 10) >= 18 && ageConfirmed);

  if (!hasEntered) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden" id="login-screen">
        {/* Animated CSS Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {Array.from({ length: 25 }).map((_, idx) => {
            const left = `${(idx * 7) % 100}%`;
            const size = `${3 + (idx * 5) % 8}px`;
            const duration = `${12 + (idx * 8) % 20}s`;
            const delay = `${-((idx * 11) % 20)}s`;
            const xDrift = `${-40 + (idx * 13) % 90}px`;
            const maxOpacity = (0.15 + (idx * 0.05) % 0.4).toFixed(2);
            const isRose = idx % 2 === 0;
            const bgClass = isRose 
              ? "bg-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.4)]" 
              : "bg-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.4)]";

            return (
              <div
                key={idx}
                className={`login-particle rounded-full ${bgClass}`}
                style={{
                  '--left': left,
                  '--size': size,
                  '--duration': duration,
                  '--delay': delay,
                  '--x-drift': xDrift,
                  '--max-opacity': maxOpacity,
                } as React.CSSProperties}
              />
            );
          })}
        </div>

        {/* Background Glowing Decors */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 bg-slate-900/40 backdrop-blur-cyber border border-slate-800/80 p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
        >
          {/* Left panel: Form */}
          <div className="md:col-span-7 space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-500/10 to-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-pink-500 to-indigo-400 bg-clip-text text-transparent">
                    Incognito Chat
                  </h2>
                  <p className="text-xs text-slate-400">
                    Salas de Voz, Video y Chat 100% Anónimo
                  </p>
                </div>
              </div>

              {/* Portal Info Deck */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-slate-950/35 border border-slate-850 rounded-xl space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                    <Compass className="w-3.5 h-3.5" />
                    <span>⚡ Acceso a Salas</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Ingresa instantáneamente a canales temáticos (Lobby, Confesiones o Código). Presiona &apos;Entrar&apos; en cualquier sala del panel derecho.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/35 border border-slate-850 rounded-xl space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🔥 Debates Activos</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Lee las discusiones más votadas de la comunidad en la portada. Opina, vota y crea debates una vez que hayas ingresado.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/35 border border-slate-850 rounded-xl space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>🖼️ Identidades y Fotos</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Usa &apos;Fotos ID&apos; para clonar identidades pre-diseñadas (Sirena, Cazador, Gato) de inmediato y comenzar a chatear con un solo clic.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/35 border border-slate-850 rounded-xl space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>🔒 Privacidad Total</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Las conexiones de voz y video son directas (P2P). Tu alias es temporal y el historial se destruye al cerrar la pestaña.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Tu Alias Anónimo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={25}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      playInteractionMode('select');
                    }}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-2.5 px-4 pr-12 text-slate-100 font-medium placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all text-sm"
                    placeholder="Ej. Lobo_Cósmico"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setName(getRandomName());
                      playInteractionMode('randomize');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-all p-1.5 hover:scale-110 active:scale-95 cursor-pointer"
                    title="Generar otro alias"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Custom Avatar Color Accent */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Color de tu Holograma
                </label>
                <div className="flex gap-2.5 justify-start">
                  {avatarColors.map((c, idx) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        playInteractionMode('color', idx);
                      }}
                      className="w-7 h-7 rounded-full border border-white/10 transition-all duration-200 cursor-pointer relative hover:scale-115 active:scale-90"
                      style={{ 
                        backgroundColor: c, 
                        boxShadow: color === c ? `0 0 12px ${c}` : 'none',
                        borderColor: color === c ? '#ffffff' : 'transparent',
                        transform: color === c ? 'scale(1.15)' : 'scale(1)'
                      }}
                    >
                      {color === c && (
                        <Check className="w-3.5 h-3.5 text-slate-950 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 stroke-[4]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sex / Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Género
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value);
                      playInteractionMode('select');
                    }}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-2.5 px-3 text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs cursor-pointer"
                  >
                    <option value="unspecified">Prefiero ocultar ░</option>
                    <option value="male">Hombre ♂</option>
                    <option value="female">Mujer ♀</option>
                    <option value="couple">Pareja ⚤</option>
                    <option value="nonbinary">No Binario ⚨</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Edad
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      playInteractionMode('select');
                    }}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-2.5 px-3 text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs"
                  />
                </div>
              </div>

              {/* Sexual Orientation */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Orientación Sexual
                </label>
                <select
                  value={orientation}
                  onChange={(e) => {
                    setOrientation(e.target.value);
                    playInteractionMode('select');
                  }}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-2.5 px-3 text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs cursor-pointer"
                >
                  <option value="unspecified">Cualquiera / Sin especificar ░</option>
                  <option value="heterosexual">Heterosexual ⚧</option>
                  <option value="homosexual">Homosexual (Gay/Lesbiana) 🌈</option>
                  <option value="bisexual">Bisexual ⚤</option>
                  <option value="pansexual">Pansexual ♾️</option>
                </select>
              </div>

              {/* Age disclaimer verification */}
              <div className="flex items-start gap-2.5 pt-1.5">
                <input
                  type="checkbox"
                  id="age-check"
                  checked={ageConfirmed}
                  onChange={(e) => {
                    setAgeConfirmed(e.target.checked);
                    playInteractionMode('select');
                  }}
                  className="w-4 h-4 mt-0.5 accent-rose-500 rounded border-slate-800 bg-slate-950 text-rose-500 focus:ring-offset-slate-900 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="age-check" className="text-[10px] text-slate-400 leading-normal cursor-pointer select-none">
                  Confirmo que soy <span className="text-rose-400 font-bold">mayor de 18 años (+18)</span> y acepto mantener interacciones respetuosas.
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={!ageConfirmed || !name.trim()}
              onClick={() => {
                playInteractionMode('click');
                setHasEntered(true);
              }}
              className="w-full mt-4 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-2xl cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase text-xs tracking-widest"
            >
              Iniciar Chat Incógnito
            </button>
          </div>

          {/* Right panel: Active Portal Content (Tabs for Chat, Debates, Photos) */}
          <div className="md:col-span-5 bg-slate-950/50 border border-slate-800/80 rounded-[1.75rem] p-5 flex flex-col justify-between relative overflow-hidden min-h-[460px] md:min-h-full">
            {/* Hologram Projector Effect Details */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent animate-pulse" />
            
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.2)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-30" />

            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent bg-[size:100%_4px] pointer-events-none animate-scanline" />

            {/* Tabs Selector Header */}
            <div className="w-full z-10 flex border-b border-slate-900/80 p-0.5 bg-slate-900/30 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setCoverTab('chat');
                  playInteractionMode('select');
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  coverTab === 'chat'
                    ? 'bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoverTab('debates');
                  playInteractionMode('select');
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  coverTab === 'debates'
                    ? 'bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🔥 Debates
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoverTab('photos');
                  playInteractionMode('select');
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  coverTab === 'photos'
                    ? 'bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🖼️ Fotos ID
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoverTab('match');
                  playInteractionMode('select');
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  coverTab === 'match'
                    ? 'bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-indigo-500/20 text-emerald-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🎯 Match
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoverTab('shows');
                  playInteractionMode('select');
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  coverTab === 'shows'
                    ? 'bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-indigo-500/20 text-fuchsia-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                ✨ Shows
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoverTab('relatos');
                  playInteractionMode('select');
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
                  coverTab === 'relatos'
                    ? 'bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-indigo-500/20 text-pink-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🔒 Relatos
              </button>
            </div>

            {/* Main Tabs Content */}
            <div className="flex-1 w-full flex flex-col justify-between z-10">
              
              {/* TAB 1: CHAT & DIRECT DIRECTORY */}
              {coverTab === 'chat' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase">SALA GLOBAL & CANALES</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                        <span>{lobbyStats.totalOnline} ONLINE</span>
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {rooms.length > 0 ? (
                        rooms.map((r) => (
                          <div 
                            key={r.id} 
                            className="p-2.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-950/80 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2 max-w-[65%]">
                              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                                {getRoomIcon(r.icon)}
                              </div>
                              <div className="truncate">
                                <h4 className="text-xs font-bold text-slate-300">{r.name}</h4>
                                <p className="text-[9px] text-slate-500 truncate">{r.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md font-bold">
                                {r.activeUsers} act.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyRoomLink(r.id, r.name)}
                                className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-900/80 rounded transition-all cursor-pointer"
                                title="Copiar enlace"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDirectRoomAccess(r.id)}
                                className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md shadow-indigo-500/10 hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                Entrar
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-2">
                          {STATIC_ROOMS.map((r) => (
                            <div 
                              key={r.id}
                              className="p-2.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-950/85 hover:border-slate-800 transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-2 max-w-[65%]">
                                <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                                  {getRoomIcon(r.icon)}
                                </div>
                                <div className="truncate flex-1">
                                  <h4 className="text-xs font-bold text-slate-300">{r.name}</h4>
                                  <p className="text-[9px] text-slate-500 truncate">{r.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md font-bold">
                                  0 act.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyRoomLink(r.id, r.name)}
                                  className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-900/80 rounded transition-all cursor-pointer"
                                  title="Copiar enlace"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDirectRoomAccess(r.id)}
                                  className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md shadow-indigo-500/10 hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  Entrar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simulated telemetry ticker logs */}
                  <div className="p-3 rounded-xl border border-slate-900/60 bg-slate-950/80 space-y-1.5 font-mono text-[9px] leading-relaxed">
                    <div className="text-slate-500 uppercase tracking-widest text-[8px] font-bold border-b border-slate-900 pb-1 mb-1">REGISTRO DE CANALES EN VIVO</div>
                    <p className="text-indigo-400/80"><span className="text-slate-600">[03:12]</span> SISTEMA: Encriptación P2P activada para videollamadas.</p>
                    <p className="text-rose-400/80"><span className="text-slate-600">[03:14]</span> SISTEMA: {lobbyStats.searchingRandomCount} usuarios en cola de chat aleatorio.</p>
                    <p className="text-emerald-400/80"><span className="text-slate-600">[03:15]</span> NOTIFICACIÓN: ¡Nuevas salas de debate creadas recientemente!</p>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: ACTIVE DEBATE FORUMS */}
              {coverTab === 'debates' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 flex flex-col justify-between h-full"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 font-bold uppercase block">FOROS DE DEBATE EN CURSO</span>
                    
                    <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                      {debates.length > 0 ? (
                        debates.slice(0, 3).map((d) => (
                          <div 
                            key={d.id} 
                            className="p-3 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-950/80 transition-all space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span 
                                className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase"
                                style={{ 
                                  backgroundColor: `${d.creatorColor || '#6366f1'}15`, 
                                  color: d.creatorColor || '#6366f1',
                                  border: `1px solid ${d.creatorColor || '#6366f1'}30` 
                                }}
                              >
                                {d.category}
                              </span>
                              <span className="text-[9px] font-mono text-slate-500 font-bold flex items-center gap-1">
                                🔥 {d.votes} votos
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{d.title}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{d.description}</p>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-900/30">
                              <span className="text-[8px] text-slate-500 font-mono">
                                Por: <span style={{ color: d.creatorColor || '#cbd5e1' }}>{d.creatorName}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDirectRoomAccess(d.id)}
                                className="px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:border-indigo-500/50 rounded-md transition-all hover:scale-105 cursor-pointer"
                              >
                                Debatir 💬
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        /* Pre-seeded awesome debate cards */
                        <div className="space-y-2.5">
                          <div className="p-3 rounded-xl border border-slate-900 bg-slate-950/40 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                Filosofía
                              </span>
                              <span className="text-[9px] font-mono text-slate-500 font-bold flex items-center gap-1">
                                🔥 18 votos
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-200">¿Es posible enamorarse en el anonimato?</h4>
                            <p className="text-[10px] text-slate-400 leading-snug">Debatamos si conocer a alguien únicamente por voz y texto sin juzgar su apariencia genera conexiones más profundas.</p>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-900/30">
                              <span className="text-[8px] text-slate-500 font-mono">Por: <span className="text-indigo-400">Gato_Curioso</span></span>
                              <button
                                type="button"
                                onClick={() => handleDirectRoomAccess('d3')}
                                className="px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:border-indigo-500/50 rounded-md transition-all hover:scale-105 cursor-pointer"
                              >
                                Debatir 💬
                              </button>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl border border-slate-900 bg-slate-950/40 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Relaciones
                              </span>
                              <span className="text-[9px] font-mono text-slate-500 font-bold flex items-center gap-1">
                                🔥 11 votos
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-200">¿Las relaciones líquidas dominan las redes sociales?</h4>
                            <p className="text-[10px] text-slate-400 leading-snug">¿Cómo afecta la efimeridad de las salas de voz virtuales a nuestro sentido de amistad y empatía actual?</p>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-900/30">
                              <span className="text-[8px] text-slate-500 font-mono">Por: <span className="text-rose-400">Loba_Estelar</span></span>
                              <button
                                type="button"
                                onClick={() => handleDirectRoomAccess('d2')}
                                className="px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:border-indigo-500/50 rounded-md transition-all hover:scale-105 cursor-pointer"
                              >
                                Debatir 💬
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[9px] font-mono text-slate-500 text-center uppercase">
                    ¡Vota, debate y crea foros una vez ingresado!
                  </p>
                </motion.div>
              )}

              {/* TAB 3: HOLOGRAMS & DYNAMIC PHOTOS */}
              {coverTab === 'photos' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 flex flex-col justify-between h-full"
                >
                  <div className="flex flex-col items-center justify-center">
                    
                    {/* Compacted Hologram Projector core */}
                    <div className="relative flex items-center justify-center w-28 h-28 my-1">
                      {/* Spinning outer ring */}
                      <div 
                        className="absolute inset-0 rounded-full border border-dashed animate-[spin_24s_linear_infinite]"
                        style={{ borderColor: `${color || '#6366f1'}40` }}
                      />
                      <div 
                        className="absolute inset-1.5 rounded-full border border-dashed animate-[spin_12s_linear_infinite_reverse] opacity-40"
                        style={{ borderColor: `${color || '#6366f1'}20` }}
                      />

                      {/* Pulsing glow aura background */}
                      <div 
                        className="absolute inset-4 rounded-full opacity-20 blur-xl transition-all duration-700 animate-pulse"
                        style={{ 
                          backgroundColor: color || '#6366f1',
                          animationDuration: '1.5s'
                        }}
                      />

                      {/* Center avatar core symbol */}
                      <div 
                        className="absolute inset-4 rounded-full border transition-colors duration-500 flex items-center justify-center animate-pulse"
                        style={{ 
                          borderColor: `${color || '#6366f1'}30`,
                          boxShadow: `inset 0 0 10px ${color || '#6366f1'}20`
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-100 transition-all duration-500"
                          style={{ 
                            backgroundColor: `${color || '#6366f1'}15`,
                            boxShadow: `0 0 15px ${(color || '#6366f1')}30`,
                            border: `1.2px solid ${color || '#6366f1'}`
                          }}
                        >
                          {gender === 'male' ? (
                            <span className="text-sm font-bold select-none drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">♂</span>
                          ) : gender === 'female' ? (
                            <span className="text-sm font-bold select-none drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">♀</span>
                          ) : gender === 'couple' ? (
                            <span className="text-sm font-bold select-none drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">⚤</span>
                          ) : gender === 'nonbinary' ? (
                            <span className="text-sm font-bold select-none drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">⚨</span>
                          ) : (
                            <Cpu className="w-4 h-4 animate-pulse text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
                          )}
                        </div>
                      </div>

                      {/* Laser scanner line */}
                      <div 
                        className="absolute left-1 right-1 h-[2px] blur-[1px] animate-scanlaser z-20"
                        style={{ backgroundColor: color || '#6366f1' }}
                      />
                    </div>

                    <div className="text-center font-mono space-y-0.5 mt-1">
                      <h5 className="text-[11px] font-bold text-slate-200 uppercase truncate max-w-[200px]">
                        {name || '<Sin Alias>'}
                      </h5>
                      <p className="text-[8px] text-slate-500 leading-normal">
                        GEN: {gender === 'unspecified' ? 'OCULTO' : gender.toUpperCase()} · EDAD: {age} AÑOS
                        <br />
                        ORIENTACIÓN: {orientation === 'unspecified' ? 'CUALQUIERA' : orientation.toUpperCase()}
                        {isPremium && <span className="text-amber-400 font-extrabold block mt-0.5">★ MIEMBRO PREMIUM ★</span>}
                      </p>
                    </div>
                  </div>

                  {/* Preset Identities (Simulated Photo Gallery selection) */}
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-900/60">
                    <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase block text-center">
                      CLONAR HOLOGRAMA / FOTO PRE-DISEÑADA:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setName('Sirena_Neón');
                          setColor('#ec4899');
                          setGender('female');
                          setAge('22');
                          setAgeConfirmed(true);
                          playInteractionMode('color', 2);
                        }}
                        className="p-1.5 rounded-lg border border-slate-900 bg-slate-950/40 hover:border-pink-500/40 transition-all flex items-center gap-1.5 text-left cursor-pointer group"
                      >
                        <span className="w-4 h-4 rounded-full bg-pink-500 border border-white/10 flex items-center justify-center text-[8px] font-bold text-black select-none group-hover:scale-110 transition-transform">♀</span>
                        <div className="truncate">
                          <p className="text-[9px] font-bold text-slate-300 truncate">Sirena_Neón</p>
                          <p className="text-[7px] text-slate-500">Mujer, 22a</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setName('Cazador_Delta');
                          setColor('#3b82f6');
                          setGender('male');
                          setAge('25');
                          setAgeConfirmed(true);
                          playInteractionMode('color', 0);
                        }}
                        className="p-1.5 rounded-lg border border-slate-900 bg-slate-950/40 hover:border-blue-500/40 transition-all flex items-center gap-1.5 text-left cursor-pointer group"
                      >
                        <span className="w-4 h-4 rounded-full bg-blue-500 border border-white/10 flex items-center justify-center text-[8px] font-bold text-black select-none group-hover:scale-110 transition-transform">♂</span>
                        <div className="truncate">
                          <p className="text-[9px] font-bold text-slate-300 truncate">Cazador_Delta</p>
                          <p className="text-[7px] text-slate-500">Hombre, 25a</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setName('Gato_Cósmico');
                          setColor('#06b6d4');
                          setGender('nonbinary');
                          setAge('24');
                          setAgeConfirmed(true);
                          playInteractionMode('color', 1);
                        }}
                        className="p-1.5 rounded-lg border border-slate-900 bg-slate-950/40 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 text-left cursor-pointer group"
                      >
                        <span className="w-4 h-4 rounded-full bg-cyan-500 border border-white/10 flex items-center justify-center text-[8px] font-bold text-black select-none group-hover:scale-110 transition-transform">⚨</span>
                        <div className="truncate">
                          <p className="text-[9px] font-bold text-slate-300 truncate">Gato_Cósmico</p>
                          <p className="text-[7px] text-slate-500">No Bin, 24a</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setName('Pareja_Zafiro');
                          setColor('#10b981');
                          setGender('couple');
                          setAge('28');
                          setAgeConfirmed(true);
                          playInteractionMode('color', 3);
                        }}
                        className="p-1.5 rounded-lg border border-slate-900 bg-slate-950/40 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 text-left cursor-pointer group"
                      >
                        <span className="w-4 h-4 rounded-full bg-emerald-500 border border-white/10 flex items-center justify-center text-[8px] font-bold text-black select-none group-hover:scale-110 transition-transform">⚤</span>
                        <div className="truncate">
                          <p className="text-[9px] font-bold text-slate-300 truncate">Pareja_Zafiro</p>
                          <p className="text-[7px] text-slate-500">Pareja, 28a</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: MATCH (Simulated) */}
              {coverTab === 'match' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 flex flex-col justify-between h-full"
                >
                  <div className="space-y-2 text-center h-full flex flex-col justify-center items-center">
                    <h4 className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                      Matching Inteligente
                    </h4>
                    
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center mt-2">
                      <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30 animate-[spin_4s_linear_infinite]" />
                      <div className="absolute inset-2 rounded-full border border-emerald-500/20 animate-pulse" />
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <Heart className="w-8 h-8 text-emerald-400 animate-bounce" />
                      </div>
                      
                      {/* Floating matching examples */}
                      <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs animate-bounce" style={{ animationDelay: '0.2s' }}>♂</div>
                      <div className="absolute -bottom-2 -right-4 w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-xs animate-bounce" style={{ animationDelay: '0.5s' }}>♀</div>
                      <div className="absolute -bottom-4 -left-2 w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs animate-bounce" style={{ animationDelay: '0.8s' }}>⚤</div>
                    </div>

                    <div className="mt-6 px-2 space-y-1.5 text-center flex-1 flex flex-col justify-center">
                      <p className="text-[10px] text-slate-300 font-bold leading-relaxed uppercase tracking-wider">
                        Conecta por Coincidencias de Perfil
                      </p>
                      <p className="text-[9px] text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                        Al iniciar sesión y usar el <strong className="text-emerald-400">Video Chat Rápido</strong>, nuestro radar emparejará tu perfil 
                        <br/><span className="text-white font-mono bg-slate-900 px-1 py-0.5 rounded ml-1 mr-1">(Género: {gender === 'unspecified' ? '?' : gender.substring(0,3).toUpperCase()}, Edad: {age})</span><br/>
                        con la persona o pareja más afín, según las preferencias en línea.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: LIVE SHOWS (Simulated) */}
              {coverTab === 'shows' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 flex flex-col justify-between h-full"
                >
                  <div className="space-y-2 text-center h-full flex flex-col justify-center items-center">
                    <h4 className="text-[12px] font-bold text-fuchsia-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Shows en Vivo
                    </h4>
                    
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center mt-2">
                      {/* Spotlight effects */}
                      <div className="absolute top-0 -left-10 w-20 h-40 bg-fuchsia-500/10 blur-xl rotate-[30deg] animate-pulse" />
                      <div className="absolute top-0 -right-10 w-20 h-40 bg-pink-500/10 blur-xl -rotate-[30deg] animate-pulse" style={{ animationDelay: '1s' }} />
                      
                      <div className="absolute inset-0 rounded-full border border-dashed border-fuchsia-500/30 animate-[spin_8s_linear_infinite]" />
                      <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.3)] z-10">
                        <Video className="w-7 h-7 text-fuchsia-400" />
                      </div>
                      
                      {/* Viewers particles */}
                      <div className="absolute -top-2 left-4 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] animate-bounce" style={{ animationDelay: '0.1s' }}>👁️</div>
                      <div className="absolute bottom-0 -right-2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] animate-bounce" style={{ animationDelay: '0.4s' }}>🔥</div>
                      <div className="absolute top-10 -left-6 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] animate-bounce" style={{ animationDelay: '0.7s' }}>✨</div>
                    </div>

                    <div className="mt-6 px-2 space-y-1.5 text-center flex-1 flex flex-col justify-center">
                      <p className="text-[10px] text-slate-300 font-bold leading-relaxed uppercase tracking-wider">
                        Únete a Transmisiones Públicas
                      </p>
                      <p className="text-[9px] text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                        Inicia sesión para descubrir y participar en <strong className="text-fuchsia-400">Shows en vivo</strong> de la comunidad. Puedes ser espectador, enviar reacciones, o iniciar tu propio show público.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 6: RELATOS Y CONFESIONES */}
              {coverTab === 'relatos' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-3 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-pink-400 tracking-wider uppercase font-mono">
                          📖 Relatos & Confesiones
                        </h4>
                        <p className="text-[9px] text-slate-500 leading-normal">
                          Secretos, desahogos y vivencias 100% anónimas de la comunidad.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStoryForm(!showStoryForm);
                          playInteractionMode('click');
                        }}
                        className="px-2.5 py-1 text-[9px] font-bold bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-xl cursor-pointer transition-all flex items-center gap-1"
                      >
                        {showStoryForm ? 'Ver Relatos 📖' : 'Confesarse ✍️'}
                      </button>
                    </div>

                    {showStoryForm ? (
                      /* WRITE STORY FORM */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 space-y-2.5 overflow-y-auto max-h-[280px]"
                      >
                        <div>
                          <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase mb-1">Título de tu confesión</label>
                          <input
                            type="text"
                            placeholder="Ej: Vi a mi jefe en el supermercado con..."
                            value={newStoryTitle}
                            onChange={(e) => setNewStoryTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-200 text-xs placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase mb-1">Categoría</label>
                          <select
                            value={newStoryCat}
                            onChange={(e) => setNewStoryCat(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                          >
                            <option value="Secreto">🤫 Secreto Oscuro</option>
                            <option value="Amor/Desamor">💔 Amor / Desamor</option>
                            <option value="Paranormal">👻 Paranormal / Extraño</option>
                            <option value="Humor">😂 Humor / Anécdota graciosa</option>
                            <option value="Fantasía">✨ Fantasía / Pensamiento</option>
                            <option value="Otro">💬 Otro relato</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase">Tu confesión o historia</label>
                            <span className={`text-[8px] font-mono font-bold ${newStoryContent.length >= 900 ? 'text-rose-500' : 'text-slate-500'}`}>
                              {newStoryContent.length}/1000
                            </span>
                          </div>
                          <textarea
                            placeholder="Desahógate de forma totalmente anónima aquí..."
                            rows={3}
                            maxLength={1000}
                            value={newStoryContent}
                            onChange={(e) => setNewStoryContent(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-200 text-xs placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={!newStoryTitle.trim() || !newStoryContent.trim()}
                          onClick={() => {
                            handleCreateStory(newStoryTitle, newStoryContent, newStoryCat);
                            playInteractionMode('click');
                          }}
                          className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-all uppercase tracking-wider"
                        >
                          Publicar Anónimamente 🤫
                        </button>
                      </motion.div>
                    ) : (
                      /* STORIES LIST */
                      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[290px]">
                        {stories.length === 0 ? (
                          <div className="text-center py-12 text-slate-600">
                            <span className="block text-2xl mb-1">🤫</span>
                            <span className="text-[10px] uppercase font-mono">No hay historias publicadas aún. ¡Sé el primero!</span>
                          </div>
                        ) : (
                          stories.map((story) => {
                            const isExpanded = expandedStoryId === story.id;
                            const hasVoted = story.votedBy?.includes(userId);
                            
                            // Determine category styling
                            let catBg = "bg-slate-900 text-slate-400";
                            if (story.category === "Amor/Desamor") catBg = "bg-pink-500/10 text-pink-400 border border-pink-500/20";
                            else if (story.category === "Paranormal") catBg = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                            else if (story.category === "Humor") catBg = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                            else if (story.category === "Secreto") catBg = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                            else if (story.category === "Fantasía") catBg = "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20";

                            return (
                              <div
                                key={story.id}
                                className="p-3 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-950/80 transition-all space-y-2 text-left"
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-md font-bold ${catBg}`}>
                                    {story.category}
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-mono">
                                    {new Date(story.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <h5 
                                  onClick={() => {
                                    setExpandedStoryId(isExpanded ? null : story.id);
                                    playInteractionMode('select');
                                  }}
                                  className="text-[11px] font-extrabold text-slate-200 cursor-pointer hover:text-pink-400 transition-colors leading-snug"
                                >
                                  {story.title}
                                </h5>

                                <p className={`text-[10px] text-slate-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {story.content}
                                </p>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-900/40 text-[9px]">
                                  <div className="flex items-center gap-1.5 text-[9px]">
                                    <div 
                                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                                      style={{ backgroundColor: story.creatorColor || '#ffffff' }}
                                    />
                                    <span className="text-slate-500 font-mono font-medium">{story.creatorName}</span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {/* Like Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleVoteStory(story.id);
                                        playInteractionMode('click');
                                      }}
                                      className={`flex items-center gap-1 font-bold font-mono transition-colors cursor-pointer ${
                                        hasVoted ? 'text-rose-500' : 'text-slate-500 hover:text-slate-400'
                                      }`}
                                    >
                                      <Heart className={`w-3 h-3 ${hasVoted ? 'fill-rose-500 text-rose-500' : ''}`} />
                                      <span>{story.votes || 0}</span>
                                    </button>

                                    {/* Comments Count Toggle */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedStoryId(isExpanded ? null : story.id);
                                        playInteractionMode('select');
                                      }}
                                      className="flex items-center gap-1 font-mono text-slate-500 hover:text-slate-400 cursor-pointer"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>{story.comments?.length || 0}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Comments Expanded Area */}
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="pt-2.5 mt-2.5 border-t border-slate-900 space-y-2"
                                  >
                                    <div className="text-[8px] font-mono uppercase tracking-wider text-slate-500 font-bold">Comentarios de la confesión:</div>
                                    
                                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                      {(!story.comments || story.comments.length === 0) ? (
                                        <div className="text-center py-3 text-[9px] text-slate-600 font-mono italic">No hay comentarios aún. Deja tu opinión respetuosa.</div>
                                      ) : (
                                        story.comments.map((comm) => (
                                          <div key={comm.id} className="bg-slate-950 p-1.5 rounded-lg border border-slate-900/60 text-left space-y-0.5">
                                            <div className="flex items-center justify-between text-[8px]">
                                              <span className="font-bold font-mono" style={{ color: comm.creatorColor }}>{comm.creatorName}</span>
                                              <span className="text-slate-600 font-mono">{new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-[9px] text-slate-300 leading-normal">{comm.content}</p>
                                          </div>
                                        ))
                                      )}
                                    </div>

                                    {/* New Comment Input */}
                                    <div className="flex gap-1 pt-1.5">
                                      <input
                                        type="text"
                                        placeholder="Escribe un comentario anónimo..."
                                        value={newCommentContent}
                                        onChange={(e) => setNewCommentContent(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleCommentStory(story.id, newCommentContent);
                                            playInteractionMode('click');
                                          }
                                        }}
                                        className="flex-1 bg-slate-950 border border-slate-900 rounded-lg p-1.5 text-slate-300 text-[10px] placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCommentStory(story.id, newCommentContent);
                                          playInteractionMode('click');
                                        }}
                                        className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg text-[9px] cursor-pointer transition-all shrink-0"
                                      >
                                        Comentar
                                      </button>
                                    </div>
                                  </motion.div>
                                )}

                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </div>

            {/* Sound testing section (Always available at the bottom for playful testing) */}
            <div className="w-full pt-3.5 mt-3 border-t border-slate-900/60 z-10 flex flex-col items-center gap-1.5">
              <span className="text-[8px] font-mono tracking-wider text-slate-500 uppercase">Probadora de Sonido Incógnito</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => playNotificationSound('message')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[9px] font-bold transition-all cursor-pointer hover:scale-[1.03] active:scale-95"
                  title="Probar sonido de mensaje nuevo"
                >
                  <Volume2 className="w-3 h-3 text-slate-400" />
                  <span>Mensaje 🔊</span>
                </button>
                <button
                  type="button"
                  onClick={() => playNotificationSound('join')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[9px] font-bold transition-all cursor-pointer hover:scale-[1.03] active:scale-95"
                  title="Probar sonido de usuario uniéndose"
                >
                  <Volume2 className="w-3 h-3 text-slate-400" />
                  <span>Unión 🔊</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating status button */}
        <div className="absolute bottom-6 right-6 z-50 group flex flex-col items-end">
          {/* Tooltip hint on hover when incomplete */}
          {!isFormComplete && (
            <div className="absolute bottom-12 right-0 bg-slate-950/95 border border-slate-800 text-slate-400 text-[10px] rounded-xl px-3 py-2 font-mono shadow-xl max-w-[220px] transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 pointer-events-none text-right whitespace-normal">
              <span className="text-rose-400 font-bold block mb-0.5">⚠️ Requisitos pendientes:</span>
              {!name.trim() && <span className="block">• Ingresar tu Alias Anónimo</span>}
              {(!age || parseInt(age, 10) < 18) && <span className="block">• Ser mayor de 18 años</span>}
              {!ageConfirmed && <span className="block">• Confirmar declaración de edad</span>}
            </div>
          )}

          <motion.button
            type="button"
            onClick={() => {
              if (isFormComplete) {
                playInteractionMode('click');
                setHasEntered(true);
              } else {
                playInteractionMode('select');
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-2xl font-mono text-[10px] font-bold tracking-wider uppercase transition-all duration-500 cursor-pointer ${
              isFormComplete
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/10 animate-pulse'
                : 'bg-slate-950/80 border-slate-900/60 text-slate-500 hover:text-slate-400 shadow-black/80'
            }`}
            style={{
              boxShadow: isFormComplete ? '0 0 20px rgba(16, 185, 129, 0.25)' : 'none'
            }}
          >
            {isFormComplete ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce stroke-[3]" />
                <span>Estatus: ¡Listo! ⚡</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-slate-600 animate-pulse" />
                <span>Estatus: Pendiente ░</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    );
  }

  // Render Main Layout Dashboard
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 font-sans select-none overflow-hidden text-slate-200">
      
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-900 bg-slate-950/90 backdrop-blur-cyber flex items-center justify-between px-4 sm:px-6 z-30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <h1 className="text-lg font-extrabold bg-gradient-to-r from-rose-400 via-pink-500 to-indigo-400 bg-clip-text text-transparent tracking-tight">
            Incognito Chat
          </h1>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-2 py-0.5 border border-slate-800 rounded-full bg-slate-900 ml-1.5">
            Lobby Live
          </span>
        </div>

        {/* Global Stats & Personal profile badge */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              En línea: <strong className="text-slate-200">{lobbyStats.totalOnline}</strong>
            </span>
            {lobbyStats.searchingRandomCount > 0 && (
              <span className="flex items-center gap-1 text-rose-400 animate-pulse">
                <Compass className="w-3.5 h-3.5" />
                Buscando Match: <strong>{lobbyStats.searchingRandomCount}</strong>
              </span>
            )}
          </div>

          {/* Sound Notification Toggle Switch */}
          <button
            type="button"
            onClick={() => setSoundsEnabled(prev => !prev)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              soundsEnabled 
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:scale-[1.02]' 
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400 hover:scale-[1.02]'
            }`}
            title={soundsEnabled ? "Silenciar notificaciones sonoras" : "Activar notificaciones sonoras"}
          >
            {soundsEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sonido: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Sonido: OFF</span>
              </>
            )}
          </button>

          {/* User profile card */}
          <div className="flex items-center gap-2 border border-slate-800/80 bg-slate-900/50 py-1.5 px-3.5 rounded-2xl">
            <div 
              className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 ring-offset-slate-950 shadow" 
              style={{ backgroundColor: color, '--tw-ring-color': color } as React.CSSProperties} 
            />
            <span className="text-xs font-bold tracking-tight text-slate-200">{name}</span>
            <span className="text-[9px] text-slate-400 border border-slate-800/60 rounded px-1 text-slate-500">{age} años</span>
          </div>

          <button
            onClick={() => {
              stopAllMedia();
              // Notify server of departure
              fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: 'disconnect' })
              }).catch(err => console.error(err));
              setHasEntered(false);
            }}
            className="text-xs text-rose-400 font-semibold border border-rose-900/40 hover:bg-rose-950/20 py-1.5 px-3 rounded-2xl transition-colors cursor-pointer"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main Container Workspace */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* --- INCOMING CALL POPUP --- */}
        <AnimatePresence>
          {incomingCallRequest && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] bg-slate-900/95 border border-indigo-500/30 p-6 rounded-3xl glow-indigo z-50 backdrop-blur-xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-bounce">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Llamada Entrante</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    <span className="text-indigo-400 font-semibold">{incomingCallRequest.fromName}</span> te está invitando a un chat de voz y video privado.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      // Accept invite
                      outgoingSignalsRef.current.push({
                        from: userId,
                        to: incomingCallRequest.fromId,
                        type: 'call-response',
                        payload: { accepted: true }
                      });
                      // Set up and connect WebRTC on next heartbeat
                      setIncomingCallRequest(null);
                      setCallRejectedNotification("Conectando videollamada...");
                      setTimeout(() => setCallRejectedNotification(null), 3000);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => {
                      // Reject invite
                      outgoingSignalsRef.current.push({
                        from: userId,
                        to: incomingCallRequest.fromId,
                        type: 'call-response',
                        payload: { accepted: false }
                      });
                      setIncomingCallRequest(null);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- REJECTED/SYSTEM NOTIFICATION TOAST --- */}
        <AnimatePresence>
          {callRejectedNotification && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-rose-500/20 px-5 py-3 rounded-full text-xs font-semibold text-rose-400 shadow-xl z-50 flex items-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span>{callRejectedNotification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. LEFT SIDEBAR (Controls & Rooms Listing) */}
        <aside className="w-80 border-r border-slate-900 bg-slate-950/80 hidden md:flex flex-col z-20 shrink-0">
          
          {/* Match Random Call To Action Box */}
          <div className="p-4 border-b border-slate-900">
            <button
              onClick={startRandomMatch}
              className={`w-full bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 hover:scale-[1.02] text-white font-bold py-3.5 px-4 rounded-2xl cursor-pointer flex items-center justify-center gap-2.5 transition-all text-xs tracking-wider uppercase glow-primary ${
                isSearchingRandom ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950' : ''
              }`}
            >
              <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
              Video Chat Rápido (1-a-1)
            </button>
          </div>

          {/* Tab Selector (Rooms vs Debates vs Active People in Room) */}
          <div className="flex border-b border-slate-900 px-1 text-[11px]">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex-1 py-3 text-center font-bold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'rooms' 
                  ? 'border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Salas
            </button>
            <button
              onClick={() => setActiveTab('debates')}
              className={`flex-1 py-3 text-center font-bold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'debates' 
                  ? 'border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Debates
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 text-center font-bold border-b-2 cursor-pointer transition-colors relative ${
                activeTab === 'users' 
                  ? 'border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Gente
              {roomUsers.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-indigo-500/10 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded-full">
                  {roomUsers.length}
                </span>
              )}
            </button>
          </div>

          {/* Sidebar Content (Scrollable list based on active tab) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            
            {activeTab === 'rooms' ? (
              // Tab A: STATIC ROOM LISTINGS
              <div className="space-y-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => joinRoom(room.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      currentRoom === room.id
                        ? 'bg-indigo-600/10 border-indigo-500/30 glow-indigo'
                        : 'bg-slate-900/30 border-transparent hover:bg-slate-900/50 hover:border-slate-800/80'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 shrink-0">
                      {getRoomIcon(room.icon)}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-slate-200 block truncate">
                          {room.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyRoomLink(room.id, room.name);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-400 bg-slate-950/60 hover:bg-slate-950 rounded border border-slate-800/40 hover:border-slate-800 transition-all cursor-pointer"
                            title="Copiar enlace de sala"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                            {room.activeUsers} live
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                        {room.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : activeTab === 'debates' ? (
              // Tab B: DEBATE FORUMS LISTING
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowDebateForm(!showDebateForm)}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-rose-600 hover:scale-[1.01] active:scale-[0.99] text-white font-bold rounded-xl text-[11px] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {showDebateForm ? 'Cancelar Propuesta' : 'Iniciar Nuevo Debate'}
                </button>

                {showDebateForm && (
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Tema de debate</label>
                      <input
                        type="text"
                        placeholder="Ej: ¿Pizza con piña: sí o no?"
                        maxLength={100}
                        value={newDebateTitle}
                        onChange={(e) => setNewDebateTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Argumento o Pregunta inicial</label>
                      <textarea
                        placeholder="Plantea tu pregunta o argumento..."
                        maxLength={300}
                        rows={3}
                        value={newDebateDesc}
                        onChange={(e) => setNewDebateDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Categoría</label>
                      <select
                        value={newDebateCat}
                        onChange={(e) => setNewDebateCat(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Tecnología">Tecnología</option>
                        <option value="Filosofía">Filosofía</option>
                        <option value="Cotidiano">Cotidiano</option>
                        <option value="Fútbol">Fútbol</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newDebateTitle.trim() || !newDebateDesc.trim()) return;
                        handleCreateDebate(newDebateTitle.trim(), newDebateDesc.trim(), newDebateCat);
                        setNewDebateTitle('');
                        setNewDebateDesc('');
                        setShowDebateForm(false);
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Publicar Debate 🔥
                    </button>
                  </div>
                )}

                <div className="space-y-2.5">
                  {debates.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No hay debates activos aún.
                    </div>
                  ) : (
                    debates.map((debate) => {
                      const hasVoted = debate.votedBy?.includes(userId);
                      return (
                        <div
                          key={debate.id}
                          className={`p-3 bg-slate-900/10 border rounded-xl space-y-2 transition-all hover:border-slate-800 ${
                            currentRoom === debate.id ? 'bg-indigo-500/5 border-indigo-500/20' : 'border-slate-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                                {debate.category}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyRoomLink(debate.id, debate.title)}
                                className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-950 rounded transition-all cursor-pointer"
                                title="Copiar enlace de debate"
                              >
                                <Share2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleVoteDebate(debate.id)}
                              className={`flex items-center gap-1 py-0.5 px-1.5 rounded-full text-[9px] font-bold border cursor-pointer transition-all ${
                                hasVoted
                                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                                  : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <span>🔥</span> {debate.votes}
                            </button>
                          </div>
                          
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-[11px] text-slate-200 leading-snug">
                              {debate.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                              {debate.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-900/40">
                            <div className="flex items-center gap-1 overflow-hidden max-w-[55%]">
                              <span className="text-[8px] text-slate-500 shrink-0">Por</span>
                              <span
                                className="text-[9px] font-extrabold truncate"
                                style={{ color: debate.creatorColor }}
                              >
                                {debate.creatorName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => joinRoom(debate.id)}
                              className={`py-1 px-2.5 rounded-lg text-[9px] font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                currentRoom === debate.id
                                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                                  : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              {currentRoom === debate.id ? 'Debatiendo' : 'Debatír'}
                              <span>💬</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              // Tab C: USERS ONLINE IN CURRENT ROOM WITH DIRECT CALL BUTTONS
              <div className="space-y-1.5">
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-1">
                  Usuarios activos en esta sala
                </div>
                {roomUsers.length <= 1 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No hay otros usuarios en esta sala.
                  </div>
                ) : (
                  roomUsers.map((u) => {
                    if (u.id === userId) return null;
                    return (
                      <div
                        key={u.id}
                        className="p-3 bg-slate-900/35 border border-slate-900 rounded-xl flex flex-col gap-2 transition-all hover:bg-slate-900/50 hover:border-slate-800/80"
                      >
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div 
                              className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-slate-950 shrink-0" 
                              style={{ backgroundColor: u.color, '--tw-ring-color': u.color } as React.CSSProperties} 
                            />
                            <span className="text-xs font-bold text-slate-300 truncate">
                              {u.name}
                            </span>
                          </div>
                          <span className="text-[8px] text-slate-500 bg-slate-950 border border-slate-900 px-1 py-0.5 rounded shrink-0">
                            {getGenderLabel(u.gender)}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => u.id && u.name && requestDirectCall(u.id, u.name)}
                            className="flex-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all"
                            title={`Llamar por voz/video a ${u.name}`}
                          >
                            <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Llamar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* 2. MAIN CENTER FEED AREA (Transitions based on state) */}
        <main className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* STATE 1: ACTIVE VOICE & VIDEO CALL OVERLAY SCREEN */}
            {activeCall && peer ? (
              <motion.div
                key="active-call"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950 z-40 flex flex-col md:flex-row"
              >
                {/* Left Side: Cameras Stage container */}
                <div className="flex-1 flex flex-col relative bg-slate-900/40 p-4">
                  
                  {/* Call details overlay */}
                  <div className="absolute top-6 left-6 z-10 flex items-center gap-3 bg-slate-950/80 border border-slate-800 backdrop-blur px-4 py-2.5 rounded-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">Llamada en Vivo</h4>
                      <p className="text-[10px] text-slate-400">Conectado con <span className="font-bold" style={{ color: peer.color || '#f43f5e' }}>{peer.name}</span></p>
                    </div>
                  </div>

                  {/* Remote video container (takes full background space) */}
                  <div className="flex-1 w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-900 relative flex items-center justify-center">
                    
                    {peer.id.startsWith('virtual_') ? (
                      // RENDER BEAUTIFUL CYBERPUNK PREMIUM WEB-CAMERA LOOP
                      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-4 p-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.1)_0%,transparent_70%)] animate-pulse" />
                        
                        {/* Scanning scanner line effect */}
                        <div className="absolute inset-x-0 h-0.5 bg-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-scanlaser z-10" />
                        
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.35)]">
                          <img
                            src={`https://picsum.photos/seed/${peer.id}/400/400`}
                            alt={peer.name}
                            className="w-full h-full object-cover grayscale brightness-110 contrast-125"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 right-2 bg-rose-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white uppercase animate-pulse">
                            LIVE
                          </div>
                        </div>
                        
                        <div className="text-center space-y-1.5 z-10">
                          <p className="text-xs sm:text-sm font-extrabold text-rose-400 font-mono tracking-widest flex items-center justify-center gap-1.5 uppercase">
                            ★ Transmisión Premium VIP ★
                          </p>
                          <p className="text-[10px] text-slate-400">Canal verificado · Conexión Privada Establecida</p>
                          <div className="flex justify-center gap-1.5 mt-2">
                            <span className="text-[9px] bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-rose-300 font-semibold font-mono">
                              {getGenderLabel(peer.gender)}
                            </span>
                            <span className="text-[9px] bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-rose-300 font-semibold font-mono">
                              {peer.age} años
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // If no video track yet, show a clean loading overlay
                      <div className="text-center space-y-4">
                        <div className="w-24 h-24 rounded-full mx-auto bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-pulse ring-4 ring-indigo-500/20">
                          <Users className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-semibold text-slate-300">Conectando canales de streaming...</p>
                        <p className="text-xs text-slate-500">Espera que la conexión P2P se complete.</p>
                      </div>
                    )}

                    {/* Local PIP Video (small preview pinned at the bottom-right corner) */}
                    <div className="absolute bottom-6 right-6 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl z-20">
                      {localStream ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-[10px] text-slate-500">
                          Sin Video
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Call Media Controls Deck (Zoom-like) */}
                  <div className="h-24 flex items-center justify-center gap-6 mt-2 bg-slate-950/80 rounded-2xl border border-slate-900 mx-4 md:mx-auto md:w-3/4 max-w-lg mb-2">
                    {/* Camera switch */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all cursor-pointer border shadow-lg ${
                          videoEnabled 
                            ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' 
                            : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
                        }`}
                        title={videoEnabled ? 'Apagar Cámara' : 'Encender Cámara'}
                      >
                        {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                      </button>
                      <span className="text-[10px] font-bold text-slate-400">
                        {videoEnabled ? 'Detener Video' : 'Iniciar Video'}
                      </span>
                    </div>

                    {/* Mic mute switch */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all cursor-pointer border shadow-lg ${
                          audioEnabled 
                            ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' 
                            : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
                        }`}
                        title={audioEnabled ? 'Silenciar Micrófono' : 'Activar Micrófono'}
                      >
                        {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                      </button>
                      <span className="text-[10px] font-bold text-slate-400">
                        {audioEnabled ? 'Silenciar' : 'Reactivar'}
                      </span>
                    </div>

                    {/* Screen Share switch */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={toggleScreenShare}
                        className={`p-4 rounded-full transition-all cursor-pointer border shadow-lg ${
                          isScreenSharing 
                            ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-400 shadow-emerald-500/20' 
                            : 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                        }`}
                        title={isScreenSharing ? 'Detener Compartir Pantalla' : 'Compartir Pantalla'}
                      >
                        <ScreenShare className="w-6 h-6" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-400">
                        {isScreenSharing ? 'Dejar de Comp.' : 'Compartir'}
                      </span>
                    </div>

                    {/* Hang up call */}
                    <div className="flex flex-col items-center gap-1.5 ml-4">
                      <button
                        onClick={() => handleHangup(true)}
                        className="bg-rose-600 hover:bg-rose-500 p-4 rounded-full text-white transition-all cursor-pointer shadow-lg shadow-rose-500/20 border border-rose-500"
                        title="Finalizar Llamada"
                      >
                        <PhoneOff className="w-6 h-6" />
                      </button>
                      <span className="text-[10px] font-bold text-rose-400">
                        Salir
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side Call Chat (Text communication during the active call) */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-900 bg-slate-950/80 flex flex-col shrink-0 h-48 md:h-full">
                  <div className="p-3 border-b border-slate-900 text-xs font-bold text-slate-400">
                    Mensajes Directos de Llamada
                  </div>
                  {/* Since WebRTC call represents transient connection, text overlay acts locally or direct data stream.
                      Let's offer a temporary private conversation overlay. */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
                    <div className="text-slate-500 italic text-[10px] text-center p-2 bg-slate-900/20 rounded">
                      Mensajes efímeros, nunca guardados.
                    </div>
                    {callMessages.length === 0 ? (
                      <div className="text-slate-500 text-center py-10">Envía un mensaje privado al par.</div>
                    ) : (
                      callMessages.map((cm, i) => (
                        <div key={i} className="space-y-0.5 leading-snug">
                          <span className="font-extrabold" style={{ color: cm.color }}>{cm.sender}: </span>
                          <span className="text-slate-300">{cm.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!callMessageInput.trim()) return;
                      const userMsgText = callMessageInput.trim();
                      const msg = { sender: name, color, text: userMsgText };
                      setCallMessages(prev => [...prev, msg]);
                      setCallMessageInput('');
                      
                      if (peer.id.startsWith('virtual_')) {
                        // Simulated virtual host replies!
                        const responses = [
                          "¡Me encanta hablar contigo! Cuéntame un poco más de ti 😉",
                          "Qué bueno que coincidimos, este chat Premium es otra cosa. ¿De qué ciudad eres?",
                          "¡Hola! Qué linda vibra tienes. ¿Vienes seguido por aquí? ✨",
                          "¡Súper! Me caes genial. ¿Qué estás buscando hoy?",
                          "Me encanta tu avatar de color. Combinamos bastante bien, ¿no crees? Haha 😜",
                          "Cuéntame más, te escucho (o te leo, jeje). 🌹"
                        ];
                        const randomResp = responses[Math.floor(Math.random() * responses.length)];
                        setTimeout(() => {
                          setCallMessages(prev => [...prev, {
                            sender: peer.name,
                            color: peer.color || '#f43f5e',
                            text: randomResp
                          }]);
                          playNotificationSound('message');
                        }, 1200 + Math.random() * 1200);
                      } else {
                        // Deliver message by embedding into outbox signaling queue
                        outgoingSignalsRef.current.push({
                          from: userId,
                          to: peer.id,
                          type: 'message-call-text', // Custom non-webrtc payload used during peer stream
                          payload: msg
                        });
                      }
                    }}
                    className="p-2 border-t border-slate-900 flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Escribe en privado..."
                      value={callMessageInput}
                      onChange={(e) => setCallMessageInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-100"
                    />
                    <button type="submit" className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white cursor-pointer shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : isSearchingRandom ? (
              
              // STATE 2: RANDOM MATCHMAKING RADAR
              <motion.div
                key="searching-radar"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                  
                  {/* Glowing pulses */}
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border border-rose-500/30"
                  />
                  <motion.div
                    animate={{ scale: [1, 2.4], opacity: [0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: 'easeOut', delay: 1 }}
                    className="absolute inset-0 rounded-full border border-indigo-500/20"
                  />

                  {/* Core Spinning Radar line */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                    className="absolute inset-2 rounded-full border border-dashed border-indigo-500/40"
                  />

                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center shadow-2xl text-white shadow-indigo-500/20 z-10">
                    <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                </div>

                <div className="max-w-xs space-y-2">
                  <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">
                    Buscando Pareja Anónima
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Buscando en la nube otro usuario disponible para conectarse de forma privada con video y voz.
                  </p>
                  
                  {lobbyStats.searchingRandomCount > 0 && (
                    <div className="text-[10px] text-indigo-400 font-bold bg-indigo-500/5 border border-indigo-500/10 py-1.5 px-3 rounded-full mt-2 inline-block">
                      {lobbyStats.searchingRandomCount} personas buscando activamente
                    </div>
                  )}
                </div>

                <button
                  onClick={cancelRandomMatch}
                  className="mt-8 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-8 rounded-2xl cursor-pointer text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar Búsqueda
                </button>
              </motion.div>

            ) : (

              // STATE 3: GROUP ROOM TEXT CONVERSATION FEED
              <motion.div
                key="room-chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                {/* Active Room Title Banner */}
                {currentRoom && (() => {
                  const staticRoom = STATIC_ROOMS.find(r => r.id === currentRoom);
                  const isDebateRoom = currentRoom.startsWith('debate_');
                  const debateObj = isDebateRoom ? debates.find(d => d.id === currentRoom) : null;

                  const roomName = staticRoom ? staticRoom.name : (debateObj ? `Foro: ${debateObj.title}` : 'Foro de Debate');
                  const roomDesc = staticRoom ? staticRoom.description : (debateObj ? `Iniciado por ${debateObj.creatorName} • ${debateObj.description}` : 'Intercambia opiniones de forma 100% libre y anónima.');
                  const roomIcon = staticRoom ? staticRoom.icon : 'MessageSquare';

                  return (
                    <div className="p-4 border-b border-slate-900 bg-slate-950/60 backdrop-blur flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3 overflow-hidden max-w-[70%]">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                          {getRoomIcon(roomIcon)}
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-sm font-extrabold text-slate-100 truncate">
                            {roomName}
                          </h2>
                          <p className="text-[10px] text-slate-400 line-clamp-1">
                            {roomDesc}
                          </p>
                        </div>
                      </div>

                      {/* Small mobile rooms listing icon toggle to switch channels if sidebar is missing */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyRoomLink(currentRoom, roomName)}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-full font-bold text-[10px] transition-all cursor-pointer hover:scale-105"
                          title="Copiar enlace de invitación a este chat"
                        >
                          <Share2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">Copiar Enlace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const persistenceToken = btoa(encodeURIComponent(`${currentRoom}-${Date.now()}`)).substring(0, 16);
                            navigator.clipboard.writeText(`${window.location.origin}?session=${persistenceToken}`);
                            setCallRejectedNotification("Enlace de Confidencialidad y Memoria copiado al portapapeles.");
                            setTimeout(() => setCallRejectedNotification(null), 4000);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-full font-bold text-[10px] transition-all cursor-pointer hover:scale-105"
                          title="Generar enlace de acceso para retomar sesión"
                        >
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">Guardar Chat</span>
                        </button>
                        {currentRoom === 'novia-ia' && (
                          <button
                            type="button"
                            onClick={() => setShowGfConfigModal(true)}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-full font-bold text-[10px] transition-all cursor-pointer hover:scale-105"
                          >
                            <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                            <span>Personalizar 💖</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab('debates')}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-full font-bold text-[10px] transition-all cursor-pointer hover:scale-105"
                          title="Volver a los foros de debate"
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">Ver Foros</span>
                        </button>
                        <button
                          type="button"
                          onClick={startRandomMatch}
                          className="bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-bold text-[10px] uppercase py-1.5 px-3.5 rounded-full hover:scale-105 transition-all"
                        >
                          Match 1-a-1
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Horizontal split container for Virtual Girlfriend */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Messages Feed (Left) */}
                  <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Messages Scrolling Grid */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                      {/* No messages indicator */}
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">El historial está vacío</p>
                            <p className="text-[10px] text-slate-600 max-w-xs mt-1">
                              Sé el primero en saludar de forma anónima. Recuerda que al salir o recargar la página, todo se borra.
                            </p>
                          </div>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMe = msg.senderId === userId;
                          return (
                            <div
                              key={msg.id}
                              className={`flex items-start gap-2.5 max-w-[85%] md:max-w-[70%] ${
                                isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                              }`}
                            >
                              {/* Colored dot or girlfriend avatar representation */}
                              {msg.senderId === 'girlfriend' ? (
                                <img
                                  src={girlfriendConfig?.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80'}
                                  alt={msg.senderName}
                                  className="w-7 h-7 rounded-full shrink-0 border border-rose-500/40 object-cover select-none shadow"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className="w-7 h-7 rounded-full shrink-0 border border-slate-800/80 flex items-center justify-center text-[10px] font-bold text-slate-900 select-none shadow"
                                  style={{ backgroundColor: msg.senderColor }}
                                >
                                  {msg.senderName.substring(0, 1).toUpperCase()}
                                </div>
                              )}

                              <div className="space-y-1">
                                {/* Metadata */}
                                <div className={`flex items-center gap-2 text-[10px] ${isMe ? 'justify-end' : ''}`}>
                                  <span
                                    className="font-bold"
                                    style={{ color: isMe ? '#94a3b8' : (msg.senderId === 'girlfriend' ? '#f43f5e' : msg.senderColor) }}
                                  >
                                    {msg.senderName} {isMe && '(Tú)'}
                                  </span>
                                  <span className="text-slate-600 font-mono">
                                    {formatTime(msg.timestamp)}
                                  </span>
                                  {!isMe && msg.senderId !== 'girlfriend' && (
                                    <button
                                      type="button"
                                      onClick={() => requestDirectCall(msg.senderId, msg.senderName)}
                                      className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-[9px] font-bold flex items-center gap-0.5 cursor-pointer transition-all"
                                      title={`Llamar por voz/video a ${msg.senderName}`}
                                    >
                                      <Phone className="w-2.5 h-2.5" />
                                      <span>Llamar</span>
                                    </button>
                                  )}
                                </div>

                                {/* Message text body or voice player */}
                                <div
                                  className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                                    isMe
                                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none border border-indigo-500/20'
                                      : (msg.senderId === 'girlfriend'
                                          ? 'bg-gradient-to-br from-rose-950/20 to-rose-900/10 text-rose-100 border border-rose-500/20 rounded-tl-none shadow-[0_0_15px_rgba(244,63,94,0.05)]'
                                          : 'bg-slate-900/60 text-slate-200 border border-slate-800/80 rounded-tl-none')
                                  }`}
                                >
                                  {msg.audioUrl ? (
                                    <div className="space-y-1.5 min-w-[200px]">
                                      <div className="flex items-center gap-1 opacity-80">
                                        <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                                          <span>🎙️</span> Nota de voz
                                        </span>
                                      </div>
                                      <audio 
                                        src={msg.audioUrl} 
                                        controls 
                                        className="w-full h-8 max-w-xs focus:outline-none rounded bg-slate-950/80 border border-slate-800/60"
                                      />
                                    </div>
                                  ) : (
                                    msg.text
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Girlfriend Settings panel (Right side - desktop/large screen) */}
                  {currentRoom === 'novia-ia' && (
                    <div className="w-80 border-l border-slate-900 bg-slate-950/40 p-5 overflow-y-auto hidden lg:flex flex-col space-y-5 shrink-0">
                      {/* Avatar & Relationship Header */}
                      <div className="text-center space-y-3 pb-4 border-b border-slate-900">
                        <div className="relative mx-auto w-24 h-24 rounded-full overflow-hidden border-2 border-rose-500/40 shadow-[0_0_15px_rgba(236,72,153,0.15)] group">
                          {isGeneratingAvatar ? (
                            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center space-y-1 z-10">
                              <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                              <span className="text-[9px] text-rose-400 font-extrabold animate-pulse">Pintando...</span>
                            </div>
                          ) : null}
                          <img
                            src={girlfriendConfig?.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80'}
                            alt={girlfriendConfig?.name || 'Novia'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-100 flex items-center justify-center gap-1">
                            {girlfriendConfig?.name || 'Sofía'} 💖
                          </h3>
                          <p className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                            Pareja Virtual Ideal
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 italic">
                            Humor: {girlfriendConfig?.mood || '¡Muy feliz de verte! 🥰'}
                          </p>
                        </div>
                      </div>

                      {/* Config Form */}
                      <div className="space-y-4 flex-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Personalizar Compañera
                        </div>

                        {/* Name Field */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">Nombre de tu Novia</label>
                          <input
                            type="text"
                            maxLength={20}
                            value={gfEditingName}
                            onChange={(e) => setGfEditingName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            placeholder="Ej. Sofía, Isabella, Luna..."
                          />
                        </div>

                        {/* Personality Field */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">Personalidad</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'cariñosa', label: 'Cariñosa 💕' },
                              { id: 'intelectual', label: 'Intelectual 🧠' },
                              { id: 'divertida', label: 'Divertida 😜' },
                              { id: 'misteriosa', label: 'Misteriosa 🌌' },
                              { id: 'apoyadora', label: 'Apoyadora ⚡' },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setGfEditingPersonality(p.id)}
                                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  gfEditingPersonality === p.id
                                    ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                                    : 'bg-slate-900/40 border-transparent text-slate-500 hover:text-slate-400'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Visual Style Look Field */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">Aspecto / Estilo de Foto</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'anime', label: 'Anime 🌸' },
                              { id: 'realista', label: 'Realista 📸' },
                              { id: 'cyberpunk', label: 'Cyberpunk 👾' },
                              { id: 'gótica', label: 'Gótica 🖤' },
                              { id: 'casual', label: 'Casual ☀️' },
                            ].map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setGfEditingStyle(s.id)}
                                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  gfEditingStyle === s.id
                                    ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                                    : 'bg-slate-900/40 border-transparent text-slate-500 hover:text-slate-400'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-2 pt-4 border-t border-slate-900 shrink-0">
                        <button
                          type="button"
                          onClick={handleSaveGirlfriendConfig}
                          className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-[11px] transition-all cursor-pointer shadow-md shadow-indigo-500/5 flex items-center justify-center gap-1.5"
                        >
                          <span>Guardar Cambios 💾</span>
                        </button>
                        <button
                          type="button"
                          disabled={isGeneratingAvatar}
                          onClick={handleGenerateGfAvatar}
                          className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white font-extrabold rounded-xl text-[11px] transition-all cursor-pointer shadow-md shadow-rose-500/5 flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                          <span>Generar Foto con IA ✨</span>
                        </button>
                        <p className="text-[9px] text-slate-500 text-center leading-normal">
                          Usa Gemini para pintar un retrato 1:1 único basado en su estilo y nombre.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile rooms switcher scrollable strip (only visible on mobile screens) */}
                <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-2 border-t border-slate-900 bg-slate-950 shrink-0">
                  {STATIC_ROOMS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => joinRoom(r.id)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 border ${
                        currentRoom === r.id 
                          ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                          : 'bg-slate-900 border-transparent text-slate-400'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>

                {/* Dispatch Input Box form */}
                <div className="p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur shrink-0 flex flex-col gap-2">
                  {isRecording ? (
                    <div className="flex items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl py-2.5 px-4 animate-pulse">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                        <span className="text-rose-400 font-extrabold text-xs">Grabando nota de voz</span>
                        <span className="text-slate-400 text-xs font-mono">[{recordingSeconds}s]</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => stopRecording(true)}
                          className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-rose-400 hover:text-rose-300 font-bold text-xs cursor-pointer transition-all"
                          title="Descartar grabación"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => stopRecording(false)}
                          className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 rounded-xl text-white font-extrabold text-xs cursor-pointer transition-all flex items-center gap-1"
                          title="Enviar nota de voz"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Enviar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSendMessage}
                      className="flex gap-2"
                    >
                      <button
                        type="button"
                        onClick={startRecording}
                        className="p-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400 rounded-2xl transition-all cursor-pointer flex items-center justify-center aspect-square"
                        title="Grabar mensaje de voz"
                      >
                        <Mic className="w-4 h-4 text-indigo-400" />
                      </button>

                      <button
                        type="button"
                        onClick={handleChatScreenShare}
                        className={`p-3 border rounded-2xl transition-all cursor-pointer flex items-center justify-center aspect-square ${
                          isScreenSharing 
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25' 
                            : 'bg-slate-900 border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400'
                        }`}
                        title={isScreenSharing ? "Detener de compartir pantalla" : "Compartir pantalla"}
                      >
                        <ScreenShare className="w-4 h-4" />
                      </button>
                      
                      <input
                        type="text"
                        maxLength={1000}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl py-3 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs"
                        placeholder={currentRoom === 'novia-ia' ? (girlfriendConfig ? `Escríbele algo lindo a ${girlfriendConfig.name}...` : "Escríbele algo lindo...") : "Escribe un mensaje anónimo..."}
                      />
                      
                      <button
                        type="submit"
                        disabled={!messageInput.trim()}
                        className={`p-3 rounded-2xl text-white font-bold transition-all shrink-0 shadow-lg cursor-pointer flex items-center justify-center aspect-square ${
                          messageInput.trim() 
                            ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] shadow-indigo-500/10' 
                            : 'bg-slate-900 text-slate-600 border border-slate-800/80 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>

              </motion.div>

            )}

          </AnimatePresence>

        </main>
      </div>

      {/* VIRTUAL GIRLFRIEND CUSTOMIZATION MODAL (MOBILE) */}
      <AnimatePresence>
        {showGfConfigModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(236,72,153,0.15)] flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                  <span className="text-xs font-bold text-slate-200">Personalizar Compañera Virtual</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGfConfigModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Avatar Display */}
                <div className="flex items-center gap-4 pb-4 border-b border-slate-800 shrink-0">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-rose-500/40 shrink-0">
                    {isGeneratingAvatar && (
                      <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center z-10">
                        <RefreshCw className="w-4 h-4 text-rose-500 animate-spin" />
                      </div>
                    )}
                    <img
                      src={girlfriendConfig?.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80'}
                      alt={girlfriendConfig?.name || 'Novia'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-100">{girlfriendConfig?.name || 'Sofía'} 💖</h3>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">Humor: {girlfriendConfig?.mood || '¡Muy feliz de verte! 🥰'}</p>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Nombre de tu Novia</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={gfEditingName}
                      onChange={(e) => setGfEditingName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Personalidad</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'cariñosa', label: 'Cariñosa 💕' },
                        { id: 'intelectual', label: 'Intelectual 🧠' },
                        { id: 'divertida', label: 'Divertida 😜' },
                        { id: 'misteriosa', label: 'Misteriosa 🌌' },
                        { id: 'apoyadora', label: 'Apoyadora ⚡' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setGfEditingPersonality(p.id)}
                          className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            gfEditingPersonality === p.id
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                              : 'bg-slate-950 border-transparent text-slate-500'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Aspecto / Estilo de Foto</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'anime', label: 'Anime 🌸' },
                        { id: 'realista', label: 'Realista 📸' },
                        { id: 'cyberpunk', label: 'Cyberpunk 👾' },
                        { id: 'gótica', label: 'Gótica 🖤' },
                        { id: 'casual', label: 'Casual ☀️' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setGfEditingStyle(s.id)}
                          className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            gfEditingStyle === s.id
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                              : 'bg-slate-950 border-transparent text-slate-500'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveGirlfriendConfig();
                    setShowGfConfigModal(false);
                  }}
                  className="w-full py-2 px-3 bg-indigo-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Guardar Cambios 💾</span>
                </button>
                <button
                  type="button"
                  disabled={isGeneratingAvatar}
                  onClick={handleGenerateGfAvatar}
                  className="w-full py-2 px-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                  <span>Generar Foto con IA ✨</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREMIUM CHECKOUT MODAL */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.15)] flex flex-col"
            >
              {/* Header block with cyberpunk glowing badge */}
              <div className="p-6 pb-4 border-b border-slate-800 text-center relative overflow-hidden bg-gradient-to-b from-rose-500/10 to-transparent">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                <div className="w-12 h-12 rounded-2xl mx-auto bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 animate-pulse mb-3 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-100 font-mono tracking-wider uppercase">
                  🔒 RADAR MATCH PREMIUM
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Encuentra coincidencias según orientación sexual sin límites
                </p>
              </div>

              {/* Form & details */}
              <div className="p-6 space-y-4 flex-1">
                {!paymentSuccess ? (
                  <>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300">
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        No encontramos coincidencias gratuitas que se adapten a tu preferencia de orientación en este momento. Desbloquea el **Radar VIP** para acceder a perfiles de simulación exclusivos y emparejamiento premium de alta prioridad.
                      </p>
                      <ul className="space-y-1.5 pt-2 border-t border-slate-900/60 text-[11px]">
                        <li className="flex items-center gap-2 text-rose-400">
                          <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                          <span>Filtro de orientación activo 24/7</span>
                        </li>
                        <li className="flex items-center gap-2 text-indigo-400">
                          <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                          <span>Emparejamiento Prioritario Automático</span>
                        </li>
                        <li className="flex items-center gap-2 text-emerald-400">
                          <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                          <span>Acceso a anfitriones de video Premium VIP</span>
                        </li>
                      </ul>
                    </div>

                    {/* Simulated payment form */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Número de Tarjeta (Simulado)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              // Autoformat simple spaces
                              const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                              const matches = v.match(/\d{4,16}/g);
                              const match = (matches && matches[0]) || '';
                              const parts = [];

                              for (let i = 0, len = match.length; i < len; i += 4) {
                                parts.push(match.substring(i, i + 4));
                              }

                              if (parts.length > 0) {
                                setCardNumber(parts.join(' '));
                              } else {
                                setCardNumber(v);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 pl-9 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                            placeholder="4000 1234 5678 9010"
                          />
                          <CreditCard className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            Vencimiento
                          </label>
                          <input
                            type="text"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              if (v.length >= 2) {
                                setCardExpiry(v.substring(0, 2) + '/' + v.substring(2, 4));
                              } else {
                                setCardExpiry(v);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs text-center"
                            placeholder="MM/AA"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            CVC
                          </label>
                          <input
                            type="password"
                            maxLength={3}
                            value={cardCVC}
                            onChange={(e) => setCardCVC(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs text-center"
                            placeholder="123"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      disabled={isProcessingPayment || cardNumber.length < 15 || cardExpiry.length < 5 || cardCVC.length < 3}
                      onClick={() => {
                        setIsProcessingPayment(true);
                        playInteractionMode('click');
                        setTimeout(() => {
                          setIsProcessingPayment(false);
                          setPaymentSuccess(true);
                          setIsPremium(true);
                          playNotificationSound('join');
                        }, 1800);
                      }}
                      className="w-full mt-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10"
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          <span>Procesando Pago Seguro...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Activar Premium - $4.99/mes</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  // Success Message
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6 space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full mx-auto bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest font-mono">
                        ¡COMPRA CONFIRMADA!
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Has desbloqueado exitosamente las funciones Premium. El radar VIP ahora está activo y priorizará tu búsqueda con anfitriones exclusivos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPremiumModal(false);
                        setPaymentSuccess(false);
                        setCardNumber('');
                        setCardExpiry('');
                        setCardCVC('');
                        // Automatically restart match search now as a premium user!
                        startRandomMatch();
                      }}
                      className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl cursor-pointer transition-all uppercase text-xs tracking-wider inline-block"
                    >
                      Buscar Coincidencias Premium
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Close footer */}
              {!isProcessingPayment && !paymentSuccess && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPremiumModal(false);
                      playInteractionMode('click');
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-400 uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Volver al Chat General
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
