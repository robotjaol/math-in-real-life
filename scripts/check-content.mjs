import fs from "node:fs";
const ids=new Set(); let total=0,automatic=0,manual=0;
for(let level=1;level<=100;level++){
  const questions=JSON.parse(fs.readFileSync(`public/content/level-${String(level).padStart(3,"0")}.json`,"utf8"));
  if(questions.length!==50)throw Error(`L${level} must have 50 questions`);
  for(const [idx,q] of questions.entries()){
    const expected=`L${String(level).padStart(3,"0")}-Q${String(idx+1).padStart(2,"0")}`;
    if(q.id!==expected||ids.has(q.id)||q.level!==level)throw Error(`Invalid ID ${q.id}`); ids.add(q.id); total++;
    for(const key of ["problem","scenario","solution","interactions","hints","knownVariables","unknownVariables","difficulty","commonMistakes"]){if(!q[key]||!Object.keys(q[key]).length)throw Error(`${q.id}: missing ${key}`);}
    if(q.hints.length!==5||Object.values(q.difficulty).some(v=>!Number.isInteger(v)||v<1||v>5))throw Error(`${q.id}: invalid hint/difficulty`);
    const interactionIds=new Set();
    for(const i of q.interactions){if(interactionIds.has(i.id))throw Error(`Duplicate interaction ${q.id}:${i.id}`);interactionIds.add(i.id);const v=i.validator;
      if(v.kind==="numeric"){if(!Number.isFinite(v.value)||v.tolerance<0||!v.unit)throw Error(`${q.id}: invalid numeric`);automatic++;}
      if(v.kind==="rubric"){if(v.criteria.length<2)throw Error(`${q.id}: missing rubric`);manual++;}
      if(v.kind==="choice"&&!i.options.includes(v.value))throw Error(`${q.id}: missing choice key`);
      if(v.kind==="ordered"||v.kind==="set"){if(v.values.some(x=>!i.options.includes(x)))throw Error(`${q.id}: missing option`);}
    }
    if(q.solution.calculations.some(s=>typeof s.result==="number"&&!Number.isFinite(s.result)))throw Error(`${q.id}: invalid solution`);
  }
}
const index=JSON.parse(fs.readFileSync("public/content/index.json","utf8"));
if(total!==5000||index.length!==total||index.some(q=>!ids.has(q.id)))throw Error("Index mismatch");
console.log(`Content OK: ${total} unique questions, 100 × 50; ${automatic} numeric checkpoints; ${manual} self-assessment rubrics.`);
