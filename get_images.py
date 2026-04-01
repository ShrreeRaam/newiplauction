import urllib.request
import urllib.parse
import re
import json
import time

players = [
  "Riyan Parag", "Nehal Wadhera", "Shahrukh Khan", "Rahul Tewatia", 
  "Ayush Badoni", "Jitesh Sharma", "Prabhsimran Singh", "Dhruv Jurel", 
  "Sameer Rizvi", "Yash Dayal", "Harshit Rana", "Mukesh Kumar", 
  "Akash Madhwal", "Mayank Yadav", "Suyash Sharma", "Kartik Tyagi", 
  "Abdul Samad", "Dewald Brevis", "Tristan Stubbs", "Jake Fraser-McGurk", 
  "Rachin Ravindra", "Azmatullah Omarzai", "Gerald Coetzee", "Dilshan Madushanka", 
  "Noor Ahmad", "Naveen-ul-Haq", "Tim David", "Romario Shepherd", 
  "Sherfane Rutherford", "Matthew Short", "MS Dhoni", "Hardik Pandya", "Rishabh Pant",
  "Jasprit Bumrah", "Mitchell Starc", "Pat Cummins", "Shubman Gill"
]

mapping = {}

def get_id(name):
    query = urllib.parse.quote_plus(f"site:iplt20.com/teams/ {name} sq")
    url = f"https://html.duckduckgo.com/html/?q={query}"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'})
    try:
        html = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
        match = re.search(r'class="result__url" href="[^"]+squad-[^"]*(?:%2F|/)(\d+)', html, re.I)
        if match: return match.group(1)
        
        match2 = re.search(r'class="result__url" href="[^"]+teams[^"]*(?:%2F|/)(\d+)[^"]*(?:%2F|/)[^"]+"', html, re.I)
        if match2: return match2.group(1)
        
    except Exception as e:
        print(f"Error {name}: {e}")
    return None

for p in players:
    pid = get_id(p)
    if pid:
        mapping[p] = pid
        print(f"Found: {p} -> {pid}")
    else:
        print(f"Not Found: {p}")
    time.sleep(2)

with open("real_ids.json", "w") as f:
    json.dump(mapping, f, indent=2)
