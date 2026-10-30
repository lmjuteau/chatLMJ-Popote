// chatLMJ Popote - synchronisation familiale
window.popoteSync = {
  active: false, busy: false, familyId: null, snapshot: {}, channel: null, timer: null, pending: false, pulling: false, refreshNeeded: false,
  kinds: ['inventory','recipes','shopping','plan'],
  key() { return 'popote-sync-'+user.id+'-'+family.id; },
  async initialize() {
    if (!db || !user || !family) { this.stop(); return; }
    if (this.familyId === family.id && this.active) { if(!this.pending) await this.pull(); return; }
    this.stop();
    this.familyId = family.id;
    if (localStorage.getItem(this.key()) !== 'yes') return;
    this.active = true;
    await this.pull();
    this.channel = db.channel('family-items-'+family.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'popote_family_items',filter:'family_id=eq.'+family.id},()=>this.pull())
      .subscribe();
  },
  stop() {
    if (this.timer) clearTimeout(this.timer);
    if (this.channel && db) db.removeChannel(this.channel);
    this.channel=null; this.active=false; this.familyId=null; this.pending=false; this.pulling=false; this.refreshNeeded=false;
  },
  async pull() {
    if (!this.active || !family || family.id !== this.familyId) return;
    if(this.busy || this.pulling || this.pending){this.refreshNeeded=true;return;}
    this.pulling=true;
    const targetFamily=this.familyId;
    try {
    const result=await db.from('popote_family_items').select('kind,item_id,payload').eq('family_id',family.id).limit(10000);
    if (result.error) { console.error(result.error); return; }
    if(!this.active || this.familyId!==targetFamily || this.pending)return;
    for(const kind of this.kinds) {
      state[kind]=result.data.filter(r=>r.kind===kind).map(r=>({...r.payload,id:r.item_id}));
    }
    localStorage.setItem(KEY,JSON.stringify(state));
    this.snapshot=Object.fromEntries(this.kinds.map(k=>[k,JSON.stringify(state[k])]));
    render();
    } finally { this.pulling=false; if(this.pending) this.schedule(); }
  },
  schedule() {
    if (!this.active) return;
    this.pending=true;
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.push(),300);
  },
  async push() {
    if (!this.active || !family || !this.pending || this.busy || this.pulling) return;
    this.busy=true;
    const targetFamily=this.familyId;
    let success=false;
    try {
      for(const kind of this.kinds) {
        const oldItems=JSON.parse(this.snapshot[kind]||'[]');
        const oldMap=new Map(oldItems.map(x=>[String(x.id),x]));
        const newMap=new Map((state[kind]||[]).map(x=>[String(x.id),x]));
        for(const [id,item] of newMap) {
          if(JSON.stringify(oldMap.get(id))===JSON.stringify(item)) continue;
          const r=await db.from('popote_family_items').upsert(
            {family_id:family.id,kind,item_id:id,payload:item},
            {onConflict:'family_id,kind,item_id'});
          if(r.error) throw r.error;
        }
        for(const [id] of oldMap) {
          if(newMap.has(id)) continue;
          const r=await db.from('popote_family_items').delete()
            .eq('family_id',family.id).eq('kind',kind).eq('item_id',id);
          if(r.error) throw r.error;
        }
      }
      this.snapshot=Object.fromEntries(this.kinds.map(k=>[k,JSON.stringify(state[k])]));
      success=true;
    } catch(e) { console.error(e); alert('Synchronisation impossible : '+e.message); }
    finally { this.busy=false; if(success&&this.familyId===targetFamily){this.pending=false;if(this.refreshNeeded){this.refreshNeeded=false;await this.pull();}} }
  },
  async activate() {
    if(!db||!user||!family||this.active) return;
    if(!confirm('Importer les données locales dans le foyer? Exporte une sauvegarde avant de continuer.')) return;
    const existing=await db.from('popote_family_items').select('kind,item_id').eq('family_id',family.id).limit(10000);
    if(existing.error) return alert(existing.error.message);
    const known=new Set(existing.data.map(r=>r.kind+'|'+r.item_id));
    const rows=[];
    for(const kind of this.kinds) for(const item of state[kind]||[]) {
      if(item.id && !known.has(kind+'|'+item.id))
        rows.push({family_id:family.id,kind,item_id:String(item.id),payload:item});
    }
    for(let i=0;i<rows.length;i+=100) {
      const r=await db.from('popote_family_items').insert(rows.slice(i,i+100));
      if(r.error) return alert('Importation : '+r.error.message);
    }
    localStorage.setItem(this.key(),'yes');
    await this.initialize();
    alert('Synchronisation familiale activée. '+rows.length+' élément(s) importé(s).');
  }
};
