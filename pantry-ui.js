// chatLMJ Popote v0.9 — catégories et unités (compatible avec les anciennes données)
const popoteCategories=['Fruits et légumes','Viandes et volailles','Poissons et fruits de mer','Produits laitiers et œufs','Boulangerie','Épicerie sèche','Surgelés','Boissons','Entretien et maison','Autres'];
const popoteUnits=['unité','unités','g','kg','ml','L','lb','paquet','boîte','sac','portion'];
function popotePick(title,options,current){
 const msg=title+'\\n'+options.map((v,i)=>(i+1)+'. '+v).join('\\n');
 const initial=String(Math.max(1,options.indexOf(current)+1));
 const raw=prompt(msg,initial);if(raw===null)return null;
 const n=Number(raw);return Number.isInteger(n)&&n>=1&&n<=options.length?options[n-1]:current||options[0];
}
function popoteQty(x){return esc(String(x.qty||'1'))+(x.unit?' '+esc(x.unit):'')}
function popoteCat(x){return esc(x.category||'Autres')}
function popoteGrouped(items,makeRow){
 if(!items.length)return '<p class="muted">Aucun article pour le moment.</p>';
 return popoteCategories.filter(c=>items.some(x=>(x.category||'Autres')===c)).map(c=>'<h3 class="popote-group">'+esc(c)+'</h3>'+items.filter(x=>(x.category||'Autres')===c).map(makeRow).join('')).join('')+
 (items.some(x=>!popoteCategories.includes(x.category||'Autres'))?'<h3 class="popote-group">Autres</h3>'+items.filter(x=>!popoteCategories.includes(x.category||'Autres')).map(makeRow).join(''):'');
}
function inventory(){return '<h2>🧊 Inventaire</h2>'+btn('＋ Ajouter un aliment','addInventory()')+'<div class="card">'+popoteGrouped(state.inventory,x=>'<div class="item"><div><b>'+esc(x.name)+'</b><small>'+popoteQty(x)+' · '+esc(x.place||'Non précisé')+(x.exp?' · À consommer avant : '+esc(x.exp):'')+'</small></div><div class="actions">'+btn('Modifier',"editInventory('"+x.id+"')",'alt sm')+btn('×',"remove('inventory','"+x.id+"')",'danger sm')+'</div></div>')+'</div>'}
function shopping(){return '<h2>🛒 Épicerie</h2>'+btn('＋ Ajouter un article','addShopping()')+'<div class="card">'+popoteGrouped(state.shopping,x=>'<div class="item"><input class="check" type="checkbox" '+(x.done?'checked':'')+' onchange="toggleShopping(\''+x.id+'\')"><div style="'+(x.done?'text-decoration:line-through;opacity:.6':'')+'"><b>'+esc(x.name)+'</b><small>'+popoteQty(x)+'</small></div><div class="actions">'+btn('Modifier',"editShopping('"+x.id+"')",'alt sm')+btn('×',"remove('shopping','"+x.id+"')",'danger sm')+'</div></div>')+'</div>'}
function addInventory(){
 const name=ask('Nom de l’aliment');if(!name?.trim())return;
 const qty=ask('Quantité','1');if(qty===null)return;
 const unit=popotePick('Unité',popoteUnits,'unité');if(unit===null)return;
 const category=popotePick('Catégorie',popoteCategories,'Autres');if(category===null)return;
 const place=popotePick('Emplacement',['Réfrigérateur','Congélateur','Garde-manger','Autre'],'Réfrigérateur');if(place===null)return;
 const exp=ask('Date (AAAA-MM-JJ), facultative','');if(exp===null)return;
 state.inventory.push({id:uid(),name:name.trim(),qty,unit,category,place,exp});save();render();
}
function editInventory(id){
 const x=state.inventory.find(y=>String(y.id)===String(id));if(!x)return;
 const name=ask('Nom',x.name);if(name===null)return;
 const qty=ask('Quantité',x.qty||'1');if(qty===null)return;
 const unit=popotePick('Unité',popoteUnits,x.unit||'unité');if(unit===null)return;
 const category=popotePick('Catégorie',popoteCategories,x.category||'Autres');if(category===null)return;
 const place=popotePick('Emplacement',['Réfrigérateur','Congélateur','Garde-manger','Autre'],x.place||'Réfrigérateur');if(place===null)return;
 const exp=ask('Date (AAAA-MM-JJ), facultative',x.exp||'');if(exp===null)return;
 Object.assign(x,{name:name.trim()||x.name,qty,unit,category,place,exp});save();render();
}
function addShopping(){
 const name=ask('Article à acheter');if(!name?.trim())return;
 const qty=ask('Quantité','1');if(qty===null)return;
 const unit=popotePick('Unité',popoteUnits,'unité');if(unit===null)return;
 const category=popotePick('Catégorie',popoteCategories,'Autres');if(category===null)return;
 state.shopping.push({id:uid(),name:name.trim(),qty,unit,category,done:false});save();render();
}
function editShopping(id){
 const x=state.shopping.find(y=>String(y.id)===String(id));if(!x)return;
 const name=ask('Article',x.name);if(name===null)return;
 const qty=ask('Quantité',x.qty||'1');if(qty===null)return;
 const unit=popotePick('Unité',popoteUnits,x.unit||'unité');if(unit===null)return;
 const category=popotePick('Catégorie',popoteCategories,x.category||'Autres');if(category===null)return;
 Object.assign(x,{name:name.trim()||x.name,qty,unit,category});save();render();
}
