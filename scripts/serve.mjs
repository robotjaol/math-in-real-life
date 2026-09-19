import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve("out"),port=Number(process.env.PORT??3000);
const types={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".woff2":"font/woff2",".woff":"font/woff",".webmanifest":"application/manifest+json"};
http.createServer((req,res)=>{
  try{const url=new URL(req.url,"http://localhost");const file=path.resolve(root,"."+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}let target=file;if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,"index.html");if(!fs.existsSync(target)){res.writeHead(404,{"Content-Type":"text/html; charset=utf-8"});res.end(fs.readFileSync(path.join(root,"404.html")));return;}res.writeHead(200,{"Content-Type":types[path.extname(target)]??"application/octet-stream","Cache-Control":"no-cache"});fs.createReadStream(target).pipe(res);}catch{res.writeHead(400);res.end("Bad request");}
}).listen(port,"127.0.0.1",()=>console.log(`ModelMath static preview: http://127.0.0.1:${port}`));
