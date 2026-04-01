import fs from 'fs';
import https from 'https';
import path from 'path';

const playersToFix = [
  "Riyan Parag", "Nehal Wadhera", "Shahrukh Khan cricketer", "Rahul Tewatia", 
  "Ayush Badoni", "Jitesh Sharma", "Prabhsimran Singh", "Dhruv Jurel", 
  "Sameer Rizvi", "Yash Dayal", "Harshit Rana", "Mukesh Kumar cricketer", 
  "Akash Madhwal", "Mayank Yadav", "Suyash Sharma", "Kartik Tyagi", 
  "Abdul Samad cricketer", "Dewald Brevis", "Tristan Stubbs", "Jake Fraser-McGurk", 
  "Rachin Ravindra", "Azmatullah Omarzai", "Gerald Coetzee", "Dilshan Madushanka", 
  "Noor Ahmad", "Naveen-ul-Haq", "Tim David", "Romario Shepherd", 
  "Sherfane Rutherford", "Matthew Short", "MS Dhoni", "Hardik Pandya", "Rishabh Pant",
  "Jasprit Bumrah", "Mitchell Starc", "Pat Cummins", "Shubman Gill"
];

function apiCall(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'IPLAuctionApp/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchWikiImage(name) {
  // Step 1: OpenSearch to get exact title
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=1&format=json`;
  const searchRes = await apiCall(searchUrl);
  
  if (!searchRes || !searchRes[1] || searchRes[1].length === 0) return null;
  const exactTitle = searchRes[1][0];

  // Step 2: Get pageimage for exact title
  const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(exactTitle)}&prop=pageimages&format=json&pithumbsize=300`;
  const imgRes = await apiCall(imgUrl);
  
  if (!imgRes || !imgRes.query || !imgRes.query.pages) return null;
  const pages = imgRes.query.pages;
  const pageId = Object.keys(pages)[0];
  if (pageId && pageId !== '-1' && pages[pageId].thumbnail) {
    return pages[pageId].thumbnail.source;
  }
  return null;
}

async function run() {
  const map = {};
  for (let rawName of playersToFix) {
    let img = await fetchWikiImage(rawName);
    
    const realName = rawName.replace(/ cricketer/g, '');
    if (img) {
      map[realName] = img;
      console.log(`Found: ${realName}`);
    } else {
      console.log(`Not Found: ${realName}`);
    }
  }
  
  fs.writeFileSync(path.join(process.cwd(), 'src/custom_images.json'), JSON.stringify(map, null, 2));
  console.log('Saved to src/custom_images.json');
}

run();
