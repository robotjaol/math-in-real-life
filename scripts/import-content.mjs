import fs from "node:fs";
import path from "node:path";
import { recipe } from "./math-recipes.mjs";
const root=process.cwd(), source=path.join(root,"reference"), dest=path.join(root,"public/content");
fs.mkdirSync(dest,{recursive:true}); fs.mkdirSync(path.join(root,"src/data"),{recursive:true});
const section=(s,name)=>s.match(new RegExp("### "+name+"\\s+([\\s\\S]*?)(?=\\n### |$)"))?.[1].trim()??"";
const field=(s,name)=>s.match(new RegExp("\\*\\*"+name+":\\*\\* (.*)"))?.[1].trim()??"";
const bands=["Foundation","Quantitative Literacy","Structured Algebra","Data & Probability","Modeling & Regression","Optimization Foundations","Operations Research","Calculus for Decisions","Numerical & Dynamic Models","Advanced Modeling"];
const dims=["conceptComplexity","variableCount","reasoningDepth","dataComplexity","constraintCount","operationComplexity","abstractionLevel","uncertainty","interpretationComplexity","decisionComplexity"];
const phases=["formulation","model","calculation","validation","interpretation","decision"];
const framework=["Tujuan nyata","Variabel","Data","Relevansi","Satuan","Asumsi","Model","Metode","Perhitungan","Validasi","Interpretasi","Keputusan"];
const metadata=[],levels=[],audit=[],formulas=[];
const mix=(a,seed)=>{const result=[...a];let state=seed;for(let i=result.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;};
const rubric=(id,type,phase,prompt,criteria,weight=1)=>({id,type,phase,prompt,validator:{kind:"rubric",criteria},weight,explanation:criteria.join("; ")});
for(let level=1;level<=100;level++){
  const raw=fs.readFileSync(path.join(source,`question-bank/LEVEL-${String(level).padStart(3,"0")}.md`),"utf8");
  const topic=field(raw,"Primary concept"),complexity=field(raw,"Progression target");
  levels.push({level,topic,band:bands[Math.floor((level-1)/10)],complexity,count:50});
  const chunks=raw.split(/\r?\n(?=## L\d{3}-Q\d{2})/).slice(1),questions=[];
  if(chunks.length!==50)throw Error(`L${level}: ${chunks.length} questions`);
  for(const [idx,block] of chunks.entries()){
    const heading=block.match(/^## (L\d{3}-Q\d{2}) — (.+)/),id=heading[1],title=heading[2];
    const problem=section(block,"Problem Statement").split("**Data representation")[0].trim();
    const originalModel=section(block,"Recommended / Expected Mathematical Model"), originalKey=section(block,"Answer / Model Key"),r=recipe(level,problem,originalKey);
    const types=field(block,"Interaction").split(", "),domain=field(block,"Domain"),role=field(block,"Role");
    const profile=[...field(block,"Difficulty").matchAll(/=(\d)\/5/g)].map(m=>Number(m[1]));
    const difficulty=Object.fromEntries(dims.map((d,i)=>[d,profile[i]]));
    const numeric=r.outputs.map((o,i)=>({id:`answer-${i}`,type:r.outputs.length>1?"Multiple Numeric Inputs":"Numeric Answer",phase:"calculation",prompt:o.label,validator:{kind:"numeric",value:o.value,tolerance:o.tolerance,unit:o.unit},weight:level>=30?.7:1,explanation:`${o.expression} = ${o.value} ${o.unit}`}));
    const interactions=[];
    const opts=mix([r.model,"Gunakan seluruh angka tanpa memeriksa hubungan atau satuan.","Ambil nilai terbesar sebagai jawaban tanpa model."],level*53+idx);
    if(types.includes("Equation Builder")){
      const tokens=r.model.split(/\s+/).filter(Boolean);
      interactions.push({id:"model",type:"Equation Builder",phase:"model",prompt:"Susun token model pembanding. Pada jawaban terbuka Anda boleh mengusulkan model alternatif dengan asumsi berbeda.",options:mix(tokens,level+idx),validator:{kind:"equation",tokens},weight:1,explanation:r.model});
    } else interactions.push({id:"model",type:types.includes("Multiple Choice")?"Multiple Choice":"Formula Selection",phase:"model",prompt:"Pilih hubungan yang sesuai untuk checkpoint matematis pada soal ini.",options:opts,validator:{kind:"choice",value:r.model},weight:level>=30?.35:1,explanation:r.model});
    if(types.includes("Variable Identification"))interactions.unshift({id:"variables",type:"Variable Identification",phase:"formulation",prompt:"Pilih seluruh besaran yang perlu diperoleh pada checkpoint.",options:mix([...r.outputs.map(o=>o.label),"Warna tampilan laporan"],idx+87),validator:{kind:"set",values:r.outputs.map(o=>o.label)},weight:1,explanation:r.outputs.map(o=>o.label).join(", ")});
    if(types.some(t=>/Classification|Relevant/.test(t))||level===25){
      interactions.unshift({id:"relevance",type:"Data Classification",phase:"formulation",prompt:"Pilih informasi yang diperlukan untuk model checkpoint. Metadata tambahan: laporan dicetak pada kertas berwarna biru; warna tidak mengubah operasi.",options:mix(["Data numerik dan hubungan pada problem statement","Definisi satuan dan periode analisis","Warna kertas laporan"],idx+51),validator:{kind:"set",values:["Data numerik dan hubungan pada problem statement","Definisi satuan dan periode analisis"]},weight:1,explanation:"Warna kertas tidak memengaruhi nilai, relasi, atau constraint."});
    }
    if(types.includes("Step Ordering"))interactions.push({id:"steps",type:"Step Ordering",phase:"model",prompt:"Urutkan langkah penyelesaian.",options:mix(["Identifikasi data dan satuan","Bentuk hubungan matematis","Hitung output","Uji hasil terhadap konteks"],idx+17),validator:{kind:"ordered",values:["Identifikasi data dan satuan","Bentuk hubungan matematis","Hitung output","Uji hasil terhadap konteks"]},weight:.7,explanation:"Formulasi mendahului perhitungan, validasi dilakukan setelahnya."});
    if(types.includes("Unit Selection"))interactions.push({id:"units",type:"Unit Selection",phase:"formulation",prompt:`Pilih satuan untuk ${r.outputs[0].label}.`,options:mix([...new Set([r.outputs[0].unit,"kelvin","candela"])],idx+21),validator:{kind:"choice",value:r.outputs[0].unit},weight:.5,explanation:`Dimensi output: ${r.outputs[0].unit}.`});
    interactions.push(...numeric);
    if(level>=20||types.some(t=>/Model Building|Open Calculation|Optimization|Scenario|Sensitivity|What If/.test(t)))interactions.push(rubric("reasoning",types.find(t=>/Model Building|Open Calculation|Optimization|Scenario|Sensitivity|What If/.test(t))??"Model Building","formulation","Tuliskan variabel, data relevan, asumsi, constraint, dan metode yang Anda gunakan.",["Variabel dan satuannya didefinisikan; known dan unknown dipisahkan.","Relasi model sesuai tujuan dan data; bukan sekadar memilih formula.",...(level>=25?["Asumsi dan batasan eksplisit, termasuk data yang tidak dipakai."]:[]),...(level>=75?["Metode dipilih dengan alasan serta batas akurasi/kelayakannya."]:[])],2));
    if(level>=20)interactions.push(rubric("validation","Open Calculation","validation","Bagaimana Anda memeriksa hasil? Tunjukkan minimal satu pemeriksaan yang dapat direproduksi.",["Satuan, tanda, dan skala hasil konsisten.","Substitusi balik, batas, atau constraint diperiksa dengan data konkret.",...(level>=40?["Perubahan satu parameter diuji dan dampaknya dijelaskan."]:[])],1));
    for(const type of types.filter(t=>/Table Interpretation|Chart Interpretation|Graph Interpretation|Error Detection|Estimate/.test(t)))interactions.push(rubric(`interpret-${type.replaceAll(" ","-")}`,type,"interpretation",type==="Error Detection"?"Identifikasi kesalahan pada pendekatan ‘gunakan angka terbesar tanpa satuan’, lalu perbaiki dengan model soal.":"Interpretasikan data dan representasinya; jelaskan apa yang dapat dan tidak dapat disimpulkan.",["Pernyataan mengacu pada angka atau relasi konkret dalam soal.","Interpretasi tidak melampaui informasi yang tersedia."],1));
    if(level>=10)interactions.push(rubric("decision","Decision Making","decision","Jelaskan arti hasil dan keputusan yang dapat dipertanggungjawabkan.",["Interpretasi menghubungkan hasil ke objective nyata.","Keputusan mengikuti hasil, constraint, dan keterbatasan data.",...(level>=50?["Minimal satu alternatif atau trade-off dibandingkan."]:[]),...(level>=91?["Uncertainty dan sensitivity dianalisis; minimal tiga constraints dinyatakan."]:[])],1.5));
    const knownVariables=[...problem.matchAll(/[-+]?\d+(?:\.\d+)?(?:%|°)?/g)].slice(0,32).map((m,i)=>({key:`data-${i}`,label:problem.slice(Math.max(0,m.index-24),Math.min(problem.length,m.index+m[0].length+24)).replaceAll("`",""),value:m[0],unit:"lihat konteks",role:"known",visibleInitially:level<25}));
    const unknownVariables=r.outputs.map((o,i)=>({key:`output-${i}`,label:o.label,unit:o.unit,role:"unknown",visibleInitially:level<25}));
    const assumptions=[section(block,"Assumptions Policy"),...r.notes];
    const q={id,version:1,level,difficulty,domain,scenario:{title,context:section(block,"Scenario"),role,objective:field(block,"Learning Objective")},problem,
      learningObjectives:[field(block,"Learning Objective")],mathematicalTopics:[topic],competencies:phases.map(p=>({id:p,weight:p==="model"||p==="formulation"?2:1})),
      knownVariables,unknownVariables,units:[...new Set(r.outputs.map(o=>o.unit))].map(u=>({symbol:u,dimension:u})),constraints:[section(block,"Validation Requirement")],assumptions,
      dataBlocks:[...(r.extra?[{type:"prose",title:"Asumsi dan checkpoint pembanding",text:r.extra}]:[]),...(r.visuals.length?[]:[{type:"prose",title:"Data sumber",text:problem}])],
      distractors:interactions.some(i=>i.id==="relevance")?[{label:"Warna kertas laporan",rationale:"Metadata tidak memengaruhi model."}]:[],requiredOutputs:r.outputs.map(o=>o.label),recommendedModels:[{name:topic,equation:r.model}],reasoningSteps:framework,interactions,
      hints:[`Mulai dari tujuan: apa besaran yang perlu ditentukan dalam konteks ${domain}?`,`Checkpoint meminta ${r.outputs.map(o=>o.label).join(", ")}. Cocokkan data dan satuan sebelum menghitung.`,`Model pembanding: ${r.model}`,`Setup langkah pertama: ${r.outputs[0].expression}. Hitung sendiri dan periksa unitnya.`,"Buka pembahasan bertahap: formulasi, perhitungan, validasi, interpretasi, dan keputusan."],
      solution:{modelingTranslation:`Masalah ${topic} diterjemahkan menjadi ${r.model}. ${r.extra}`,variableExplanation:unknownVariables.map(v=>`${v.label}: ${v.unit}`),relevantDataRationale:["Data numerik berasal dari problem statement; setiap langkah di bawah menunjukkan nilai yang digunakan.",...r.notes],assumptionsRationale:assumptions,selectedMethod:topic,methodRationale:`Gunakan hubungan ${r.model} karena mengaitkan input dengan checkpoint yang diminta. Model alternatif harus menyatakan asumsi dan menghasilkan pemeriksaan yang dapat direproduksi.`,calculations:r.calculations,finalAnswer:r.outputs.map(o=>`${o.label} = ${Number(o.value.toFixed(5))} ${o.unit}`).join("; "),validation:[section(block,"Validation Requirement"),...r.outputs.map(o=>`${o.label}: evaluasi ulang ${o.expression}; toleransi jawaban ±${o.tolerance} ${o.unit}.`)],interpretation:r.interpretation,decision:r.decision,alternatives:["Model pembanding bukan satu-satunya model valid untuk pertanyaan terbuka. Bandingkan objective, asumsi, feasibility, dan hasil sebelum memilih."],sensitivity:r.sensitivity},
      commonMistakes:[{tag:"wrong unit",description:"Mencampur satuan atau mengabaikan periode analisis."},{tag:"wrong model",description:`Memilih operasi tanpa memeriksa hubungan ${r.model}.`},{tag:"wrong interpretation",description:"Menganggap hasil checkpoint otomatis cukup untuk semua keputusan, meskipun asumsi atau threshold belum tersedia."}],formulas:[{name:topic,expression:r.model}],visualizations:r.visuals,estimatedMinutes:Number.parseInt(field(block,"Estimated Time")),tags:[topic,domain,...types],authoring:{originalModel,originalKey,notes:r.notes}};
    questions.push(q);metadata.push({id,level,domain,estimatedMinutes:q.estimatedMinutes,title,topic,types:[...new Set([...types,...interactions.map(i=>i.type)])],difficulty:Math.round(profile.reduce((sum,v,i)=>sum+(v-1)*[.14,.1,.14,.1,.1,.1,.08,.08,.08,.08][i],0)*25),competencies:phases});
    if(r.notes.length)audit.push({id,notes:r.notes});
    if(idx===0)formulas.push({level,topic,expression:r.model,exampleId:id,units:q.units.map(u=>u.symbol)});
  }
  fs.writeFileSync(path.join(dest,`level-${String(level).padStart(3,"0")}.json`),JSON.stringify(questions));
}
fs.writeFileSync(path.join(dest,"index.json"),JSON.stringify(metadata));
fs.writeFileSync(path.join(root,"src/data/curriculum.json"),JSON.stringify(levels,null,2));
fs.writeFileSync(path.join(root,"src/data/formulas.json"),JSON.stringify(formulas,null,2));
fs.writeFileSync(path.join(dest,"audit.json"),JSON.stringify({version:1,records:metadata.length,notes:audit}));
console.log(`Imported ${metadata.length} questions, ${levels.length} levels. ${audit.length} records contain explicit authoring clarification notes.`);
