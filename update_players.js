import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/players.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// List of all Indian players spanning BOTH lists (2025 & Legends)
const indianPlayers = new Set([
  "Virat Kohli", "Rohit Sharma", "Shubman Gill", "KL Rahul", "Suryakumar Yadav", 
  "Yashasvi Jaiswal", "Ruturaj Gaikwad", "Shreyas Iyer", "Tilak Varma", "Rinku Singh", 
  "Devdutt Padikkal", "Rahul Tripathi", "Abhishek Sharma", "Sai Sudharsan", "Prithvi Shaw", 
  "Mayank Agarwal", "Ajinkya Rahane", "MS Dhoni", "Rishabh Pant", "Ishan Kishan", 
  "Sanju Samson", "Hardik Pandya", "Ravindra Jadeja", "Axar Patel", "Shivam Dube", 
  "Washington Sundar", "Deepak Hooda", "Shardul Thakur", "Jasprit Bumrah", "Mohammed Shami", 
  "Mohammed Siraj", "Arshdeep Singh", "Prasidh Krishna", "Bhuvneshwar Kumar", "T Natarajan", 
  "Deepak Chahar", "Avesh Khan", "Yuzvendra Chahal", "Kuldeep Yadav", "Ravi Bishnoi", 
  "Varun Chakravarthy", "Riyan Parag", "Nehal Wadhera", "Shahrukh Khan", "Rahul Tewatia", 
  "Ayush Badoni", "Jitesh Sharma", "Prabhsimran Singh", "Dhruv Jurel", "Sameer Rizvi", 
  "Yash Dayal", "Harshit Rana", "Mukesh Kumar", "Akash Madhwal", "Mayank Yadav", 
  "Suyash Sharma", "Kartik Tyagi", "Abdul Samad", "Suresh Raina", "Robin Uthappa", 
  "Ambati Rayudu", "Yuvraj Singh", "Gautam Gambhir", "Virender Sehwag", "Zaheer Khan", 
  "Harbhajan Singh", "Wriddhiman Saha", "Dinesh Karthik", "Umran Malik", "Harshal Patel", 
  "Rajat Patidar", "Nitish Rana", "Venkatesh Iyer", "Krunal Pandya", "Sarfaraz Khan", 
  "Manish Pandey", "Khaleel Ahmed", "Ishant Sharma", "Umesh Yadav", "Sandeep Sharma", 
  "Jaydev Unadkat", "Karn Sharma", "Rahul Chahar", "Mayank Markande", "Piyush Chawla", 
  "Amit Mishra", "Anukul Roy", "Shahbaz Ahmed", "Lalit Yadav", "Abishek Porel", "Shikhar Dhawan"
]);

// 1. Update the Player interface
content = content.replace(
  "role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';",
  "role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';\n  isOverseas: boolean;"
);

// 2. Add isOverseas to the objects
content = content.replace(/\{ id:\s*['"][^'"]+['"],\s*name:\s*["']([^"']+)["'][^}]+\}/g, (match, name) => {
  const isOv = !indianPlayers.has(name);
  // insert before the closing bracket
  return match.replace(/ \}/, `, isOverseas: ${isOv} }`);
});

fs.writeFileSync(filePath, content);
console.log('Successfully updated players.ts with isOverseas flag.');
