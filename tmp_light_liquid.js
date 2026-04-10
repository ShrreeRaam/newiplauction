import fs from 'fs';

let css = fs.readFileSync('src/index.css', 'utf8');
// Escalate the blur for true liquid glass refraction
css = css.replace(/backdrop-filter: blur\([^\)]+\)/g, 'backdrop-filter: blur(40px)');
css = css.replace(/-webkit-backdrop-filter: blur\([^\)]+\)/g, '-webkit-backdrop-filter: blur(40px)');
fs.writeFileSync('src/index.css', css);

let tsx = fs.readFileSync('src/App.tsx', 'utf8');

const iplLogoUrl = "https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Indian_Premier_League_Official_Logo.svg/1200px-Indian_Premier_League_Official_Logo.svg.png";

// Inject structural IPL background to the Lobby
const lobbyRegex = /<div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">/;
tsx = tsx.replace(lobbyRegex, `<div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('" + iplLogoUrl + "')" }}>
        {/* White frost overlay so the IPL logo is visible but soft enough to refract beautifully through the glass UI */}
        <div className="absolute inset-0 bg-slate-50/70 z-0"></div>`);

// Inject structural IPL background to the Dashboard
const mainRegex = /<div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 relative overflow-hidden z-0 flex flex-col">/;
tsx = tsx.replace(mainRegex, `<div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 relative overflow-hidden z-0 flex flex-col bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('" + iplLogoUrl + "')" }}>
      {/* White frost overlay so the IPL logo is visible but soft enough to refract beautifully through the glass UI */}
      <div className="absolute inset-0 bg-slate-50/80 pointer-events-none -z-20"></div>`);

fs.writeFileSync('src/App.tsx', tsx);
