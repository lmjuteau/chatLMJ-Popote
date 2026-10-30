// Gestion des membres et des invitations de chatLMJ Popote
window.popoteMembers={
 members:[], invitations:[], error:'', familyId:null,
 async load(){
  if(!db||!user||!family){this.members=[];this.invitations=[];this.familyId=null;return}
  this.familyId=family.id;
  const m=await db.rpc('popote_family_members',{p_family_id:family.id});
  this.error=m.error?.message||'';
  this.members=m.data||[];
  this.invitations=[];
  if(family.role==='admin'){
   const i=await db.rpc('popote_pending_invitations',{p_family_id:family.id});
   if(i.error)this.error=i.error.message;
   else this.invitations=i.data||[];
  }
 },
 html(){
  if(!user||!family)return '';
  const admin=family.role==='admin';
  const memberRows=this.members.map(m=>'<div class="member-row"><div><b>'+esc(m.email)+'</b><small>'+ (m.member_role==='admin'?'Administrateur':'Membre')+'</small></div></div>').join('');
  const invites=admin?'<h4>Invitations en attente</h4>'+(this.invitations.length?this.invitations.map(i=>'<div class="member-row"><div><b>'+esc(i.invited_email)+'</b><small>Expire le '+esc(new Date(i.expires_at).toLocaleDateString('fr-CA'))+'</small></div><button class="alt sm" data-invite-id="'+esc(i.invitation_id)+'" onclick="window.popoteMembers.revoke(this.dataset.inviteId)">Annuler</button></div>').join(''):'<p class="muted">Aucune invitation en attente.</p>'):'';
  return '<div class="card"><h3>👥 Membres du foyer</h3>'+(this.error?'<p class="muted">Impossible de charger la liste : '+esc(this.error)+'</p>':'')+(memberRows||'<p class="muted">Chargement des membres...</p>')+invites+'<button class="alt" onclick="window.popoteMembers.reload()">Actualiser la liste</button></div>';
 },
 async reload(){await this.load();render()},
 async revoke(id){
  if(!family||family.role!=='admin'||!confirm('Annuler cette invitation?'))return;
  const r=await db.rpc('popote_revoke_invitation',{p_invitation_id:id});
  if(r.error)alert('Annulation : '+r.error.message);
  else if(!r.data)alert('Cette invitation a déjà expiré ou été utilisée.');
  await this.reload();
 }
};
