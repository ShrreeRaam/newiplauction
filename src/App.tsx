import { useState, useEffect } from 'react';
import socket from './lib/socket';
import { cn, formatPrice } from './lib/utils';
import { Player } from './players';
import { Trophy, Users, Timer, Gavel, Copy, Play, SkipForward, IndianRupee, Pause, List, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

const TEAM_COLORS: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
  CSK: { bg: "bg-[#FFFF00]", text: "text-[#004BA0]", border: "border-[#F25C19]", shadow: "shadow-xl shadow-black/80" },
  MI: { bg: "bg-[#004BA0]", text: "text-[#D4AF37]", border: "border-[#D4AF37]", shadow: "shadow-xl shadow-black/80" },
  KKR: { bg: "bg-[#3A225D]", text: "text-[#D4AF37]", border: "border-[#D4AF37]", shadow: "shadow-xl shadow-black/80" },
  RCB: { bg: "bg-[#EC1C24]", text: "text-[#000000]", border: "border-[#000000]", shadow: "shadow-xl shadow-black/80" },
  RR: { bg: "bg-[#EA1B85]", text: "text-[#004BA0]", border: "border-[#004BA0]", shadow: "shadow-xl shadow-black/80" },
  SRH: { bg: "bg-[#FF822A]", text: "text-[#000000]", border: "border-[#000000]", shadow: "shadow-xl shadow-black/80" },
  DC: { bg: "bg-[#004BA0]", text: "text-[#EF4123]", border: "border-[#EF4123]", shadow: "shadow-xl shadow-black/80" },
  PBKS: { bg: "bg-[#D71920]", text: "text-[#D1D3D4]", border: "border-[#D1D3D4]", shadow: "shadow-xl shadow-black/80" },
  GT: { bg: "bg-[#1B2133]", text: "text-[#CBA92B]", border: "border-[#CBA92B]", shadow: "shadow-xl shadow-black/80" },
  LSG: { bg: "bg-[#E0202D]", text: "text-[#0057A3]", border: "border-[#0057A3]", shadow: "shadow-xl shadow-black/80" },
  Unsold: { bg: "bg-gray-800", text: "text-slate-900", border: "border-white", shadow: "shadow-xl shadow-black/80" }
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

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    socket.emit('createRoom', { mode: selectedMode, username });
  };
  
  const handleJoinRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (joinId.length === 4) {
      socket.emit('joinRoom', { roomId: joinId, username });
    } else {
      setError('Enter a 4-digit Room ID');
    }
  };

  const handleSelectTeam = (team: string) => {
    socket.emit('selectTeam', { team, roomId });
  };

  const handleBid = () => {
    socket.emit('bid', { roomId });
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
    if (price < 10000000) return 500000; // < 1 Cr  → 5 lakh
    if (price < 20000000) return 1000000; // 1–2 Cr  → 10 lakh
    if (price < 50000000) return 2000000; // 2–5 Cr  → 20 lakh
    return 2500000; // >= 5 Cr → 25 lakh
  };

  const nextBidAmount = gameState.currentBid === 0 
    ? (gameState.currentPlayer?.basePrice || 0) 
    : gameState.currentBid + getIncrement(gameState.currentBid);
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

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    socket.emit('createRoom', { mode: selectedMode, username });
  };
  
  const handleJoinRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (joinId.length === 4) {
      socket.emit('joinRoom', { roomId: joinId, username });
    } else {
      setError('Enter a 4-digit Room ID');
    }
  };

  const handleSelectTeam = (team: string) => {
    socket.emit('selectTeam', { team, roomId });
  };

  const handleBid = () => {
    socket.emit('bid', { roomId });
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
    if (price < 10000000) return 500000; // < 1 Cr  → 5 lakh
    if (price < 20000000) return 1000000; // 1–2 Cr  → 10 lakh
    if (price < 50000000) return 2000000; // 2–5 Cr  → 20 lakh
    return 2500000; // >= 5 Cr → 25 lakh
  };

  const nextBidAmount = gameState.currentBid === 0 
    ? (gameState.currentPlayer?.basePrice || 0) 
    : gameState.currentBid + getIncrement(gameState.currentBid);

  const myTeam = Object.keys(gameState.teamOwners || {}).find(t => gameState.teamOwners?.[t] === socket.id);
  const myPurse = myTeam ? gameState.teams?.[myTeam]?.purse : 0;
  const canAfford = myPurse >= nextBidAmount;

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Indian_Premier_League_Official_Logo.svg/1200px-Indian_Premier_League_Official_Logo.svg.png')" }}>
        {/* White frost overlay so the IPL logo is visible but soft enough to refract beautifully through the glass UI */}
        
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
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">IPL Auction Simulator</h1>
            <p className="text-slate-500">Real-time bidding with friends</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Your Name</label>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/40 border border-white/60 rounded-xl border border-white/5 rounded-xl px-4 py-3 text-center text-lg focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedMode('2025')}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center space-y-1",
                    selectedMode === '2025' 
                      ? "border-zinc-700 bg-white/60 border border-white/80 shadow-sm text-slate-900 text-slate-900 font-semibold " 
                      : "border-white/5 bg-white/40 border border-white/60 rounded-xl text-slate-500 hover:border-zinc-700"
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
                      ? "border-zinc-700 bg-white/60 border border-white/80 shadow-sm text-slate-900 text-slate-900 font-semibold " 
                      : "border-white/5 bg-white/40 border border-white/60 rounded-xl text-slate-500 hover:border-zinc-700"
                  )}
                >
                  <div className="font-bold text-sm">LEGENDS</div>
                  <div className="text-[10px] opacity-70">2020 - 2026</div>
                </button>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 shadow-md text-slate-900 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Create New Room
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="glass-card rounded-2xl px-2 text-slate-500 font-bold">OR</span>
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
                  className="flex-1 bg-white/40 border border-white/60 rounded-xl border border-white/5 rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:border-zinc-700 transition-colors"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-6 bg-white/5 hover:bg-white/10 font-bold rounded-xl transition-all active:scale-95"
                >
                  Join
                </button>
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[0%] left-[10%] w-[800px] h-[800px] rounded-full bg-zinc-100/5 blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[0%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none z-0"></div>
      <div className="relative z-10">
      {/* Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all text-slate-900 px-6 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(0,212,170,0.4)] flex items-center gap-3 border-2 border-zinc-700"
          >
            <div className="w-2 h-2 bg-white/40 border border-white/60 rounded-xl rounded-full animate-pulse" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Mode and Room ID */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4 glass-card rounded-2xl p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/60 border border-white/80 shadow-sm text-slate-900 rounded-xl">
            <Trophy className="w-6 h-6 text-slate-900 font-semibold " />
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
          <div className="px-4 py-2 bg-white/40 border border-white/60 rounded-xl rounded-lg border border-white/5 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase">Room ID:</span>
            <span className="text-lg font-mono font-bold text-slate-900 font-semibold ">{roomId}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                // Simple feedback could be added here
              }}
              className="p-1 hover:bg-white/5 rounded transition-colors"
            >
              <Copy className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Sold Overlay */}
      <AnimatePresence>
        {showSoldOverlay && lastSoldPlayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className={cn(
              "px-12 py-8 rounded-2xl text-center transform -rotate-3 border-4",
              TEAM_COLORS[lastSoldPlayer.team]?.bg || "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all",
              TEAM_COLORS[lastSoldPlayer.team]?.text || "text-slate-900",
              TEAM_COLORS[lastSoldPlayer.team]?.border || "border-white",
              TEAM_COLORS[lastSoldPlayer.team]?.shadow || "shadow-xl shadow-black/80"
            )}>
              <h2 className="text-6xl font-black uppercase mb-2 italic tracking-tighter">
                {lastSoldPlayer.team === 'Unsold' ? 'UNSOLD' : 'SOLD!'}
              </h2>
              <div className="space-y-1">
                {lastSoldPlayer.team !== 'Unsold' && TEAM_LOGOS[lastSoldPlayer.team] && (
                  <motion.img 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    src={TEAM_LOGOS[lastSoldPlayer.team]} 
                    alt={lastSoldPlayer.team} 
                    className="w-24 h-24 mx-auto mb-4 object-contain"
                  />
                )}
                <p className="text-2xl font-bold">{lastSoldPlayer.name}</p>
                <p className="text-4xl font-black uppercase">
                  {lastSoldPlayer.team === 'Unsold' ? 'UNSOLD' : `TO ${lastSoldPlayer.team}`}
                </p>
                {lastSoldPlayer.price > 0 && (
                  <p className="text-2xl font-bold mt-2">{formatPrice(lastSoldPlayer.price)}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 glass-card rounded-2xl p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/60 border border-white/80 shadow-sm text-slate-900 rounded-lg">
              <Gavel className="w-6 h-6 text-slate-900 font-semibold " />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">IPL Auction Simulator</h1>
              {gameState.currentSet && <span className="text-[10px] text-slate-900 font-semibold  font-black uppercase tracking-widest mt-0.5">Currently: Set {gameState.currentSet}</span>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white/40 border border-white/60 rounded-xl px-3 py-1.5 rounded-lg border border-white/5 gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase">Room ID</span>
              <span className="font-mono font-bold text-slate-900 font-semibold ">{roomId}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="p-1 hover:bg-white/5 rounded transition-colors"
              >
                <Copy className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {isAdmin && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {gameState.players.length === 0 ? (
                    <div className="flex bg-white/40 border border-white/60 rounded-xl border border-white/5 rounded-lg p-1">
                      <select 
                        onChange={(e) => { 
                          if(e.target.value) {
                            socket.emit('admin:selectSet', { roomId, setId: e.target.value });
                          }
                        }}
                        className="bg-transparent text-slate-900 font-semibold  text-sm font-bold focus:outline-none px-2"
                        value=""
                      >
                        <option value="" disabled className="text-slate-500 bg-white">Select Next Set</option>
                        {gameState.availableSets?.map((s: string) => <option key={s} value={s} className="text-slate-900 bg-white/40 border border-white/60 rounded-xl">{s}</option>)}
                      </select>
                    </div>
                  ) : !gameState.isStarted ? (
                    <button onClick={handleStart} className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all text-slate-900 font-bold rounded-lg text-sm hover:bg-cyan-400 shadow-md">
                      Start Set {gameState.currentSet}
                    </button>
                  ) : (
                    <>
                      <button onClick={handlePause} className={cn(
                        "px-4 py-1.5 font-bold rounded-lg text-sm flex items-center gap-2",
                        gameState.isPaused ? "bg-green-500 text-slate-900 hover:bg-green-600" : "bg-yellow-500 text-slate-900 hover:bg-yellow-600"
                      )}>
                        {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        {gameState.isPaused ? "Resume" : "Pause"}
                      </button>
                      <button onClick={handleNext} className="px-4 py-1.5 bg-orange-500 text-slate-900 font-bold rounded-lg text-sm hover:bg-orange-600 flex items-center gap-2">
                        <SkipForward className="w-4 h-4" />
                        Next / Sold
                      </button>
                    </>
                  )}
                </div>
                {gameState.isStarted && (
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    gameState.isPaused ? "text-yellow-500" : "text-slate-900 font-semibold "
                  )}>
                    {gameState.isPaused ? "Auction Paused" : `Set ${gameState.currentSet} in Progress`}
                  </p>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex gap-2 glass-card rounded-2xl p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setView('auction')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'auction' ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-white/5"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Auction Room
          </button>
          <button
            onClick={() => setView('upcoming')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'upcoming' ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-white/5"
            )}
          >
            <SkipForward className="w-4 h-4" />
            Upcoming Players
          </button>
          <button
            onClick={() => setView('squads')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'squads' ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-white/5"
            )}
          >
            <Users className="w-4 h-4" />
            Team Squads
          </button>
        </nav>

        {view === 'auction' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Current Player & Owners */}
          <div className="lg:col-span-3 space-y-6">
            <section className="glass-card rounded-2xl p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
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
                      <div className="w-32 h-32 bg-white/40 border border-white/60 rounded-xl rounded-full border-2 border-white/5 flex items-center justify-center text-4xl font-bold text-slate-900 font-semibold  overflow-hidden">
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
                      <p className="text-xs text-slate-500 uppercase font-bold">Base Price</p>
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
                  <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm">
                    {gameState.isStarted ? "Auction Complete" : "Waiting to start..."}
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
            <section className="glass-card rounded-2xl p-6 rounded-2xl border border-white/5 space-y-6">
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
            <section className="glass-card rounded-2xl p-6 rounded-2xl border border-white/5 h-full">
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
        <section className="glass-card rounded-2xl p-6 rounded-2xl border border-white/5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Sold Players
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gameState.soldPlayers.length > 0 ? (
              gameState.soldPlayers.slice().reverse().map((sold, i) => (
                <div key={i} className="bg-white/40 border border-white/60 rounded-xl p-4 rounded-xl border border-white/5 flex items-center gap-4">
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
      </>
    )}

    {view === 'upcoming' && (
      (() => {
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
                        <div key={player.id} className="glass-interactive bg-white/40 border border-white/60 rounded-xl p-4 rounded-xl border border-white/5 flex items-center justify-between">
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
                            <p className="text-xs text-slate-500 uppercase font-bold">Base</p>
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
      })()
    )}

        {view === 'squads' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Object.keys(gameState.teams || {}).map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedSquadTeam(team)}
                  className={cn(
                    "p-4 rounded-xl border transition-all flex flex-col items-center gap-2",
                    selectedSquadTeam === team 
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all border-zinc-700 text-slate-900" 
                      : "glass-card rounded-2xl border-white/5 text-slate-900 hover:border-zinc-400"
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
                      <div key={i} className="bg-white/40 border border-white/60 rounded-xl p-4 rounded-xl border border-white/5 flex items-center justify-between">
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
      </div>
      </div>
    </div>
  );
}

