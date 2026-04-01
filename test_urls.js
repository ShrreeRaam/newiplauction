import fs from 'fs';
const urls = [
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/playerheadshot/ipl/284/164.png',
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/164.png',
  'https://scores.iplt20.com/ipl/playerimages/164.png',
  'https://www.iplt20.com/assets/images/teams/captain/164.png',
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/1.png',
  "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/playerheadshot/ipl/2023/164.png",
  "https://bcciplayerimages.s3.ap-south-1.amazonaws.com/playerheadshot/ipl/284/1.png",
  "https://documents.iplt20.com/ipl/IPLHeadshot2024/164.png"
];

const results = await Promise.all(urls.map(async url => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { url, status: res.status };
  } catch (e) {
    return { url, error: e.message };
  }
}));

fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
