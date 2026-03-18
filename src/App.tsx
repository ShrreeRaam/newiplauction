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
  CSK: { bg: "bg-[#FFFF00]", text: "text-[#004BA0]", border: "border-[#F25C19]", shadow: "shadow-[0_0_50px_rgba(255,255,0,0.5)]" },
  MI: { bg: "bg-[#004BA0]", text: "text-[#D4AF37]", border: "border-[#D4AF37]", shadow: "shadow-[0_0_50px_rgba(0,75,160,0.5)]" },
  KKR: { bg: "bg-[#3A225D]", text: "text-[#D4AF37]", border: "border-[#D4AF37]", shadow: "shadow-[0_0_50px_rgba(58,34,93,0.5)]" },
  RCB: { bg: "bg-[#EC1C24]", text: "text-[#000000]", border: "border-[#000000]", shadow: "shadow-[0_0_50px_rgba(236,28,36,0.5)]" },
  RR: { bg: "bg-[#EA1B85]", text: "text-[#004BA0]", border: "border-[#004BA0]", shadow: "shadow-[0_0_50px_rgba(234,27,133,0.5)]" },
  SRH: { bg: "bg-[#FF822A]", text: "text-[#000000]", border: "border-[#000000]", shadow: "shadow-[0_0_50px_rgba(255,130,42,0.5)]" },
  DC: { bg: "bg-[#004BA0]", text: "text-[#EF4123]", border: "border-[#EF4123]", shadow: "shadow-[0_0_50px_rgba(0,75,160,0.5)]" },
  PBKS: { bg: "bg-[#D71920]", text: "text-[#D1D3D4]", border: "border-[#D1D3D4]", shadow: "shadow-[0_0_50px_rgba(215,25,32,0.5)]" },
  GT: { bg: "bg-[#1B2133]", text: "text-[#CBA92B]", border: "border-[#CBA92B]", shadow: "shadow-[0_0_50px_rgba(27,33,51,0.5)]" },
  LSG: { bg: "bg-[#E0202D]", text: "text-[#0057A3]", border: "border-[#0057A3]", shadow: "shadow-[0_0_50px_rgba(224,32,45,0.5)]" },
  Unsold: { bg: "bg-gray-800", text: "text-white", border: "border-white", shadow: "shadow-[0_0_50px_rgba(255,255,255,0.2)]" }
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
  
  const [gameState, setGameState] = useState<{
    currentPlayer: Player | null;
    players: Player[];
    currentBid: number;
    highestBidder: string | null;
    timer: number;
    soldPlayers: { player: Player; team: string; price: number }[];
    teams: Record<string, { purse: number; players: Player[] }>;
    teamOwners: Record<string, string>;
    currentBidLog: { team: string; price: number }[];
    playerIndex: number;
    totalPlayers: number;
    isStarted: boolean;
    isPaused: boolean;
    mode: '2025' | 'legends';
  }>({
    currentPlayer: null,
    players: [],
    currentBid: 0,
    highestBidder: null,
    timer: 30,
    soldPlayers: [],
    teams: {},
    teamOwners: {},
    currentBidLog: [],
    playerIndex: -1,
    totalPlayers: 0,
    isStarted: false,
    isPaused: false,
    mode: '2025',
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
      socket.emit('joinRoom', { roomId });
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

    socket.on('teamUpdate', (teamOwners) => {
      setGameState(prev => ({ ...prev, teamOwners }));
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
    socket.emit('createRoom', { mode: selectedMode });
  };

  const handleJoinRoom = () => {
    if (joinId.length === 4) {
      socket.emit('joinRoom', { roomId: joinId });
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
    if (price < 10000000) return 2000000; // < 1 Cr  → 20 lakh
    if (price < 20000000) return 2500000; // 1–2 Cr  → 25 lakh
    if (price < 50000000) return 5000000; // 2–5 Cr  → 50 lakh
    if (price < 100000000) return 10000000; // 5–10 Cr → 1 Cr
    return 20000000; // > 10 Cr → 2 Cr
  };

  const nextBidAmount = gameState.currentBid === 0 
    ? (gameState.currentPlayer?.basePrice || 0) 
    : gameState.currentBid + getIncrement(gameState.currentBid);

  const myTeam = Object.keys(gameState.teamOwners).find(t => gameState.teamOwners[t] === socket.id);
  const myPurse = myTeam ? gameState.teams[myTeam]?.purse : 0;
  const canAfford = myPurse >= nextBidAmount;

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0f0f14] text-white flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 bg-[#1a1a24] p-8 rounded-2xl border border-[#2a2a38] shadow-2xl"
        >
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-4 bg-[#00d4aa]/10 rounded-full">
                <Gavel className="w-12 h-12 text-[#00d4aa]" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">IPL Auction</h1>
            <p className="text-[#8888a0]">Real-time bidding with friends</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedMode('2025')}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center space-y-1",
                    selectedMode === '2025' 
                      ? "border-[#00d4aa] bg-[#00d4aa]/10 text-[#00d4aa]" 
                      : "border-[#2a2a38] bg-[#0f0f14] text-[#8888a0] hover:border-[#3a3a4a]"
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
                      ? "border-[#00d4aa] bg-[#00d4aa]/10 text-[#00d4aa]" 
                      : "border-[#2a2a38] bg-[#0f0f14] text-[#8888a0] hover:border-[#3a3a4a]"
                  )}
                >
                  <div className="font-bold text-sm">LEGENDS</div>
                  <div className="text-[10px] opacity-70">2020 - 2026</div>
                </button>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full py-4 bg-[#00d4aa] hover:bg-[#00a884] text-[#0f0f14] font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Create New Room
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2a2a38]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a1a24] px-2 text-[#8888a0] font-bold">OR</span>
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
                  className="flex-1 bg-[#0f0f14] border border-[#2a2a38] rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:border-[#00d4aa] transition-colors"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-6 bg-[#2a2a38] hover:bg-[#3a3a4a] font-bold rounded-xl transition-all active:scale-95"
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
    <div className="min-h-screen bg-[#0f0f14] text-white p-4 md:p-6 lg:p-8">
      {/* Header with Mode and Room ID */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1a1a24] p-4 rounded-2xl border border-[#2a2a38]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#00d4aa]/10 rounded-xl">
            <Trophy className="w-6 h-6 text-[#00d4aa]" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {gameState.mode === 'legends' ? "IPL Legends Auction" : "IPL 2025 Mega Auction"}
            </h2>
            <p className="text-xs text-[#8888a0] font-medium uppercase tracking-wider">
              {gameState.mode === 'legends' ? "Players from 2020 - 2026" : "Official 2025 & 2026 Registered Players"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-[#0f0f14] rounded-lg border border-[#2a2a38] flex items-center gap-2">
            <span className="text-xs text-[#8888a0] font-bold uppercase">Room ID:</span>
            <span className="text-lg font-mono font-bold text-[#00d4aa]">{roomId}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                // Simple feedback could be added here
              }}
              className="p-1 hover:bg-[#2a2a38] rounded transition-colors"
            >
              <Copy className="w-4 h-4 text-[#8888a0]" />
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
              TEAM_COLORS[lastSoldPlayer.team]?.bg || "bg-[#00d4aa]",
              TEAM_COLORS[lastSoldPlayer.team]?.text || "text-[#0f0f14]",
              TEAM_COLORS[lastSoldPlayer.team]?.border || "border-white",
              TEAM_COLORS[lastSoldPlayer.team]?.shadow || "shadow-[0_0_50px_rgba(0,212,170,0.5)]"
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
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1a1a24] p-4 rounded-2xl border border-[#2a2a38]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00d4aa]/10 rounded-lg">
              <Gavel className="w-6 h-6 text-[#00d4aa]" />
            </div>
            <h1 className="text-xl font-bold">IPL Auction Simulator</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#0f0f14] px-3 py-1.5 rounded-lg border border-[#2a2a38] gap-2">
              <span className="text-xs text-[#8888a0] font-bold uppercase">Room ID</span>
              <span className="font-mono font-bold text-[#00d4aa]">{roomId}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="p-1 hover:bg-[#2a2a38] rounded transition-colors"
              >
                <Copy className="w-4 h-4 text-[#8888a0]" />
              </button>
            </div>

            {isAdmin && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {!gameState.isStarted ? (
                    <button onClick={handleStart} className="px-4 py-1.5 bg-[#00d4aa] text-[#0f0f14] font-bold rounded-lg text-sm hover:bg-[#00a884]">
                      Start Auction
                    </button>
                  ) : (
                    <>
                      <button onClick={handlePause} className={cn(
                        "px-4 py-1.5 font-bold rounded-lg text-sm flex items-center gap-2",
                        gameState.isPaused ? "bg-green-500 text-white hover:bg-green-600" : "bg-yellow-500 text-[#0f0f14] hover:bg-yellow-600"
                      )}>
                        {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        {gameState.isPaused ? "Resume" : "Pause"}
                      </button>
                      <button onClick={handleNext} className="px-4 py-1.5 bg-orange-500 text-white font-bold rounded-lg text-sm hover:bg-orange-600 flex items-center gap-2">
                        <SkipForward className="w-4 h-4" />
                        Next / Sold
                      </button>
                    </>
                  )}
                </div>
                {gameState.isStarted && (
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    gameState.isPaused ? "text-yellow-500" : "text-[#00d4aa]"
                  )}>
                    {gameState.isPaused ? "Auction Paused" : "Auction in Progress"}
                  </p>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex gap-2 bg-[#1a1a24] p-1 rounded-xl border border-[#2a2a38]">
          <button
            onClick={() => setView('auction')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'auction' ? "bg-[#00d4aa] text-[#0f0f14]" : "text-[#8888a0] hover:text-white hover:bg-[#2a2a38]"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Auction Room
          </button>
          <button
            onClick={() => setView('upcoming')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'upcoming' ? "bg-[#00d4aa] text-[#0f0f14]" : "text-[#8888a0] hover:text-white hover:bg-[#2a2a38]"
            )}
          >
            <SkipForward className="w-4 h-4" />
            Upcoming Players
          </button>
          <button
            onClick={() => setView('squads')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all",
              view === 'squads' ? "bg-[#00d4aa] text-[#0f0f14]" : "text-[#8888a0] hover:text-white hover:bg-[#2a2a38]"
            )}
          >
            <Users className="w-4 h-4" />
            Team Squads
          </button>
        </nav>

        {view === 'auction' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Current Player */}
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-[#1a1a24] p-6 rounded-2xl border border-[#2a2a38] h-full flex flex-col items-center text-center relative overflow-hidden">
              <h3 className="w-full text-left text-xs font-bold text-[#8888a0] uppercase tracking-wider mb-6">Current Player</h3>
              
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
                      <div className="w-32 h-32 bg-[#0f0f14] rounded-full border-2 border-[#2a2a38] flex items-center justify-center text-4xl font-bold text-[#00d4aa] overflow-hidden">
                        {gameState.currentPlayer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      {gameState.timer === 0 && (
                        <div className="absolute top-0 right-0 bg-[#00d4aa] text-[#0f0f14] text-[10px] font-black px-2 py-1 rounded-full uppercase">
                          Sold
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold">{gameState.currentPlayer.name}</h2>
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
                      <p className="text-xs text-[#8888a0] uppercase font-bold">Base Price</p>
                      <p className="text-xl font-bold text-white flex items-center justify-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {formatPrice(gameState.currentPlayer.basePrice)}
                      </p>
                    </div>

                    <p className="text-[10px] text-[#8888a0] font-bold uppercase mt-4">
                      Player {gameState.playerIndex + 1} of {gameState.totalPlayers}
                    </p>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#8888a0] italic text-sm">
                    {gameState.isStarted ? "Auction Complete" : "Waiting to start..."}
                  </div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* Center Panel: Bidding & Timer */}
          <div className="lg:col-span-6 space-y-6">
            <section className="bg-[#1a1a24] p-6 rounded-2xl border border-[#2a2a38] space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#8888a0] uppercase tracking-wider">Current Bid</h3>
                  <div className={cn(
                    "text-5xl font-black text-[#00d4aa] flex items-center gap-2 transition-all duration-300",
                    bidFlash ? "scale-110 text-white" : "scale-100"
                  )}>
                    <IndianRupee className="w-10 h-10" />
                    {formatPrice(gameState.currentBid === 0 ? (gameState.currentPlayer?.basePrice || 0) : gameState.currentBid)}
                  </div>
                  <p className="text-sm text-[#8888a0]">
                    Highest Bidder: <span className="text-white font-bold">{gameState.highestBidder || "—"}</span>
                  </p>
                </div>

                <div className="text-right space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Timer className={cn("w-5 h-5", gameState.timer <= 10 ? "text-red-500 animate-pulse" : "text-yellow-500")} />
                    <span className={cn("text-3xl font-black font-mono", gameState.timer <= 10 ? "text-red-500" : "text-white")}>
                      {gameState.timer}s
                    </span>
                  </div>
                  <div className="w-32 h-2 bg-[#0f0f14] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "100%" }}
                      animate={{ width: `${(gameState.timer / 30) * 100}%` }}
                      className={cn("h-full", gameState.timer <= 10 ? "bg-red-500" : "bg-[#00d4aa]")}
                    />
                  </div>
                </div>
              </div>

              {/* Bid Log */}
              <div className="bg-[#0f0f14] rounded-xl p-4 h-32 overflow-y-auto border border-[#2a2a38] custom-scrollbar">
                <h4 className="text-[10px] font-black text-[#8888a0] uppercase tracking-widest mb-2">Bid History</h4>
                <div className="space-y-2">
                  {gameState.currentBidLog.length > 0 ? (
                    gameState.currentBidLog.slice().reverse().map((bid, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-white">{bid.team}</span>
                        <span className="text-[#00d4aa] font-mono">{formatPrice(bid.price)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#8888a0] italic">No bids yet</p>
                  )}
                </div>
              </div>

              {/* Bidding Controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#8888a0] uppercase tracking-widest">Select Your Team</label>
                    <select 
                      value={myTeam || ""}
                      onChange={(e) => handleSelectTeam(e.target.value)}
                      disabled={!!myTeam}
                      className="w-full bg-[#0f0f14] border border-[#2a2a38] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00d4aa] disabled:opacity-50"
                    >
                      <option value="">— Select Team —</option>
                      {Object.keys(gameState.teams).map(team => (
                        <option key={team} value={team} disabled={!!gameState.teamOwners[team] && gameState.teamOwners[team] !== socket.id}>
                          {team} {gameState.teamOwners[team] && gameState.teamOwners[team] !== socket.id ? "(Taken)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleBid}
                      disabled={!myTeam || !gameState.isStarted || gameState.timer === 0 || !canAfford}
                      className="w-full h-[46px] bg-[#00d4aa] hover:bg-[#00a884] text-[#0f0f14] font-black rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
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
            <section className="bg-[#1a1a24] p-6 rounded-2xl border border-[#2a2a38] h-full">
              <h3 className="text-xs font-bold text-[#8888a0] uppercase tracking-wider mb-6 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Team Purses
              </h3>
              <div className="space-y-4">
                {Object.entries(gameState.teams).map(([name, data]: [string, any]) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#0f0f14] transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={TEAM_LOGOS[name]} alt={name} className="w-6 h-6 object-contain" />
                      <span className="font-bold text-sm">{name}</span>
                    </div>
                    <span className="text-[#00d4aa] font-mono text-sm font-bold">{formatPrice(data.purse)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Panel: Sold Players */}
        <section className="bg-[#1a1a24] p-6 rounded-2xl border border-[#2a2a38]">
          <h3 className="text-xs font-bold text-[#8888a0] uppercase tracking-wider mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Sold Players
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gameState.soldPlayers.length > 0 ? (
              gameState.soldPlayers.slice().reverse().map((sold, i) => (
                <div key={i} className="bg-[#0f0f14] p-4 rounded-xl border border-[#2a2a38] flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a24] border border-[#2a2a38] flex items-center justify-center overflow-hidden flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#8888a0]">
                      {sold.player.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{sold.player.name}</p>
                    <p className={cn("text-[10px] font-black uppercase", sold.team === 'Unsold' ? 'text-red-500' : 'text-[#8888a0]')}>
                      {sold.team}
                    </p>
                  </div>
                  {sold.team !== 'Unsold' && (
                    <div className="text-right">
                      <p className="text-[#00d4aa] font-mono text-xs font-bold">{formatPrice(sold.price)}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-[#8888a0] italic text-sm py-4">No players sold yet</p>
            )}
          </div>
        </section>
      </>
    )}

    {view === 'upcoming' && (
          <div className="bg-[#1a1a24] p-6 rounded-2xl border border-[#2a2a38] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <SkipForward className="w-6 h-6 text-[#00d4aa]" />
                Upcoming Players
              </h3>
              <p className="text-sm text-[#8888a0]">
                {gameState.players.length - (gameState.playerIndex + 1)} players remaining
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameState.players.slice(gameState.playerIndex + 1).map((player, i) => (
                <div key={player.id} className="bg-[#0f0f14] p-4 rounded-xl border border-[#2a2a38] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a24] border border-[#2a2a38] flex items-center justify-center font-bold text-[#00d4aa]">
                      {player.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold">{player.name}</p>
                      <p className="text-[10px] text-[#8888a0] uppercase font-black tracking-widest">{player.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#8888a0] uppercase font-bold">Base</p>
                    <p className="text-sm font-bold">{formatPrice(player.basePrice)}</p>
                  </div>
                </div>
              ))}
              {gameState.players.slice(gameState.playerIndex + 1).length === 0 && (
                <p className="col-span-full text-center text-[#8888a0] py-8 italic">No more players in the pool.</p>
              )}
            </div>
          </div>
        )}

        {view === 'squads' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Object.keys(gameState.teams).map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedSquadTeam(team)}
                  className={cn(
                    "p-4 rounded-xl border transition-all flex flex-col items-center gap-2",
                    selectedSquadTeam === team 
                      ? "bg-[#00d4aa] border-[#00d4aa] text-[#0f0f14]" 
                      : "bg-[#1a1a24] border-[#2a2a38] text-white hover:border-[#00d4aa]"
                  )}
                >
                  <img src={TEAM_LOGOS[team]} alt={team} className="w-12 h-12 object-contain" />
                  <span className="font-bold text-sm">{team}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase",
                    selectedSquadTeam === team ? "text-[#0f0f14]/70" : "text-[#8888a0]"
                  )}>
                    {gameState.teams[team].players.length} Players
                  </span>
                </button>
              ))}
            </div>

            {selectedSquadTeam && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1a1a24] p-6 rounded-2xl border border-[#2a2a38] space-y-6"
              >
                <div className="flex items-center justify-between border-b border-[#2a2a38] pb-4">
                  <div className="flex items-center gap-4">
                    <img src={TEAM_LOGOS[selectedSquadTeam]} alt={selectedSquadTeam} className="w-16 h-16 object-contain" />
                    <div>
                      <h3 className="text-2xl font-bold">{selectedSquadTeam} Squad</h3>
                      <p className="text-[#8888a0]">Remaining Purse: <span className="text-[#00d4aa] font-bold">{formatPrice(gameState.teams[selectedSquadTeam].purse)}</span></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gameState.soldPlayers
                    .filter(p => p.team === selectedSquadTeam)
                    .map((sold, i) => (
                      <div key={i} className="bg-[#0f0f14] p-4 rounded-xl border border-[#2a2a38] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1a1a24] border border-[#2a2a38] flex items-center justify-center font-bold text-[#00d4aa]">
                            {sold.player.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold">{sold.player.name}</p>
                            <p className="text-[10px] text-[#8888a0] uppercase font-black tracking-widest">{sold.player.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#8888a0] uppercase font-bold">Bought For</p>
                          <p className="text-sm font-bold text-[#00d4aa]">{formatPrice(sold.price)}</p>
                        </div>
                      </div>
                    ))}
                  {gameState.soldPlayers.filter(p => p.team === selectedSquadTeam).length === 0 && (
                    <p className="col-span-full text-center text-[#8888a0] py-8 italic">No players bought yet.</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

