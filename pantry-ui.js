// chatLMJ Popote — formulaires tactiles pour inventaire et épicerie
const popoteCategories=['Fruits et légumes','Viandes et volailles','Poissons et fruits de mer','Produits laitiers et œufs','Boulangerie','Épicerie sèche','Surgelés','Boissons','Entretien et maison','Autres'];
const popoteUnits=['unité','unités','g','kg','livre (lb)','ml','L','paquet','boîte','sac','portion'];
const popotePlaces=['Réfrigérateur','Congélateur','Garde-manger','Comptoir','Autre'];
function popoteQty(x){const u=x.unit==='lb'?'livre (lb)':x.unit;return esc(String(x.qty||'1'))+(u?' '+esc(u):'')}
function popoteGrouped(items,row){
 if(!items.length)return '<p class="muted">Aucun article pour le moment.</p>';
 const groups=[...new Set(items.map(x=>popoteCategories.includes(x.category)?x.category:'Autres'))];
 return popoteCategories.filter(c=>groups.includes(c)).map(c=>'<h3 class="popote-group">'+esc(c)+'</h3>'+items.filter(x=>(popoteCategories.includes(x.category)?x.category:'Autres')===c).map(row).join('')).join('');
}
function inventory(){return '<h2>🧊 Inventaire</h2>'+btn('＋ Ajouter un aliment','addInventory()')+'<div class="card">'+popoteGrouped(state.inventory,x=>'<div class="item"><div><b>'+esc(x.name)+'</b><small>'+popoteQty(x)+' · '+esc(x.place||'Non précisé')+(x.exp?' · À consommer avant : '+esc(x.exp):'')+'</small></div><div class="actions">'+btn('Modifier',"editInventory('"+x.id+"')",'alt sm')+btn('×',"remove('inventory','"+x.id+"')",'danger sm')+'</div></div>')+'</div>'}
function shopping(){return '<h2>🛒 Épicerie</h2>'+btn('＋ Ajouter un article','addShopping()')+'<div class="card">'+popoteGrouped(state.shopping,x=>'<div class="item"><input class="check" type="checkbox" '+(x.done?'checked':'')+' onchange="toggleShopping(\''+x.id+'\')"><div style="'+(x.done?'text-decoration:line-through;opacity:.6':'')+'"><b>'+esc(x.name)+'</b><small>'+popoteQty(x)+'</small></div><div class="actions">'+btn('Modifier',"editShopping('"+x.id+"')",'alt sm')+btn('×',"remove('shopping','"+x.id+"')",'danger sm')+'</div></div>')+'</div>'}
function popoteSelect(name,label,choices,value){
 const v=value==='lb'?'livre (lb)':value;
 return '<label>'+label+'<select name="'+name+'">'+choices.map(c=>'<option value="'+esc(c)+'" '+(c===v?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label>';
}
function popoteField(name,label,value,type='text',required=false){
 return '<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(String(value??''))+'" '+(required?'required':'')+'></label>';
}
function popoteForm(kind,id){
 const item=id?state[kind].find(x=>String(x.id)===String(id)):null;
 const inv=kind==='inventory';
 const title=(item?'Modifier ':'Ajouter ')+(inv?'un aliment':'un article');
 const fields=popoteField('name',inv?'Nom de l’aliment':'Article',item?.name,'text',true)
 +'<div class="popote-fields">'+popoteField('qty','Quantité',item?.qty||'1','text',true)+popoteSelect('unit','Unité',popoteUnits,item?.unit||'unité')+'</div>'
 +popoteSelect('category','Catégorie',popoteCategories,item?.category||'Autres')
 +(inv?popoteSelect('place','Emplacement',popotePlaces,item?.place||'Réfrigérateur')+popoteField('exp','Date limite (facultative)',item?.exp||'','date'):'');
 document.getElementById('popote-dialog')?.remove();
 const overlay=document.createElement('div');overlay.id='popote-dialog';overlay.className='popote-overlay';
 overlay.innerHTML='<div class="popote-dialog" role="dialog" aria-modal="true" aria-label="'+title+'"><h2>'+title+'</h2><form id="popote-entry">'+fields+'<div class="popote-form-actions"><button type="button" class="alt" onclick="popoteClose()">Annuler</button><button type="submit">Enregistrer</button></div></form></div>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)popoteClose()});
 overlay.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget).entries());
  values.name=values.name.trim();if(!values.name)return;
  if(item)Object.assign(item,values);
  else state[kind].push({id:uid(),...values,...(!inv?{done:false}:{})});
  popoteClose();save();render();
 });
 overlay.querySelector('input[name=name]').focus();
}
function popoteClose(){document.getElementById('popote-dialog')?.remove()}
function addInventory(){popoteForm('inventory')}
function editInventory(id){popoteForm('inventory',id)}
function addShopping(){popoteForm('shopping')}
function editShopping(id){popoteForm('shopping',id)}
