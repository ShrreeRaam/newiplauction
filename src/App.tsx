import { useState, useEffect } from 'react';
import socket from './lib/socket';
import { cn, formatPrice } from './lib/utils';
import { Player } from './players';
import { Trophy, Users, Timer, Gavel, Copy, Play, SkipForward, IndianRupee, Pause, List, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';

const TEAM_LOGOS: Record<string, string> = {
  CSK: "https://scores.iplt20.com/ipl/teamlogos/CSK.png",
  MI: "https://scores.iplt20.com/ipl/teamlogos/MI.png",
  RCB: "https://scores.iplt20.com/ipl/teamlogos/RCB.png",
  KKR: "https://scores.iplt20.com/ipl/teamlogos/KKR.png",
  SRH: "https://scores.iplt20.com/ipl/teamlogos/SRH.png",
  GT: "https://scores.iplt20.com/ipl/teamlogos/GT.png",
  RR: "https://scores.iplt20.com/ipl/teamlogos/RR.png",
  LSG: "https://scores.iplt20.com/ipl/teamlogos/LSG.png",
  DC: "https://scores.iplt20.com/ipl/teamlogos/DC.png",
  PBKS: "https://scores.iplt20.com/ipl/teamlogos/PBKS.png",
};

const TEAM_MESH: Record<string, { color1: string; color2: string; color3: string }> = {
  CSK: { color1: "bg-[#FCCD04]", color2: "bg-[#0081E9]", color3: "bg-[#FF822A]" }, // Yellow, Blue, Orange
  MI: { color1: "bg-[#004BA0]", color2: "bg-[#87CEEB]", color3: "bg-[#D1AB3E]" }, // Blue, Light Blue, Gold
  RCB: { color1: "bg-[#DA291C]", color2: "bg-[#8B0000]", color3: "bg-[#D1AB3E]" }, // Red, Dark Red, Gold
  KKR: { color1: "bg-[#3A225D]", color2: "bg-[#800080]", color3: "bg-[#F7D54E]" }, // Purple, Deep Purple, Gold
  SRH: { color1: "bg-[#EB5925]", color2: "bg-[#FF4500]", color3: "bg-[#FFD700]" }, // Saffron, Orange-Red, Gold
  RR: { color1: "bg-[#EA1B85]", color2: "bg-[#17449E]", color3: "bg-[#FF69B4]" },  // Pink, Navy, Hot Pink
  LSG: { color1: "bg-[#00377B]", color2: "bg-[#D2222D]", color3: "bg-[#87CEEB]" }, // Sky Blue, Red, Light Blue
  GT: { color1: "bg-[#1B2133]", color2: "bg-[#BFA461]", color3: "bg-[#4682B4]" },  // Navy, Gold, Steel Blue
  DC: { color1: "bg-[#004C93]", color2: "bg-[#F83430]", color3: "bg-[#1E90FF]" },  // Blue, Red, Dodger Blue
  PBKS: { color1: "bg-[#DD1E2F]", color2: "bg-[#E3E3E3]", color3: "bg-[#FF6347]" }, // Red, Silver, Tomato
};

const TEAM_COLORS: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
  CSK: { bg: "bg-theme-CSK", text: "text-slate-900", border: "border-[#F25C19]", shadow: "shadow-[0_0_40px_rgba(252,205,4,0.6)]" },
  MI: { bg: "bg-theme-MI", text: "text-white", border: "border-[#D4AF37]", shadow: "shadow-[0_0_40px_rgba(0,75,160,0.6)]" },
  KKR: { bg: "bg-theme-KKR", text: "text-[#D4AF37]", border: "border-[#D4AF37]", shadow: "shadow-[0_0_40px_rgba(92,34,136,0.6)]" },
  RCB: { bg: "bg-theme-RCB", text: "text-white", border: "border-[#000000]", shadow: "shadow-[0_0_40px_rgba(218,41,28,0.6)]" },
  RR: { bg: "bg-theme-RR", text: "text-white", border: "border-[#004BA0]", shadow: "shadow-[0_0_40px_rgba(234,27,133,0.6)]" },
  SRH: { bg: "bg-theme-SRH", text: "text-slate-900", border: "border-[#000000]", shadow: "shadow-[0_0_40px_rgba(235,89,37,0.6)]" },
  DC: { bg: "bg-theme-DC", text: "text-white", border: "border-[#EF4123]", shadow: "shadow-[0_0_40px_rgba(0,76,147,0.6)]" },
  PBKS: { bg: "bg-theme-PBKS", text: "text-white", border: "border-[#D1D3D4]", shadow: "shadow-[0_0_40px_rgba(221,30,47,0.6)]" },
  GT: { bg: "bg-theme-GT", text: "text-[#CBA92B]", border: "border-[#CBA92B]", shadow: "shadow-[0_0_40px_rgba(27,33,51,0.6)]" },
  LSG: { bg: "bg-theme-LSG", text: "text-white", border: "border-[#0057A3]", shadow: "shadow-[0_0_40px_rgba(0,87,163,0.6)]" },
  Unsold: { bg: "bg-theme-Unsold", text: "text-slate-100", border: "border-slate-500", shadow: "shadow-[0_0_40px_rgba(100,116,139,0.4)]" }
};
export default function App() {
  const [view, setView] = useState<'lobby' | 'auction' | 'squads' | 'upcoming'>('lobby');
  const [selectedSquadTeam, setSelectedSquadTeam] = useState<string | null>(null);
  const [roomId, setRoomId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [selectedMode, setSelectedMode] = useState<'2025' | 'legends'>('2025');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [bidError, setBidError] = useState('');
  const [username, setUsername] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [gameState, setGameState] = useState<{
    currentPlayer: Player | null;
    players: Player[];
    currentBid: number;
    highestBidder: string | null;
    timer: number;
    soldPlayers: { player: Player; team: string; price: number }[];
    teams: Record<string, { purse: number; players: Player[] }>;
    teamOwners: Record<string, string>;
    usernames: Record<string, string>;
    currentBidLog: { team: string; price: number }[];
    playerIndex: number;
    totalPlayers: number;
    isStarted: boolean;
    isPaused: boolean;
    mode: '2025' | 'legends';
    availableSets: string[];
    currentSet: string | null;
    allPlayers?: Player[];
  }>({
    currentPlayer: null,
    players: [],
    currentBid: 0,
    highestBidder: null,
    timer: 30,
    soldPlayers: [],
    teams: {},
    teamOwners: {},
    usernames: {},
    currentBidLog: [],
    playerIndex: -1,
    totalPlayers: 0,
    isStarted: false,
    isPaused: false,
    mode: '2025',
    availableSets: [],
    currentSet: null,
  });

  const [showSoldOverlay, setShowSoldOverlay] = useState(false);
  const [lastSoldPlayer, setLastSoldPlayer] = useState<any>(null);
  const [bidFlash, setBidFlash] = useState(false);

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthChecked(true);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on('roomCreated', ({ roomId }) => {
      setRoomId(roomId);
      setIsAdmin(true);
      setView('auction');
    });

    socket.on('joinAuction', (state) => {
      setGameState(state);
      setRoomId(state.roomId);
      setIsAdmin(state.adminId === socket.id);
      setView('auction');
    });

    socket.on('playerUpdate', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
      setBidError('');
    });

    socket.on('newBid', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
    });

    socket.on('timerUpdate', ({ timer }) => {
      setGameState(prev => ({ ...prev, timer }));
    });

    socket.on('purseUpdate', (teams) => {
      setGameState(prev => ({ ...prev, teams }));
    });

    socket.on('soldPlayers', (soldPlayers) => {
      setGameState(prev => ({ ...prev, soldPlayers }));
    });

    socket.on('teamUpdate', ({ teamOwners, usernames }) => {
      setGameState(prev => ({ ...prev, teamOwners, usernames }));
    });
    
    socket.on('notification', ({ message }) => {
      setNotification(message);
      setTimeout(() => setNotification(null), 3000);
    });

    socket.on('bidError', ({ message }) => {
      setBidError(message);
      setTimeout(() => setBidError(''), 3000);
    });

    socket.on('playerSold', (data) => {
      setGameState(prev => ({ ...prev, ...data.gameState }));
      setLastSoldPlayer({ ...data.player, team: data.team, price: data.price });
      setShowSoldOverlay(true);
      setTimeout(() => setShowSoldOverlay(false), 3000);
    });

    socket.on('bidUpdated', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 500);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    socket.on('adminChanged', ({ isAdmin }) => {
      setIsAdmin(isAdmin);
    });

    socket.on('auctionPaused', ({ isPaused }) => {
      setGameState(prev => ({ ...prev, isPaused }));
    });

    socket.on('setUpdated', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
    });

    socket.on('auctionComplete', () => {
      setGameState(prev => ({ ...prev, players: [], currentPlayer: null, isStarted: false }));
    });

    return () => {
      socket.off('roomCreated');
      socket.off('joinAuction');
      socket.off('playerUpdate');
      socket.off('newBid');
      socket.off('timerUpdate');
      socket.off('purseUpdate');
      socket.off('soldPlayers');
      socket.off('teamUpdate');
      socket.off('bidError');
      socket.off('error');
      socket.off('adminChanged');
      socket.off('auctionPaused');
      socket.off('playerSold');
      socket.off('bidUpdated');
    };
  }, []);

    const handleGoogleLogin = async () => {
    if (!supabase) return setError('Supabase not configured in .env');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    socket.emit('createRoom', { mode: selectedMode, username, userId: user?.id });
  };
  
  const handleJoinRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (joinId.length === 4) {
      socket.emit('joinRoom', { roomId: joinId, username, userId: user?.id });
    } else {
      setError('Enter a 4-digit Room ID');
    }
  };

  const handleSelectTeam = (team: string) => {
    socket.emit('selectTeam', { team, roomId, userId: user?.id });
  };

  const handleBid = () => {
    socket.emit('bid', { roomId, userId: user?.id });
  };

  const handleSelectSet = (setId: string) => {
    socket.emit('admin:selectSet', { roomId, setId });
  };

  const handleStart = () => {
    socket.emit('admin:startAuction', { roomId });
  };

  const handleNext = () => {
    socket.emit('admin:nextPlayer', { roomId });
  };

  const handlePause = () => {
    socket.emit('admin:pauseAuction', { roomId });
  };

  const getIncrement = (price: number) => {
    if (price < 10000000) return 500000;
    if (price < 20000000) return 1000000;
    if (price < 50000000) return 2000000;
    return 2500000;
  };

  const nextBidAmount = gameState.currentBid === 0 
    ? (gameState.currentPlayer?.basePrice || 0) 
    : gameState.currentBid + getIncrement(gameState.currentBid);

  const myTeam = Object.keys(gameState.teamOwners || {}).find(t => gameState.teamOwners?.[t] === socket.id);
  const myPurse = myTeam ? gameState.teams?.[myTeam]?.purse : 0;
  const canAfford = myPurse >= nextBidAmount;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading Auction Simulator...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Indian_Premier_League_Official_Logo.svg/1200px-Indian_Premier_League_Official_Logo.svg.png')" }}>
        <div className="absolute inset-0 bg-slate-50/70 z-0"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-900/30 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/30 blur-[120px] pointer-events-none"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-8 glass-card rounded-2xl p-8 relative z-10"
        >
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-4 bg-white/60 border border-white/80 shadow-sm text-slate-900 rounded-full">
                <Gavel className="w-12 h-12 text-slate-900 font-semibold " />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">IPL Auction</h1>
            <p className="text-slate-500">Sign in to join the mega event</p>
          </div>

          <div className="space-y-6">
            <button onClick={handleGoogleLogin} className="w-full py-4 bg-white/60 border border-white/80 hover:bg-white text-slate-900 shadow-sm font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-4 group">
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}
          </div>
          
          <div className="pt-6 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Secure Authentication via Supabase</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Indian_Premier_League_Official_Logo.svg/1200px-Indian_Premier_League_Official_Logo.svg.png')" }}>
        <div className="absolute inset-0 bg-slate-50/70 z-0"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-900/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 glass-card rounded-2xl p-8 relative z-10"
        >
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-4 bg-white/60 border border-white/80 shadow-sm text-slate-900 rounded-full">
                <Gavel className="w-12 h-12 text-slate-900 font-semibold " />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">IPL Auction</h1>
            <p className="text-slate-500">Real-time bidding with friends</p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/40 border border-white/60 p-4 rounded-xl shadow-sm">
                 <div className="text-sm">
                   <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Signed In As</span>
                   <span className="font-bold text-lg text-slate-900">{user.user_metadata?.full_name || user.email}</span>
                 </div>
                 <button onClick={handleLogout} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-bold transition-colors">Sign Out</button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest px-1">Your Name</label>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/40 border border-white/60 rounded-xl px-4 py-3 text-center text-lg focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedMode('2025')}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center space-y-1",
                    selectedMode === '2025' 
                      ? "border-orange-500 bg-orange-50/50 text-orange-900" 
                      : "border-white/20 bg-white/20 text-slate-500 hover:border-slate-300"
                  )}
                >
                  <div className="font-bold text-sm">IPL 2025</div>
                  <div className="text-[10px] opacity-70">Mega Auction</div>
                </button>
                <button
                  onClick={() => setSelectedMode('legends')}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center space-y-1",
                    selectedMode === 'legends' 
                      ? "border-blue-500 bg-blue-50/50 text-blue-900" 
                      : "border-white/20 bg-white/20 text-slate-500 hover:border-slate-300"
                  )}
                >
                  <div className="font-bold text-sm">LEGENDS</div>
                  <div className="text-[10px] opacity-70">2020 - 2026</div>
                </button>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Play className="w-5 h-5" />
                Create New Room
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/60 px-2 text-slate-500 font-bold backdrop-blur-sm rounded-full">OR</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="4-digit ID"
                  maxLength={4}
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="flex-1 bg-white/40 border border-white/60 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-[0.5em] focus:outline-none focus:border-zinc-700 transition-colors"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-6 bg-slate-900 text-white font-bold rounded-xl transition-all active:scale-95 hover:bg-slate-800"
                >
                  Join
                </button>
              </div>
              {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen p-4 md:p-6 lg:p-8 relative overflow-hidden bg-slate-50 text-slate-900")}>
      
      {/* Apple-style Mesh Gradient (Liquid Silk) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[160px] opacity-40 mix-blend-multiply transition-colors duration-1000",
          myTeam ? TEAM_MESH[myTeam]?.color1 : "bg-zinc-200"
        )}></div>
        <div className={cn(
          "absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-40 mix-blend-multiply transition-colors duration-1000",
          myTeam ? TEAM_MESH[myTeam]?.color2 : "bg-zinc-300"
        )}></div>
        <div className={cn(
          "absolute top-[20%] left-[30%] w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-30 mix-blend-multiply transition-colors duration-1000",
          myTeam ? TEAM_MESH[myTeam]?.color3 : "bg-zinc-100"
        )}></div>
      </div>
      
      <div className="relative z-10">
        {/* Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 border border-white/10"
            >
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header with Mode and Room ID */}
        <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4 glass-card rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/60 border border-white/80 shadow-sm text-slate-900 rounded-xl">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {gameState.mode === 'legends' ? "IPL Legends Auction" : "IPL 2025 Mega Auction"}
              </h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                {gameState.mode === 'legends' ? "Players from 2020 - 2026" : "Official 2025 & 2026 Registered Players"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/40 border border-white/60 rounded-xl flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase">Room ID:</span>
              <span className="text-lg font-mono font-bold text-slate-900">{roomId}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <Copy className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="max-w-7xl mx-auto mb-6 flex gap-2 glass-card rounded-2xl p-1 border border-white/10">
          <button
            onClick={() => setView('auction')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'auction' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Auction Room
          </button>
          <button
            onClick={() => setView('upcoming')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'upcoming' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <SkipForward className="w-4 h-4" />
            Upcoming Players
          </button>
          <button
            onClick={() => setView('squads')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'squads' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Users className="w-4 h-4" />
            Team Squads
          </button>
        </nav>

        {view === 'auction' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Panel: Admin Controls, Current Player & Owners */}
              <div className="lg:col-span-3 space-y-6">
                {isAdmin && (
                  <section className="glass-card p-6 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Gavel className="w-4 h-4" />
                      Admin Controls
                    </h3>
                    {!gameState.isStarted ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Player Set</label>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {(gameState.availableSets || []).map(set => (
                              <button
                                key={set}
                                onClick={() => handleSelectSet(set)}
                                className={cn(
                                  "p-2 text-[10px] font-bold rounded-lg border transition-all",
                                  gameState.currentSet === set 
                                    ? "bg-slate-900 text-white border-slate-900" 
                                    : "bg-white/40 border-white/60 text-slate-700 hover:bg-white"
                                )}
                              >
                                SET {set}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handleStart}
                          disabled={!gameState.currentSet}
                          className="w-full py-3 bg-gradient-to-r from-orange-500 to-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                        >
                          Start {gameState.currentSet ? `Set ${gameState.currentSet}` : "Auction"}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handlePause}
                          className="py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          {gameState.isPaused ? "Resume" : "Pause"}
                        </button>
                        <button
                          onClick={handleNext}
                          className="py-3 bg-white/60 border border-white/80 text-slate-900 font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <SkipForward className="w-4 h-4" />
                          Next
                        </button>
                      </div>
                    )}
                  </section>
                )}

                <section className={cn(
                  "glass-card p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden transition-all duration-500",
                  gameState.highestBidder ? TEAM_COLORS[gameState.highestBidder]?.shadow : "shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                )}>
                  <h3 className="w-full text-left text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Current Player</h3>
                  
                  <AnimatePresence mode="wait">
                    {gameState.currentPlayer ? (
                      <motion.div 
                        key={gameState.currentPlayer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4 w-full"
                      >
                        <div className="relative mx-auto">
                          <div className={cn(
                            "w-32 h-32 glass-card rounded-full flex items-center justify-center text-4xl font-bold text-slate-900 font-semibold overflow-hidden transition-all duration-500",
                            gameState.highestBidder ? TEAM_COLORS[gameState.highestBidder]?.shadow : ""
                          )}>
                            {gameState.currentPlayer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          {gameState.timer === 0 && (
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all text-slate-900 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                              Sold
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                            {gameState.currentPlayer.name}
                            {gameState.currentPlayer.isOverseas && <span className="text-lg" title="Overseas Player">✈️</span>}
                          </h2>
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2",
                            gameState.currentPlayer.role === 'BATSMAN' && "bg-red-500/20 text-red-500",
                            gameState.currentPlayer.role === 'BOWLER' && "bg-green-500/20 text-green-500",
                            gameState.currentPlayer.role === 'ALL_ROUNDER' && "bg-yellow-500/20 text-yellow-500",
                            gameState.currentPlayer.role === 'WICKET_KEEPER' && "bg-blue-500/20 text-blue-500",
                          )}>
                            {gameState.currentPlayer.role.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="pt-4 space-y-1">
                          <p className="text-xs text-slate-700 uppercase font-bold">Base Price</p>
                          <p className="text-xl font-bold text-slate-900 flex items-center justify-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            {formatPrice(gameState.currentPlayer.basePrice)}
                          </p>
                        </div>

                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-4">
                          Player {gameState.playerIndex + 1} of {gameState.totalPlayers}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm py-12">
                        {gameState.isStarted ? "Auction Complete" : "Waiting for auction to start..."}
                      </div>
                    )}
                  </AnimatePresence>
                </section>

                {/* Team Owners */}
                <section className="glass-card rounded-2xl p-6 rounded-2xl border border-white/5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Owners
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {Object.entries(gameState.teamOwners || {}).length > 0 ? (
                      Object.entries(gameState.teamOwners || {}).map(([team, ownerId]) => (
                        <div key={team} className="flex items-center justify-between p-3 bg-white/40 border border-white/60 rounded-xl rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <img src={TEAM_LOGOS[team]} alt={team} className="w-6 h-6 object-contain" />
                            <span className="font-bold text-sm">{team}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900 font-semibold  truncate max-w-[120px] text-right">
                            {gameState.usernames?.[ownerId as string] || "Unknown"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic text-xs text-center py-4">No teams selected yet.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* Center Panel: Bidding & Timer */}
              <div className="lg:col-span-6 space-y-6">
                <section className="glass-card p-6 rounded-2xl space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Bid</h3>
                      <div className={cn(
                        "text-5xl font-black text-slate-900 font-semibold  flex items-center gap-2 transition-all duration-300",
                        bidFlash ? "scale-110 text-slate-900" : "scale-100"
                      )}>
                        <IndianRupee className="w-10 h-10" />
                        {formatPrice(gameState.currentBid === 0 ? (gameState.currentPlayer?.basePrice || 0) : gameState.currentBid)}
                      </div>
                      <p className="text-sm text-slate-500">
                        Highest Bidder: <span className="text-slate-900 font-bold">{gameState.highestBidder || "—"}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Timer className={cn("w-5 h-5", gameState.timer <= 10 ? "text-red-500 animate-pulse" : "text-yellow-500")} />
                        <span className={cn("text-3xl font-black font-mono", gameState.timer <= 10 ? "text-red-500" : "text-slate-900")}>
                          {gameState.timer}s
                        </span>
                      </div>
                      <div className="w-32 h-2 bg-white/40 border border-white/60 rounded-xl rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: "100%" }}
                          animate={{ width: `${(gameState.timer / 30) * 100}%` }}
                          className={cn("h-full", gameState.timer <= 10 ? "bg-red-500" : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bid Log */}
                  <div className="bg-white/40 border border-white/60 rounded-xl rounded-xl p-4 h-32 overflow-y-auto border border-white/5 custom-scrollbar">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Bid History</h4>
                    <div className="space-y-2">
                      {gameState.currentBidLog.length > 0 ? (
                        gameState.currentBidLog.slice().reverse().map((bid, i) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-900">{bid.team}</span>
                            <span className="text-slate-900 font-semibold  font-mono">{formatPrice(bid.price)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">No bids yet</p>
                      )}
                    </div>
                  </div>

                  {/* Bidding Controls */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Your Team</label>
                        <select 
                          value={myTeam || ""}
                          onChange={(e) => handleSelectTeam(e.target.value)}
                          disabled={!!myTeam}
                          className="w-full bg-white/40 border border-white/60 rounded-xl border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-700 disabled:opacity-50"
                        >
                          <option value="" className="bg-white text-slate-900">— Select Team —</option>
                          {Object.keys(gameState.teams || {}).map(team => {
                            const ownerSocketId = gameState.teamOwners?.[team];
                            const ownerName = ownerSocketId ? gameState.usernames?.[ownerSocketId] : null;
                            return (
                              <option key={team} value={team} className="bg-white text-slate-900" disabled={!!ownerSocketId && ownerSocketId !== socket.id}>
                                {team} {ownerName && ownerSocketId !== socket.id ? `(${ownerName})` : ""}
                                {ownerSocketId === socket.id ? " (My Team)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleBid}
                          disabled={!myTeam || !gameState.isStarted || gameState.timer === 0 || !canAfford}
                          className="w-full h-[46px] bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 shadow-md text-slate-900 font-black rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                        >
                          {!canAfford ? "Insufficient Purse" : "Place Bid"}
                        </button>
                      </div>
                    </div>
                    {bidError && <p className="text-red-500 text-xs text-center font-bold">{bidError}</p>}
                  </div>
                </section>
              </div>

              {/* Right Panel: Team Purses */}
              <div className="lg:col-span-3 space-y-6">
                <section className="glass-card p-6 rounded-2xl h-full">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Team Purses
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(gameState.teams || {}).map(([name, data]: [string, any]) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 border border-white/60 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={TEAM_LOGOS[name]} alt={name} className="w-6 h-6 object-contain" />
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{name}</span>
                            <span className="text-[10px] text-slate-500">
                              {data.players.length}/25 ({data.players.filter((p: any) => p.isOverseas).length} ✈️)
                            </span>
                          </div>
                        </div>
                        <span className="text-slate-900 font-semibold  font-mono text-sm font-bold">{formatPrice(data.purse)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* Bottom Panel: Sold Players */}
            <section className="glass-card p-6 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Sold Players
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(gameState.soldPlayers || []).length > 0 ? (
                  (gameState.soldPlayers || []).slice().reverse().map((sold, i) => (
                    <div key={i} className={cn("glass-card p-4 rounded-xl flex items-center gap-4 transition-all duration-300 hover:scale-[1.02]", TEAM_COLORS[sold.team]?.shadow || "")}>
                      <div className="w-10 h-10 rounded-full glass-card rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <span className="text-[10px] font-bold text-slate-500">
                          {sold.player.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{sold.player.name}</p>
                        <p className={cn("text-[10px] font-black uppercase", sold.team === 'Unsold' ? 'text-red-500' : 'text-slate-500')}>
                          {sold.team}
                        </p>
                      </div>
                      {sold.team !== 'Unsold' && (
                        <div className="text-right">
                          <p className="text-slate-900 font-semibold  font-mono text-xs font-bold">{formatPrice(sold.price)}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center text-slate-500 italic text-sm py-4">No players sold yet</p>
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'upcoming' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {(() => {
              const currentSetRemaining = gameState.players.slice(gameState.playerIndex + 1);
              const upcomingSetPlayers = (gameState.allPlayers || []).filter(p => gameState.availableSets.includes(p.set || ''));
              const allUpcoming = [...currentSetRemaining, ...upcomingSetPlayers];
              
              const groupedPlayers: Record<string, any[]> = {};
              
              if (gameState.currentSet && currentSetRemaining.length > 0) {
                  groupedPlayers[gameState.currentSet] = currentSetRemaining;
              }

              upcomingSetPlayers.forEach(p => {
                 const set = p.set || 'Uncategorized';
                 if (!groupedPlayers[set]) groupedPlayers[set] = [];
                 groupedPlayers[set].push(p);
              });

              const sortedSets = Object.keys(groupedPlayers).sort();
              if (gameState.currentSet && sortedSets.includes(gameState.currentSet)) {
                 sortedSets.splice(sortedSets.indexOf(gameState.currentSet), 1);
                 sortedSets.unshift(gameState.currentSet);
              }

              return (
                <div className="glass-card rounded-2xl p-6 rounded-2xl border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <SkipForward className="w-6 h-6 text-slate-900 font-semibold " />
                      Upcoming Players
                    </h3>
                    <p className="text-sm text-slate-500">
                      {allUpcoming.length} players remaining
                    </p>
                  </div>
                  
                  <div className="space-y-8">
                    {sortedSets.map(set => (
                       <div key={set} className="space-y-4">
                         <h4 className="text-lg font-black text-slate-900 border-b border-white/5 pb-2 flex items-center justify-between">
                           <span>SET {set}</span>
                           {set === gameState.currentSet && <span className="text-[10px] bg-[#00d4aa]/20 text-slate-900 font-semibold  px-2 py-1 rounded-full uppercase tracking-widest">Active Set</span>}
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {groupedPlayers[set].map((player) => (
                              <div key={player.id} className="glass-interactive glass-card p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full glass-card rounded-2xl border border-white/5 flex items-center justify-center font-bold text-slate-900 font-semibold ">
                                    {player.name.split(' ').map((n: string) => n[0]).join('')}
                                  </div>
                                  <div>
                                    <p className="font-bold">{player.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{player.role.replace('_', ' ')}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-700 uppercase font-bold">Base</p>
                                  <p className="text-sm font-bold">{formatPrice(player.basePrice)}</p>
                                </div>
                              </div>
                           ))}
                         </div>
                       </div>
                    ))}
                    {allUpcoming.length === 0 && (
                      <p className="text-center text-slate-500 py-8 italic">No more players in the pool.</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {view === 'squads' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Object.keys(gameState.teams || {}).map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedSquadTeam(team)}
                  className={cn(
                    "p-4 rounded-xl transition-all flex flex-col items-center gap-2",
                    selectedSquadTeam === team 
                      ? cn("glass-card border-none scale-105 relative z-10", TEAM_COLORS[team]?.shadow || "shadow-[0_0_40px_rgba(0,0,0,0.1)]") 
                      : "glass-card border-white/10 text-slate-900 hover:border-white/30 hover:shadow-[0_0_30px_rgba(0,0,0,0.05)]"
                  )}
                >
                  <img src={TEAM_LOGOS[team]} alt={team} className="w-12 h-12 object-contain" />
                  <span className="font-bold text-sm">{team}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase",
                    selectedSquadTeam === team ? "text-slate-900/70" : "text-slate-500"
                  )}>
                    {gameState.teams?.[team]?.players?.length || 0} Players
                  </span>
                </button>
              ))}
            </div>

            {selectedSquadTeam && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6 rounded-2xl border border-white/5 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-4">
                    <img src={TEAM_LOGOS[selectedSquadTeam]} alt={selectedSquadTeam} className="w-16 h-16 object-contain" />
                    <div>
                      <h3 className="text-2xl font-bold">{selectedSquadTeam} Squad</h3>
                      <p className="text-slate-500">Remaining Purse: <span className="text-slate-900 font-semibold  font-bold">{formatPrice(gameState.teams?.[selectedSquadTeam]?.purse || 0)}</span></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gameState.soldPlayers
                    .filter(p => p.team === selectedSquadTeam)
                    .map((sold, i) => (
                      <div key={i} className={cn("glass-card p-4 rounded-xl flex items-center justify-between transition-all duration-300 hover:scale-[1.02]", TEAM_COLORS[sold.team]?.shadow || "")}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full glass-card rounded-2xl border border-white/5 flex items-center justify-center font-bold text-slate-900 font-semibold ">
                            {sold.player.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold">{sold.player.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{sold.player.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase font-bold">Bought For</p>
                          <p className="text-sm font-bold text-slate-900 font-semibold ">{formatPrice(sold.price)}</p>
                        </div>
                      </div>
                    ))}
                  {gameState.soldPlayers.filter(p => p.team === selectedSquadTeam).length === 0 && (
                    <p className="col-span-full text-center text-slate-500 py-8 italic">No players bought yet.</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
        {/* Sold Player Overlay */}
        {/* Sold Player Overlay */}
        <AnimatePresence>
          {showSoldOverlay && lastSoldPlayer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md"
            >
              <motion.div 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className={cn(
                  "p-8 rounded-[40px] shadow-2xl max-w-sm w-full relative overflow-hidden flex flex-col items-center gap-6 border-2",
                  TEAM_COLORS[lastSoldPlayer.team]?.bg || "bg-slate-900",
                  TEAM_COLORS[lastSoldPlayer.team]?.border || "border-white/20"
                )}
              >
                {/* Gloss Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/5 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center gap-6 w-full">
                  {/* Minimal Header */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 glass-card bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center p-4 shadow-2xl border border-white/30">
                      {lastSoldPlayer.team === 'Unsold' ? (
                        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white text-3xl font-black shadow-lg">!</div>
                      ) : (
                        <img src={TEAM_LOGOS[lastSoldPlayer.team]} alt={lastSoldPlayer.team} className="w-full h-full object-contain filter drop-shadow-lg" />
                      )}
                    </div>
                    
                    <div className="text-center space-y-1">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.3em]",
                        TEAM_COLORS[lastSoldPlayer.team]?.text === 'text-white' ? "text-white/60" : "text-slate-900/60"
                      )}>
                        Auction Update
                      </p>
                      <h3 className={cn(
                        "text-2xl font-black leading-tight tracking-tight",
                        TEAM_COLORS[lastSoldPlayer.team]?.text || "text-white"
                      )}>
                        {lastSoldPlayer.name}
                      </h3>
                    </div>
                  </div>

                  {/* The "Goes to" Text */}
                  <div className="w-full py-5 border-y border-white/20 text-center bg-black/5 backdrop-blur-md rounded-2xl px-4">
                    <p className={cn(
                      "text-lg font-bold leading-relaxed",
                      TEAM_COLORS[lastSoldPlayer.team]?.text || "text-white"
                    )}>
                      {lastSoldPlayer.team === 'Unsold' ? (
                        <span className="text-white font-black uppercase tracking-widest bg-red-600 px-4 py-1 rounded-full shadow-lg">goes Unsold</span>
                      ) : (
                        <>
                          goes to <span className={cn(
                            "font-black px-3 py-1 rounded-xl shadow-inner ml-1 inline-block",
                            TEAM_COLORS[lastSoldPlayer.team]?.text === 'text-white' ? "bg-white/20 text-white" : "bg-black/10 text-slate-900"
                          )}>
                            {lastSoldPlayer.team}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {lastSoldPlayer.team !== 'Unsold' && (
                    <div className="text-center scale-110">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest mb-1 opacity-60",
                        TEAM_COLORS[lastSoldPlayer.team]?.text || "text-white"
                      )}>
                        Final Bid
                      </p>
                      <p className={cn(
                        "text-3xl font-black font-mono flex items-center justify-center gap-1 drop-shadow-sm",
                        TEAM_COLORS[lastSoldPlayer.team]?.text || "text-white"
                      )}>
                        <IndianRupee className="w-6 h-6" />
                        {formatPrice(lastSoldPlayer.price)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
