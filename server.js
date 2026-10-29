const express=require('express');const http=require('http');const {Server}=require('socket.io');const crypto=require('crypto');const verbs=require('./verbs.json');
const app=express(), server=http.createServer(app), io=new Server(server,{cors:{origin:'*'}});app.use(express.static('public'));
const rooms=new Map();const random=arr=>arr.sort(()=>Math.random()-.5);const id=()=>crypto.randomBytes(12).toString('hex');
function roomView(r){return {pin:r.pin,started:r.started,ended:r.ended,winner:r.winner,players:[...r.players.values()].map(p=>({name:p.name,position:p.position,connected:!!p.socket,host:p.host})).sort((a,b)=>b.position-a.position||a.name.localeCompare(b.name))};}
function emitRoom(r){io.to(r.pin).emit('room',roomView(r));}
// Keep the same base verb in every choice. Two plausible mistakes and one
// more obvious mistake replace unrelated forms from other verbs.
function choices(v){
 const [base,past,part]=[v[1],v[2],v[3]];
 const format=(a,b)=>[base,a,b].join(' – ');
 const correct=format(past,part);
 const ing=base.endsWith('ie')?base.slice(0,-2)+'ying':base.endsWith('e')&&!base.endsWith('ee')?base.slice(0,-1)+'ing':base+'ing';
 const ed=base.endsWith('e')?base+'d':base.endsWith('y')&&!/[aeiou]y$/.test(base)?base.slice(0,-1)+'ied':base+'ed';
 const plausible=random([
  format(ed,part),format(past,ed),format(ed,ed),
  format(base,part),format(past,base),format(part,past),
  format(past,ing),format(ing,part),format(base,past),
  format(part,base),format(ing,past)
 ].filter(x=>x!==correct));
 const close=[...new Set(plausible)].slice(0,2);
 const obvious=[format(ing,ing),format(base,ing),format(ing,base)]
  .find(x=>x!==correct&&!close.includes(x));
 return random([correct,...close,obvious]);
}
function draw(p){if(!p.deck.length)p.deck=random([...Array(verbs.length).keys()]);const idx=p.deck.pop(),v=verbs[idx];const correct=[v[1],v[2],v[3]].join(' – ');const opts=choices(v);p.question={idx,correct,opts,answered:false};if(p.socket)io.to(p.socket).emit('question',{spanish:v[0],base:v[1],emoji:v[4],options:opts,position:p.position,questionNumber:p.seen+1});p.seen++;}
function response(socket,event,data){socket.emit('notice',{event,...data});}
io.on('connection',s=>{
 s.on('create',({name},cb)=>{name=String(name||'Teacher Andrés').trim().slice(0,24);let pin;do{pin=String(Math.floor(100000+Math.random()*900000));}while(rooms.has(pin));const token=id(),p={token,name,host:true,position:0,deck:[],seen:0,socket:s.id,question:null};const r={pin,started:false,ended:false,winner:null,host:token,players:new Map([[token,p]])};rooms.set(pin,r);s.join(pin);s.data={pin,token};cb({ok:true,pin,token,host:true});emitRoom(r);});
 s.on('join',({pin,name},cb)=>{const r=rooms.get(String(pin));if(!r)return cb({error:'Room not found'});if(r.started)return cb({error:'Game already started; no new players allowed'});if(r.players.size>=20)return cb({error:'Room is full (20 players including teacher)'});name=String(name||'').trim().slice(0,24);if(!name)return cb({error:'Please enter your name'});if([...r.players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase()))return cb({error:'Name already in use'});const token=id(),p={token,name,host:false,position:0,deck:[],seen:0,socket:s.id,question:null};r.players.set(token,p);s.join(r.pin);s.data={pin:r.pin,token};cb({ok:true,pin:r.pin,token,host:false});emitRoom(r);});
 s.on('resume',({pin,token},cb)=>{const r=rooms.get(String(pin)),p=r?.players.get(token);if(!p)return cb({error:'Session not found; the server may have restarted'});if(p.socket&&p.socket!==s.id){const old=io.sockets.sockets.get(p.socket);if(old){old.emit('notice',{event:'superseded'});old.disconnect(true);}}p.socket=s.id;s.data={pin:r.pin,token};s.join(r.pin);cb({ok:true,pin:r.pin,token,host:p.host});emitRoom(r);if(r.started&&!r.ended){if(p.question&&!p.question.answered){const v=verbs[p.question.idx];s.emit('question',{spanish:v[0],base:v[1],emoji:v[4],options:p.question.opts,position:p.position,questionNumber:p.seen});}else if(p.question?.answered){s.emit('feedback',p.question.feedback);setTimeout(()=>{if(p.socket===s.id&&!r.ended)draw(p);},3000);}else draw(p);}});
 s.on('start',(_,cb)=>{const r=rooms.get(s.data?.pin);if(!r||r.host!==s.data.token)return cb?.({error:'Only the teacher can start'});if(r.started)return cb?.({error:'Already started'});r.started=true;cb?.({ok:true});emitRoom(r);for(const p of r.players.values())draw(p);});
 s.on('answer',({index},cb)=>{const r=rooms.get(s.data?.pin),p=r?.players.get(s.data?.token);if(!r?.started||r.ended||!p?.question||p.question.answered)return cb?.({error:'Not accepting answers'});if(!Number.isInteger(index)||index<0||index>3)return cb?.({error:'Invalid option'});p.question.answered=true;const correct=p.question.opts[index]===p.question.correct;const before=p.position;p.position=correct?Math.min(100,p.position+1):Math.max(0,p.position-5);p.question.feedback={correct,correctAnswer:p.question.correct,before,position:p.position};cb?.({ok:true});if(p.socket)io.to(p.socket).emit('feedback',p.question.feedback);if(p.position===100){r.ended=true;r.winner=p.name;emitRoom(r);io.to(r.pin).emit('finished',{winner:p.name});return;}emitRoom(r);setTimeout(()=>{if(!r.ended&&p.question?.answered)draw(p);},3000);});
 s.on('disconnect',()=>{const r=rooms.get(s.data?.pin),p=r?.players.get(s.data?.token);if(p&&p.socket===s.id){p.socket=null;emitRoom(r);}});
});
server.listen(process.env.PORT||3000,()=>console.log('IRREGULAR RACE listening on',process.env.PORT||3000));
