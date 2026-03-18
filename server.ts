import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { IPL_2025_PLAYERS, IPL_LEGENDS_PLAYERS, Player } from "./src/players";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TeamData {
  purse: number;
  players: Player[];
}

interface AuctionState {
  roomId: string;
  adminId: string;
  players: Player[];
  currentPlayerIndex: number;
  currentBid: number;
  highestBidder: string | null;
  highestBidderId: string | null;
  isPaused: boolean;
  isStarted: boolean;
  timer: number;
  soldPlayers: { player: Player; team: string; price: number }[];
  teams: Record<string, TeamData>;
  teamOwners: Record<string, string>; // teamName -> socketId
  currentBidLog: { team: string; price: number }[];
  members: Set<string>;
  mode: '2025' | 'legends';
}

const rooms: Record<string, AuctionState> = {};
const TEAM_PURSE = 1200000000; // 120 Crore
const TIMER_SECONDS = 30;

function getIncrement(price: number) {
  if (price < 10000000) return 2000000; // < 1 Cr  → 20 lakh
  if (price < 20000000) return 2500000; // 1–2 Cr  → 25 lakh
  if (price < 50000000) return 5000000; // 2–5 Cr  → 50 lakh
  if (price < 100000000) return 10000000; // 5–10 Cr → 1 Cr
  return 20000000; // > 10 Cr → 2 Cr
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("createRoom", ({ mode }: { mode: '2025' | 'legends' }) => {
      const roomId = Math.floor(1000 + Math.random() * 9000).toString();
      const players = mode === 'legends' ? [...IPL_LEGENDS_PLAYERS] : [...IPL_2025_PLAYERS];
      
      rooms[roomId] = {
        roomId,
        adminId: socket.id,
        players: players.sort(() => Math.random() - 0.5),
        currentPlayerIndex: -1,
        currentBid: 0,
        highestBidder: null,
        highestBidderId: null,
        isPaused: false,
        isStarted: false,
        timer: TIMER_SECONDS,
        soldPlayers: [],
        teams: {
          CSK: { purse: TEAM_PURSE, players: [] },
          MI: { purse: TEAM_PURSE, players: [] },
          RCB: { purse: TEAM_PURSE, players: [] },
          KKR: { purse: TEAM_PURSE, players: [] },
          SRH: { purse: TEAM_PURSE, players: [] },
          GT: { purse: TEAM_PURSE, players: [] },
          RR: { purse: TEAM_PURSE, players: [] },
          LSG: { purse: TEAM_PURSE, players: [] },
          DC: { purse: TEAM_PURSE, players: [] },
          PBKS: { purse: TEAM_PURSE, players: [] },
        },
        teamOwners: {},
        currentBidLog: [],
        members: new Set([socket.id]),
        mode,
      };
      socket.join(roomId);
      socket.emit("roomCreated", { roomId });
    });

    socket.on("joinRoom", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit("error", "Room not found");
        return;
      }
      socket.join(roomId);
      room.members.add(socket.id);
      
      // If no admin, assign this user
      if (!room.adminId) {
        room.adminId = socket.id;
      }

      socket.emit("joinAuction", {
        ...room,
        members: Array.from(room.members),
        isAdmin: room.adminId === socket.id,
        currentPlayer: room.currentPlayerIndex >= 0 ? room.players[room.currentPlayerIndex] : null,
        playerIndex: room.currentPlayerIndex,
        totalPlayers: room.players.length,
      });
      
      io.to(roomId).emit("teamUpdate", room.teamOwners);
    });

    socket.on("selectTeam", ({ team, roomId }) => {
      const room = rooms[roomId];
      if (!room) return;

      if (room.teamOwners[team] && room.teamOwners[team] !== socket.id) {
        socket.emit("bidError", { message: "Team already taken" });
        return;
      }

      Object.keys(room.teamOwners).forEach((t) => {
        if (room.teamOwners[t] === socket.id) delete room.teamOwners[t];
      });

      room.teamOwners[team] = socket.id;
      io.to(roomId).emit("teamUpdate", room.teamOwners);
    });

    socket.on("admin:startAuction", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.adminId !== socket.id) return;

      if (!room.isStarted) {
        room.isStarted = true;
        nextPlayer(roomId);
      }
    });

    socket.on("admin:nextPlayer", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.adminId !== socket.id) return;
      
      if (room.currentPlayerIndex >= 0) {
        sellPlayer(roomId);
      } else {
        nextPlayer(roomId);
      }
    });

    socket.on("admin:pauseAuction", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.adminId !== socket.id) return;
      room.isPaused = !room.isPaused;
      io.to(roomId).emit("auctionPaused", { isPaused: room.isPaused });
    });

    socket.on("bid", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || !room.isStarted || room.isPaused) return;

      const team = Object.keys(room.teamOwners).find(t => room.teamOwners[t] === socket.id);
      if (!team) {
        socket.emit("bidError", { message: "Select a team first" });
        return;
      }

      if (room.highestBidder === team) {
        socket.emit("bidError", { message: "You are already the highest bidder" });
        return;
      }

      const player = room.players[room.currentPlayerIndex];
      const nextBid = room.currentBid === 0 ? player.basePrice : room.currentBid + getIncrement(room.currentBid);

      if (room.teams[team].purse < nextBid) {
        socket.emit("bidError", { message: "Insufficient purse" });
        return;
      }

      room.currentBid = nextBid;
      room.highestBidder = team;
      room.highestBidderId = socket.id;
      room.timer = TIMER_SECONDS;
      room.currentBidLog.push({ team, price: nextBid });

      io.to(roomId).emit("bidUpdated", {
        currentBid: room.currentBid,
        highestBidder: room.highestBidder,
        currentBidLog: room.currentBidLog,
        timer: room.timer,
        isStarted: room.isStarted,
        isPaused: room.isPaused,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      Object.keys(rooms).forEach((roomId) => {
        const room = rooms[roomId];
        if (room.members.has(socket.id)) {
          room.members.delete(socket.id);
          Object.keys(room.teamOwners).forEach((t) => {
            if (room.teamOwners[t] === socket.id) delete room.teamOwners[t];
          });
          io.to(roomId).emit("teamUpdate", room.teamOwners);

          if (room.adminId === socket.id) {
            const nextAdmin = Array.from(room.members)[0];
            room.adminId = nextAdmin || "";
            if (nextAdmin) {
              io.to(nextAdmin).emit("adminChanged", { isAdmin: true });
            }
          }

          if (room.members.size === 0) {
            delete rooms[roomId];
          }
        }
      });
    });
  });

  function nextPlayer(roomId: string) {
    const room = rooms[roomId];
    if (!room) return;

    room.currentPlayerIndex++;
    if (room.currentPlayerIndex >= room.players.length) {
      io.to(roomId).emit("auctionComplete", { soldPlayers: room.soldPlayers });
      return;
    }

    room.currentBid = 0;
    room.highestBidder = null;
    room.highestBidderId = null;
    room.timer = TIMER_SECONDS;
    room.currentBidLog = [];

    io.to(roomId).emit("playerUpdate", {
      currentPlayer: room.players[room.currentPlayerIndex],
      playerIndex: room.currentPlayerIndex,
      totalPlayers: room.players.length,
      currentBid: 0,
      highestBidder: null,
      timer: TIMER_SECONDS,
      currentBidLog: [],
      isStarted: room.isStarted,
      isPaused: room.isPaused,
    });
  }

  function sellPlayer(roomId: string) {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players[room.currentPlayerIndex];
    if (room.highestBidder && room.highestBidderId) {
      const team = room.highestBidder;
      room.teams[team].purse -= room.currentBid;
      room.teams[team].players.push(player);
      room.soldPlayers.push({ player, team, price: room.currentBid });
    } else {
      room.soldPlayers.push({ player, team: "Unsold", price: 0 });
    }

    room.timer = -1; // Prevent multiple calls during transition
    io.to(roomId).emit("purseUpdate", room.teams);
    io.to(roomId).emit("soldPlayers", room.soldPlayers);

    io.to(roomId).emit("playerSold", {
      player,
      team: room.highestBidder || "Unsold",
      price: room.currentBid,
      gameState: {
        teams: room.teams,
        soldPlayers: room.soldPlayers,
        currentPlayerIndex: room.currentPlayerIndex,
      }
    });

    setTimeout(() => {
      nextPlayer(roomId);
    }, 3000);
  }

  setInterval(() => {
    Object.keys(rooms).forEach((roomId) => {
      const room = rooms[roomId];
      if (room.isStarted && !room.isPaused && room.currentPlayerIndex >= 0 && room.timer >= 0) {
        if (room.timer > 0) {
          room.timer--;
          io.to(roomId).emit("timerUpdate", { timer: room.timer });
        } else {
          sellPlayer(roomId);
        }
      }
    });
  }, 1000);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
