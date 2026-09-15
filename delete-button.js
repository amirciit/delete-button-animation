class BinEatsDelete {
  constructor(button, options={}) {
    if(!button) throw new Error("BinEatsDelete requires a button.");
    this.b=button;
    this.label=button.querySelector(".bin-delete__label");
    this.bin=button.querySelector(".bin-delete__bin");
    this.fill=button.querySelector(".bin-delete__fill");
    this.options={sound:options.sound!==false,onDelete:options.onDelete||null,letterDelay:94,flyDuration:430};
    this.text=button.dataset.label||this.label.textContent.trim();
    this.busy=false;
    this.audioCtx=null;
    this.render();
    this.b.addEventListener("click",e=>{e.preventDefault();this.play()});
  }
  render(){
    this.label.innerHTML="";
    [...this.text].forEach(c=>{const s=document.createElement("span");s.className="bin-delete__letter";s.textContent=c===" "?"\u00a0":c;this.label.appendChild(s)});
    this.setFill(0);
  }
  wait(ms){return new Promise(r=>setTimeout(r,ms))}
  setFill(progress){
    progress=Math.max(0,Math.min(1,progress));
    const full=18, h=full*progress, bottom=30;
    this.fill.setAttribute("height",h.toFixed(2));
    this.fill.setAttribute("y",(bottom-h).toFixed(2));
  }
  ensureAudio(){
    if(!this.options.sound)return;
    const C=window.AudioContext||window.webkitAudioContext;
    if(C&&!this.audioCtx)this.audioCtx=new C();
    if(this.audioCtx?.state==="suspended")this.audioCtx.resume();
  }
  tone(kind,index=0){
    if(!this.options.sound||!this.audioCtx)return;
    const ctx=this.audioCtx, now=ctx.currentTime;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    if(kind==="bite"){
      o.type="sine";o.frequency.setValueAtTime(520-index*28,now);o.frequency.exponentialRampToValueAtTime(180,now+.075);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.075,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+.09);
      o.start(now);o.stop(now+.095);
    } else if(kind==="gulp"){
      o.type="triangle";o.frequency.setValueAtTime(180,now);o.frequency.exponentialRampToValueAtTime(72,now+.16);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.1,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+.18);
      o.start(now);o.stop(now+.19);
    } else {
      o.type="sine";o.frequency.setValueAtTime(280,now);o.frequency.exponentialRampToValueAtTime(620,now+.18);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.06,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.23);
      o.start(now);o.stop(now+.24);
    }
  }
  dragSound(duration=.82){
    if(!this.options.sound||!this.audioCtx)return;
    const ctx=this.audioCtx, now=ctx.currentTime;
    const length=Math.max(1,Math.floor(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=buffer.getChannelData(0);

    // Filtered noise creates the soft dragging/scraping sound heard
    // while the broken circular line travels around the button.
    for(let i=0;i<length;i++){
      const t=i/length;
      const env=Math.sin(Math.PI*t);
      data[i]=(Math.random()*2-1)*env*.34;
    }

    const source=ctx.createBufferSource();
    const filter=ctx.createBiquadFilter();
    const gain=ctx.createGain();

    filter.type="bandpass";
    filter.frequency.setValueAtTime(1050,now);
    filter.frequency.exponentialRampToValueAtTime(360,now+duration);
    filter.Q.value=.75;

    gain.gain.setValueAtTime(.0001,now);
    gain.gain.linearRampToValueAtTime(.085,now+.055);
    gain.gain.setValueAtTime(.07,now+Math.max(.08,duration-.12));
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);

    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    source.start(now);source.stop(now+duration);
  }
  async fly(letter,i,total){
    const a=letter.getBoundingClientRect(), b=this.bin.getBoundingClientRect();
    const c=letter.cloneNode(true);c.className="bin-delete__fly";
    Object.assign(c.style,{left:a.left+"px",top:a.top+"px",width:a.width+"px",height:a.height+"px"});
    document.body.appendChild(c);letter.style.visibility="hidden";
    const tx=(b.left+b.width*.52)-(a.left+a.width*.5), ty=(b.top+b.height*.28)-(a.top+a.height*.5);
    const arc=27+i*2.5, spin=i%2?9:-10;
    const anim=c.animate([
      {transform:"translate(0,0) rotate(0) scale(1)",opacity:1,offset:0},
      {transform:`translate(${tx*.34}px,${-arc}px) rotate(${spin}deg) scale(.92)`,opacity:1,offset:.36},
      {transform:`translate(${tx*.75}px,${ty-17}px) rotate(${-spin*.5}deg) scale(.55)`,opacity:.95,offset:.75},
      {transform:`translate(${tx}px,${ty}px) rotate(0) scale(.08)`,opacity:0,offset:1}
    ],{duration:this.options.flyDuration,easing:"cubic-bezier(.38,.04,.18,1)",fill:"forwards"});
    try{await anim.finished}catch(e){}
    c.remove();
    this.setFill((i+1)/total);
    this.b.classList.add("is-swallow");
    this.tone("bite",i);
    await this.wait(85);
    this.b.classList.remove("is-swallow");
  }
  async play(){
    if(this.busy)return;this.busy=true;this.b.disabled=true;this.ensureAudio();
    this.b.classList.add("is-eating");
    const letters=[...this.label.querySelectorAll(".bin-delete__letter")].reverse(), total=letters.length;
    await Promise.all(letters.map((l,i)=>this.wait(i*this.options.letterDelay).then(()=>this.fly(l,i,total))));
    this.tone("gulp");
    await this.wait(90);
    this.b.classList.remove("is-eating");
    this.b.classList.add("is-circle");
    await this.wait(310);
    this.b.classList.add("is-ring");this.tone("finish");this.dragSound(.82);
    try{if(typeof this.options.onDelete==="function")await this.options.onDelete()}catch(e){console.error(e)}
    await this.wait(820);

    // Success confirmation: draw tick and reveal "Deleted".
    this.b.classList.remove("is-ring","is-circle");
    this.b.classList.add("is-success");
    await this.wait(900);

    // Remove success confirmation.
    this.b.classList.add("is-success-out");
    await this.wait(270);
    this.b.classList.remove("is-success","is-success-out");

    // Filled bin enters from the LEFT.
    this.setFill(1);
    this.b.classList.add("is-final-bin");
    this.tone("gulp");
    await this.wait(720);

    // Return to reusable Delete state.
    this.b.classList.remove("is-final-bin");
    this.render();
    this.b.classList.add("is-returning");
    await this.wait(480);
    this.b.classList.remove("is-returning");this.b.disabled=false;this.busy=false;
  }
}
window.BinEatsDelete=BinEatsDelete;