import axios from 'axios';
import fs from 'fs';

const queries = ["Dhoni", "Pant", "Hardik", "Bumrah", "Starc", "Cummins", "Romario", "Shubman", "Azmatullah", "Riyan Parag"];

async function searchIPL(name) {
  try {
    const res = await axios.get(`https://bcci.tv/api/player/search?search_term=${encodeURIComponent(name)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    return res.data;
  } catch (error) {
    return error.message;
  }
}

async function run() {
  for (const q of queries) {
    console.log(`Searching ${q}:`);
    const data = await searchIPL(q);
    console.log(data);
  }
}

run();
