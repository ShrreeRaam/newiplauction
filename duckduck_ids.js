import fs from 'fs';

const playersToFind = [
  "Riyan Parag", "Nehal Wadhera", "Shahrukh Khan", "Rahul Tewatia", 
  "Ayush Badoni", "Jitesh Sharma", "Prabhsimran Singh", "Dhruv Jurel", 
  "Sameer Rizvi", "Yash Dayal", "Harshit Rana", "Mukesh Kumar", 
  "Akash Madhwal", "Mayank Yadav", "Suyash Sharma", "Kartik Tyagi", 
  "Abdul Samad", "Dewald Brevis", "Tristan Stubbs", "Jake Fraser-McGurk", 
  "Rachin Ravindra", "Azmatullah Omarzai", "Gerald Coetzee", "Dilshan Madushanka", 
  "Noor Ahmad", "Naveen-ul-Haq", "Tim David", "Romario Shepherd", 
  "Sherfane Rutherford", "Matthew Short", "MS Dhoni", "Hardik Pandya", "Rishabh Pant"
];

async function getPlayerId(name) {
  try {
    const query = encodeURIComponent(`site:iplt20.com/teams ${name}`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`);
    const html = await res.text();
    
    // look for hrefs containing iplt20.com/teams/.../(\d+)
    const match = html.match(/class="result__url" href="[^"]+squad-details(?:%2F|\/)(\d+)/i);
    if (match) {
      return match[1];
    }
    
    // Sometimes it's just /players/(\d+)
    const match2 = html.match(/class="result__url" href="[^"]+(?:%2F|\/)(\d+)"/i);
    if (match2) return match2[1];
    
    return null;
  } catch (e) {
    return null;
  }
}

async function run() {
  const map = {};
  for (const name of playersToFind) {
    const id = await getPlayerId(name);
    map[name] = id;
    console.log(`${name}: ${id}`);
    await new Promise(r => setTimeout(r, 1000)); // Delay to avoid rate limit
  }
  fs.writeFileSync('id_map.json', JSON.stringify(map, null, 2));
}

run();
