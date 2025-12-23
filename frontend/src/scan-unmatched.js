const fs=require('fs');
const s=fs.readFileSync('App.tsx','utf8');
let line=1,col=0;
let inSQ=false,inDQ=false,inT=false,inLC=false,inBC=false;
let braceStack=[], parenStack=[], bracketStack=[];
let i=0;
while(i<s.length){
  let ch=s[i];
  if(ch==='\n'){ line++; col=0; inLC=false; i++; continue; }
  col++;
  if(inLC){ i++; continue; }
  if(inBC){ if(ch==='*'&&s[i+1]=='/'){ inBC=false; i+=2; col++; continue;} i++; continue; }
  if(inSQ){ if(ch==='\\'){ i+=2; col++; continue;} if(ch==='\''){ inSQ=false; i++; continue;} i++; continue; }
  if(inDQ){ if(ch==='\\'){ i+=2; col++; continue;} if(ch==='"'){ inDQ=false; i++; continue;} i++; continue; }
  if(inT){ if(ch==='\\'){ i+=2; col++; continue;} if(ch==='`'){ inT=false; i++; continue;} i++; continue; }
  // comments
  if(ch==='/'&&s[i+1]=='/'){ inLC=true; i+=2; col++; continue; }
  if(ch==='/'&&s[i+1]=='*'){ inBC=true; i+=2; col++; continue; }
  // strings
  if(ch==='\''){ inSQ=true; i++; continue; }
  if(ch==='"'){ inDQ=true; i++; continue; }
  if(ch==='`'){ inT=true; i++; continue; }
  // regex detection (simple heuristic)
  if(ch==='/' ){
    let j=i-1; let prev=null;
    while(j>=0){ let c=s[j]; if(c==='\n'){ break; } if(!/\s/.test(c)){ prev=c; break; } j--; }
    if(prev===null || '([{:;,=!?&|^~+-*%<>'.includes(prev)){
      i++; col++; let inClass=false; let escaped=false;
      while(i<s.length){ let c=s[i]; if(c==='\n'){ line++; col=0; }
        if(escaped){ escaped=false; i++; col++; continue; }
        if(c==='\\'){ escaped=true; i++; col++; continue; }
        if(c==='['&&!inClass){ inClass=true; i++; col++; continue; }
        if(c===']'&&inClass){ inClass=false; i++; col++; continue; }
        if(c==='/'&&!inClass){ i++; col++; break; }
        i++; col++;
      }
      continue;
    }
  }
  // brackets
  if(ch==='('){ parenStack.push({line,col}); i++; continue; }
  if(ch===')'){ if(parenStack.length===0){ console.log('Extra ) at',line,col); } else { parenStack.pop(); } i++; continue; }
  if(ch==='['){ bracketStack.push({line,col}); i++; continue; }
  if(ch===']'){ if(bracketStack.length===0){ console.log('Extra ] at',line,col); } else { bracketStack.pop(); } i++; continue; }
  if(ch==='{'){ braceStack.push({line,col}); i++; continue; }
  if(ch==='}'){ if(braceStack.length===0){ console.log('Extra } at',line,col); } else { braceStack.pop(); } i++; continue; }
  i++;
}
console.log('Unclosed braces (last 5):', braceStack.slice(-5));
console.log('Unclosed parens (last 5):', parenStack.slice(-5));
console.log('Unclosed brackets (last 5):', bracketStack.slice(-5));
