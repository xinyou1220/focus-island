const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const sourcePath = require('path').join(__dirname, '..', 'index.html');
const html = fs.readFileSync(sourcePath, 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const instrumented = script.replace(/\}\)\(\);\s*$/, 'globalThis.appTest={getState:()=>state,validateState,newTimer,setFocus,tick,finishTimer,addTask,showPlant,save,remaining};})();');
class FakeNode {
  constructor(tag='div') { this.tagName=tag; this.children=[]; this.attributes={}; this.dataset={}; this.listeners={}; this.style={setProperty(){}}; this.classList={add(){},remove(){},toggle(){}}; this.textContent=''; this.value=''; this.open=false; this.hidden=false; this.disabled=false; this.selectors={}; }
  setAttribute(k,v){this.attributes[k]=String(v);}
  removeAttribute(k){delete this.attributes[k];}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  querySelector(s){return this.selectors[s]||(this.selectors[s]=new FakeNode(s));}
  addEventListener(name,callback){(this.listeners[name]||=([])).push(callback);}
  focus(){} select(){} close(){this.open=false;} showModal(){this.open=true;}
  async dispatch(name,event={}){event.preventDefault||=(()=>{}); for(const callback of this.listeners[name]||[]) await callback(event);}
}
function run(options={}){
  const nodes=new Map(); const get=id=>nodes.get(id)||nodes.set(id,new FakeNode()).get(id);
  const groups={};
  for(const attr of ['minutes','filter','suggestion','close','nav']){
    groups['[data-'+attr+']']=[];
    const re=new RegExp('<[^>]*data-'+attr+'="([^"]*)"[^>]*>','g'); let m;
    while(m=re.exec(html)){const node=new FakeNode('button'); node.dataset[attr]=m[1]; groups['[data-'+attr+']'].push(node);}
  }
  const document={getElementById:get,querySelectorAll:s=>groups[s]||[],createElement:tag=>new FakeNode(tag),createElementNS:(_,tag)=>new FakeNode(tag),createTextNode:text=>({textContent:text}),addEventListener(){},hidden:false,title:''};
  let now=options.now??Date.parse('2026-10-16T04:00:00Z'),stored=options.raw??null,nextTimer=1; const timers=new Map();
  class ClockDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const context={Date:ClockDate,Intl,Math,Set,Number,String,Boolean,Array,Object,JSON,Promise,SyntaxError,Error,console,document,crypto:{randomUUID:()=>`test-${nextTimer++}`},setTimeout:(callback,delay)=>{const id=nextTimer++;timers.set(id,{callback,when:now+delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>nextTimer++,localStorage:{getItem(){if(options.failRead)throw new Error('denied');return stored;},setItem(_,v){if(options.failWrite)throw new Error('quota');stored=v;}},window:{matchMedia:()=>({matches:true}),addEventListener(){}}};
  vm.createContext(context); vm.runInContext(instrumented,context,{filename:sourcePath});
  return {api:context.appTest,get,groups,raw:()=>stored,advance(ms){now+=ms;context.appTest.tick();},async click(id){await get(id).dispatch('click');},now:()=>now};
}
function serial(x){return JSON.parse(JSON.stringify(x));}
const results=[];
function test(name,fn){try{fn();results.push({name,result:'PASS'});}catch(e){results.push({name,result:'FAIL',error:e.message});}}
(async()=>{
  let r=run();r.api.setFocus(1);await r.click('startButton');r.advance(60000);
  test('1-minute formal completion awards 1 plant and minute',()=>{assert.equal(r.api.getState().timer.status,'completed');assert.equal(r.api.getState().plants.length,1);assert.equal(r.api.getState().plants[0].minutes,1);assert.equal(String(r.get('todayMinutes').textContent),'1');assert.equal(String(r.get('todayRounds').textContent),'1');});
  const completed=r.raw();r.advance(1000);r=run({raw:completed});
  test('completed refresh does not award duplicate',()=>assert.equal(r.api.getState().plants.length,1));
  r=run();await r.click('breakMode');await r.click('startButton');r.advance(300000);
  test('5-minute break completes without plants or formal stats',()=>{assert.equal(r.api.getState().timer.status,'completed');assert.equal(r.api.getState().plants.length,0);assert.equal(String(r.get('todayMinutes').textContent),'0');assert.equal(String(r.get('todayRounds').textContent),'0');});
  r=run();r.api.setFocus(1);await r.click('startButton');const runningRaw=r.raw();const after=r.now()+61000;r=run({raw:runningRaw,now:after});
  test('expired running session settles on refresh exactly once',()=>{assert.equal(r.api.getState().plants.length,1);assert.equal(r.api.getState().timer.status,'completed');const second=run({raw:r.raw(),now:after+1000});assert.equal(second.api.getState().plants.length,1);});
  r=run({raw:'{broken-json'});
  test('corrupted JSON recovers with warning and usable tasks',()=>{assert.equal(r.api.getState().tasks.length,0);assert.match(r.get('storageDetail').textContent,/無法讀取/);assert.equal(r.api.addTask('恢復測試'),true);assert.equal(r.api.getState().tasks.length,1);assert.ok(JSON.parse(r.raw()));});
  r=run({raw:JSON.stringify({version:1,tasks:'bad'})});
  test('invalid shape recovers with warning',()=>{assert.equal(r.api.getState().tasks.length,0);assert.match(r.get('storageDetail').textContent,/無法讀取/);});
  r=run({failWrite:true});
  test('write failure preserves in-memory use and shows warning',()=>{assert.equal(r.api.addTask('保存失敗測試'),true);assert.equal(r.api.getState().tasks.length,1);assert.match(r.get('storageDetail').textContent,/只會留在這個分頁/);});
  r=run({failRead:true});
  test('read failure recovers with readable warning',()=>{assert.match(r.get('storageDetail').textContent,/無法讀取本機保存/);assert.equal(r.api.addTask('讀取失敗測試'),true);});
  r=run();r.api.setFocus(1);await r.click('startButton');r.advance(10000);await r.click('startButton');const pauseRaw=r.raw();r=run({raw:pauseRaw,now:r.now()+600000});
  test('paused refresh preserves 50 seconds',()=>{assert.equal(r.api.getState().timer.status,'paused');assert.equal(r.api.remaining(),50000);});
  await r.click('startButton');r.advance(50000);
  test('resume finishes preserved remaining duration',()=>assert.equal(r.api.getState().plants.length,1));
  r=run();await r.click('demoButton');await r.click('startButton');r.advance(10000);
  test('10-second demo awards marked plant without formal stats',()=>{assert.equal(r.api.getState().plants.length,1);assert.equal(r.api.getState().plants[0].demo,true);assert.equal(String(r.get('todayMinutes').textContent),'0');assert.equal(String(r.get('todayRounds').textContent),'0');});
  let valid=serial(r.api.getState());
  for(const field of ['task.createdAt','plant.createdAt','running deadline']){
    const bad=JSON.parse(JSON.stringify(valid));
    if(field==='task.createdAt')bad.tasks=[{id:'invalid-date-task',text:'超界日期任務',done:false,createdAt:1e100}];
    else if(field==='plant.createdAt')bad.plants[0].createdAt=1e100;
    else{bad.timer.status='running';bad.timer.remainingMs=bad.timer.totalMs;bad.timer.deadline=1e100;}
    const recovered=run({raw:JSON.stringify(bad)});
    test('reject and recover out-of-range '+field,()=>{
      assert.equal(recovered.api.getState().tasks.length,0);
      assert.equal(recovered.api.getState().plants.length,0);
      assert.equal(recovered.api.getState().timer.status,'idle');
      assert.match(recovered.get('storageDetail').textContent,/無法讀取/);
      assert.equal(recovered.api.addTask('恢復後可繼續操作'),true);
    });
  }
  r=run();await r.click('demoButton');let legacyFourRaw;
  for(let i=0;i<12;i++){await r.click('startButton');r.advance(10000);if(i===3)legacyFourRaw=r.raw();}
  const twelve=serial(r.api.getState().plants);
  test('12 completions collect 12 distinct rendered plant kinds',()=>{
    assert.equal(twelve.length,12);assert.equal(new Set(twelve.map(p=>p.species)).size,12);
    for(const plant of twelve){assert.ok(html.includes('id="plant-'+plant.species+'"'),'Missing inline art: '+plant.species);r.api.showPlant(plant);assert.ok(r.get('plantDetailTitle').textContent);assert.ok(r.get('plantDetailMessage').textContent);}
    assert.equal(String(r.get('todayMinutes').textContent),'0');
  });
  await r.click('startButton');r.advance(10000);
  test('13th completion cycles the collection without replacing old plants',()=>{
    const plants=r.api.getState().plants;assert.equal(plants.length,13);assert.equal(plants[12].species,plants[0].species);assert.notEqual(plants[12].id,plants[0].id);assert.deepEqual(serial(plants.slice(0,12)),twelve);
  });
  const legacy=JSON.parse(legacyFourRaw);legacy.tasks.push({id:'legacy-task',text:'保留原有任務',done:false,createdAt:r.now()});legacy.focusMinutes=17;
  legacy.timer={id:'legacy-paused-session',mode:'focus',totalMs:1020000,remainingMs:12000,status:'paused',deadline:null,demo:false,taskId:'legacy-task'};
  r=run({raw:JSON.stringify(legacy)});
  test('version 1 four-kind save retains plants tasks and paused timer',()=>{
    const restored=r.api.getState();assert.deepEqual(serial(restored.plants),legacy.plants);assert.deepEqual(serial(restored.tasks),legacy.tasks);assert.equal(restored.focusMinutes,17);assert.equal(restored.timer.status,'paused');assert.equal(r.api.remaining(),12000);
  });
  const beforeCatalog=serial(r.api.getState());await r.click('catalogButton');
  test('catalog previews all 12 kinds without adding rewards or progress',()=>{
    assert.equal(r.get('catalogGrid').children.length,12);assert.match(r.get('catalogDescription').textContent,/4 \/ 12/);assert.deepEqual(serial(r.api.getState()),beforeCatalog);
    for(const tile of r.get('catalogGrid').children){assert.ok(tile.attributes['aria-label']);}
  });
  console.log(JSON.stringify({sourcePath,passed:results.filter(r=>r.result==='PASS').length,failed:results.filter(r=>r.result==='FAIL').length,results},null,2));
  if(results.some(r=>r.result==='FAIL')) process.exitCode=1;
})();
