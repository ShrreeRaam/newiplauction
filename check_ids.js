import fs from 'fs';
import path from 'path';

const RAW_PLAYERS = [
  { id: '164', name: "Virat Kohli" },
  { id: '107', name: "Rohit Sharma" },
  { id: '1', name: "MS Dhoni" },
  { id: '2972', name: "Rishabh Pant" },
  { id: '2740', name: "Hardik Pandya" },
  { id: '1124', name: "Jasprit Bumrah" },
  { id: '2885', name: "Rashid Khan" },
  { id: '1235', name: "Mitchell Starc" },
  { id: '488', name: "Pat Cummins" },
  { id: '4013', name: "Romario Shepherd" }, // the one that failed
  { id: '3761', name: "Shubman Gill" },
  { id: '4005', name: "Azmatullah Omarzai" }
];

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status;
  } catch (e) {
    return 500;
  }
}

async function run() {
  const broken = [];
  const working = [];
  
  for (const p of RAW_PLAYERS) {
    const url1 = `https://scores.iplt20.com/ipl/playerimages/${p.id}.png`;
    const url2 = `https://documents.iplt20.com/ipl/IPLHeadshot2024/${p.id}.png`;
    const url3 = `https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/${p.id}.jpg`;
    
    let ok = false;
    let s1 = await checkUrl(url1);
    if (s1 === 200) ok = true;
    else {
      let s2 = await checkUrl(url2);
      if (s2 === 200) ok = true;
    }
    
    if (ok) working.push(p.name);
    else broken.push(p.name + ` (ID: ${p.id})`);
  }
  
  console.log("WORKING:", working.length);
  console.log("BROKEN:", broken.length);
  console.log("Broken list:", broken);
}

run();
