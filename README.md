# IPL Auction Simulator - Deployment Guide

This application is a full-stack React + Express app with WebSockets.

## Deployment Steps

### 1. Export Code
Export this project to GitHub or download the ZIP from the AI Studio settings menu.

### 2. Choose a Hosting Provider
We recommend **Render** or **Railway** as they support Node.js and WebSockets.

### 3. Configuration on Hosting Provider

#### Render
1. Create a new **Web Service**.
2. Connect your GitHub repository.
3. Set the following:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `NODE_ENV`: `production`

#### Railway
1. Create a new project and connect your GitHub repository.
2. Railway will automatically detect the `package.json` and use the `build` and `start` scripts.
3. Add Environment Variables:
   - `NODE_ENV`: `production`

## Local Production Test
To test the production build locally:
1. Run `npm run build`
2. Run `NODE_ENV=production npm start`
3. Open `http://localhost:3000`
