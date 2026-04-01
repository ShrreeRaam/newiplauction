import fs from 'fs';
import path from 'path';
import https from 'https';

const RAW_PLAYERS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/players.ts'), 'utf8').match(/RAW_IPL_2025_PLAYERS: Player\[\] = (\[[^\]]+\]);/s)[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));

async function fetchCorrectId(playerName) {
  // Let's use the Cricbuzz or ESPN Cricinfo search API, or a similar open API
  // Actually, we need the scores.iplt20.com ID.
  // There is an undocumented API: https://scores.iplt20.com/ipl/feed/player/search?term=virat
  return new Promise((resolve) => {
    https.get(`https://search.iplt20.com/default/player/_search?q=${encodeURIComponent(playerName)}`, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          // just try to parse generic search
          resolve(data);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const result = await fetchCorrectId("MS Dhoni");
  console.log(result);
})();
