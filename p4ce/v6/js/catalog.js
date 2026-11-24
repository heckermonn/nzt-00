/* PR6 v6 · catalogue, copied from v5/js/catalog.js (originally v2/reserve.html). Same range: 9 collections, 50 products.
   Collection descriptors are the owner's wording, unchanged. No effect claims.
   Prices: the catalogue numbers are USD placeholders; the store shows CAD at x1.38, rounded to whole dollars
   (po → pc one-off, ps → psc subscription). Placeholder prices until the owner sets real ones. */
function P(n,g,q,s,po,ps,ing,w,e,u){var a=ing.split('|');return {n:n,g:g,q:q,s:s,po:po,ps:ps,w:w,e:e,u:u,
  act:(a[0]||'').split(';').map(function(x){return x.trim()}).filter(Boolean).map(parseAct),oth:(a[1]||'').trim()}}
function parseAct(x){
  var m=x.match(/^(.*?)\s+(\d[\d.,]*\s?(?:mg|mcg|g|ml|IU|billion CFU|%))(?:\s+(.*))?$/);
  var name=m?m[1]:x,amt=m?m[2]:'',rest=m&&m[3]?m[3]:'',form='';
  var f=name.match(/^(.*?)\s*\((.*)\)$/);if(f){name=f[1];form=f[2]}
  var per=(rest.match(/\(?(per [^)]*)\)?/)||[])[1]||'';
  return {name:name,form:form,amt:amt,per:per};
}
var CAT=[
 {c:'01',n:'Foundation',d:'Everyday nutrition and essential support',it:[
  P('Daily Multivitamin','Capsules','120 capsules','2 capsules daily',32,27,'Vitamin A (as beta-carotene) 800 mcg; Vitamin C 80 mg; Vitamin D3 25 mcg; Vitamin E 12 mg; Vitamin K2 75 mcg; Thiamin 5 mg; Riboflavin 5 mg; Niacin 16 mg; Vitamin B6 5 mg; Folate 400 mcg; Vitamin B12 25 mcg; Zinc 10 mg; Selenium 55 mcg|Capsule shell: hypromellose. Rice flour.','A two-capsule daily multivitamin and mineral formula.','Multivitamins combine several vitamins and minerals in one serving, listed against daily nutrient reference values.','multivitamin and mineral supplement'),
  P('Vitamin D3 + K2','Softgels','60 softgels','1 softgel daily',24,20,'Vitamin D3 (cholecalciferol) 50 mcg; Vitamin K2 (menaquinone-7) 100 mcg|Olive oil. Softgel shell: gelatin, glycerin.','Vitamin D3 and vitamin K2 as MK-7, in an olive oil softgel.','Cholecalciferol is the D3 form of vitamin D; menaquinone-7 is one of the K2 forms of vitamin K.','vitamin D3 and K2 supplement'),
  P('Vitamin C','Tablets','90 tablets','1 tablet daily',18,15,'Vitamin C (ascorbic acid) 1000 mg|Microcrystalline cellulose, stearic acid.','A 1000 mg vitamin C tablet, as ascorbic acid.','Ascorbic acid is the chemical name for vitamin C.','vitamin C supplement'),
  P('Vitamin B Complex','Capsules','60 capsules','1 capsule daily',22,18,'Thiamin 10 mg; Riboflavin 10 mg; Niacin 20 mg; Pantothenic acid 10 mg; Vitamin B6 10 mg; Biotin 150 mcg; Folate 400 mcg; Vitamin B12 100 mcg|Capsule shell: hypromellose. Rice flour.','Eight B vitamins in one daily capsule.','The B vitamins are a group of eight water-soluble vitamins.','B vitamin supplement'),
  P('Greens Powder','Powder','240 g','8 g, 30 servings',44,38,'Spirulina 2 g; Chlorella 2 g; Barley grass juice powder 2 g; Spinach powder 1 g; Kale powder 1 g|Natural apple flavour, stevia leaf extract.','A powdered blend of microalgae and leafy greens, mixed into water.','Spirulina and chlorella are microalgae, grown and dried for use as food ingredients.','greens powder')]},
 {c:'02',n:'Form',d:'Body composition and physique',it:[
  P('Collagen Peptides','Powder','300 g','10 g, 30 servings',38,32,'Hydrolysed bovine collagen peptides (types I and III) 10 g|No other ingredients.','Unflavoured hydrolysed collagen peptides that dissolve in hot or cold liquid.','Collagen peptides are short chains of amino acids produced by hydrolysing collagen.','collagen peptide supplement'),
  P('Whey Protein Isolate','Powder','900 g','30 g, 30 servings',62,54,'Whey protein isolate (milk) 30 g|Sunflower lecithin, natural vanilla flavour, stevia leaf extract. Contains milk.','A vanilla whey protein isolate, 30 g per serving.','Whey protein isolate is a milk protein fraction filtered to remove most of the fat and lactose.','protein powder'),
  P('Plant Protein Blend','Powder','900 g','30 g, 30 servings',56,48,'Pea protein 18 g; Brown rice protein 9 g|Sunflower lecithin, natural cocoa, stevia leaf extract.','A pea and brown rice protein blend with cocoa.','Pea and rice proteins are plant protein concentrates, often combined in one blend.','plant protein powder'),
  P('Green Tea Extract','Capsules','90 capsules','1 capsule daily',21,18,'Green tea leaf extract (decaffeinated) 500 mg|Capsule shell: hypromellose. Rice flour.','A decaffeinated green tea leaf extract in capsules.','Green tea extract is a concentrated preparation of Camellia sinensis leaves.','green tea extract supplement'),
  P('Psyllium Fibre','Sachets','30 sachets','1 sachet daily',19,16,'Psyllium husk powder 5 g|No other ingredients.','Psyllium husk powder in single-serve sachets.','Psyllium husk is a soluble fibre from the seeds of Plantago ovata.','fibre supplement'),
  P('Chromium Picolinate','Tablets','120 tablets','1 tablet daily',16,13,'Chromium (chromium picolinate) 200 mcg|Microcrystalline cellulose, stearic acid.','Chromium as chromium picolinate, one tablet daily.','Chromium picolinate is a compound of the trace mineral chromium and picolinic acid.','chromium supplement')]},
 {c:'03',n:'Force',d:'Strength and physical performance',it:[
  P('Creatine Monohydrate','Powder','300 g','5 g, 60 servings',34,29,'Creatine monohydrate (micronised) 5 g|No other ingredients.','Micronised creatine monohydrate powder with no other ingredients.','Creatine monohydrate is one of the most widely studied sports nutrition ingredients.','creatine supplement'),
  P('Creatine Capsules','Capsules','180 capsules','3 capsules daily',30,26,'Creatine monohydrate 5 g (per 3 capsules)|Capsule shell: hypromellose. Rice flour.','Creatine monohydrate in capsules, 5 g across three capsules.','Creatine monohydrate is one of the most widely studied sports nutrition ingredients.','creatine supplement in capsule form'),
  P('Beta-Alanine','Powder','250 g','3 g, 83 servings',27,23,'Beta-alanine 3 g|No other ingredients.','Unflavoured beta-alanine powder, 3 g per serving.','Beta-alanine is a naturally occurring beta amino acid.','beta-alanine supplement'),
  P('Citrulline Malate','Powder','300 g','6 g, 50 servings',31,27,'Citrulline malate (2:1) 6 g|No other ingredients.','Unflavoured citrulline malate in a 2:1 ratio.','Citrulline is an amino acid; citrulline malate pairs it with malic acid.','citrulline supplement'),
  P('Taurine','Capsules','120 capsules','2 capsules daily',18,15,'Taurine 2000 mg (per 2 capsules)|Capsule shell: hypromellose. Rice flour.','Taurine capsules, 2000 mg per two-capsule serving.','Taurine is an amino sulfonic acid found in many foods.','taurine supplement')]},
 {c:'04',n:'Endure',d:'Stamina and sustained effort',it:[
  P('Electrolyte Sachets','Sachets','30 sachets','1 sachet in 500 ml water',36,31,'Sodium (sodium chloride) 500 mg; Potassium (potassium citrate) 200 mg; Magnesium (magnesium citrate) 60 mg|Citric acid, natural lemon flavour, stevia leaf extract.','Sodium, potassium and magnesium salts with lemon, for mixing into water.','Electrolytes are minerals that carry an electric charge when dissolved in water.','electrolyte drink mix'),
  P('Carbohydrate Mix','Powder','900 g','45 g, 20 servings',39,34,'Maltodextrin 30 g; Fructose 15 g; Sodium (sodium citrate) 200 mg|No other ingredients.','Maltodextrin and fructose in a 2:1 ratio, with sodium.','Maltodextrin and fructose are carbohydrates often used together in drink mixes.','carbohydrate drink mix'),
  P('Iron Bisglycinate','Capsules','60 capsules','1 capsule daily',20,17,'Iron (iron bisglycinate) 14 mg|Capsule shell: hypromellose. Rice flour.','Iron as iron bisglycinate, one capsule daily.','Iron bisglycinate is a form of iron bound to two molecules of glycine.','iron supplement'),
  P('Beetroot Powder','Powder','250 g','5 g, 50 servings',29,25,'Beetroot root powder 5 g|No other ingredients.','Dried, milled beetroot, unflavoured.','Beetroot powder is made by drying and milling the root of Beta vulgaris.','beetroot powder'),
  P('Caffeine Tablets','Tablets','100 tablets','1 tablet as needed',14,12,'Caffeine (anhydrous) 100 mg|Microcrystalline cellulose, stearic acid.','100 mg of anhydrous caffeine per tablet.','Caffeine is a compound found naturally in coffee, tea and cacao.','caffeine supplement'),
  P('Sodium Citrate','Tablets','120 tablets','2 tablets daily',17,14,'Sodium (sodium citrate) 400 mg per 2 tablets|Microcrystalline cellulose, stearic acid.','Sodium citrate tablets, 400 mg sodium per two-tablet serving.','Sodium citrate is the sodium salt of citric acid.','sodium supplement')]},
 {c:'05',n:'Restore',d:'Recovery and physical maintenance',it:[
  P('Magnesium Glycinate','Capsules','120 capsules','2 capsules daily',28,24,'Magnesium (magnesium bisglycinate) 200 mg (per 2 capsules)|Capsule shell: hypromellose. Rice flour.','Magnesium bisglycinate capsules, 200 mg magnesium per serving.','Magnesium bisglycinate is a form of magnesium bound to the amino acid glycine.','magnesium supplement'),
  P('Tart Cherry Extract','Capsules','60 capsules','1 capsule daily',26,22,'Montmorency tart cherry extract 500 mg|Capsule shell: hypromellose. Rice flour.','Montmorency tart cherry extract, one capsule daily.','Montmorency is a variety of sour cherry, Prunus cerasus.','tart cherry supplement'),
  P('Glutamine','Powder','300 g','5 g, 60 servings',25,21,'L-glutamine 5 g|No other ingredients.','Unflavoured L-glutamine powder, 5 g per serving.','L-glutamine is an amino acid present in many protein foods.','glutamine supplement'),
  P('Curcumin + Black Pepper','Capsules','60 capsules','1 capsule daily',29,25,'Turmeric root extract (95% curcuminoids) 500 mg; Black pepper fruit extract 5 mg|Capsule shell: hypromellose. Rice flour.','Turmeric root extract standardised to 95% curcuminoids, with black pepper extract.','Curcuminoids are the yellow pigments of turmeric root, Curcuma longa.','turmeric supplement'),
  P('Magnesium Body Butter','Cream','150 ml','Apply as needed',24,21,'|Aqua, magnesium chloride, shea butter, coconut oil, cetearyl alcohol, glycerin, sunflower seed oil, tocopherol, xanthan gum.','A magnesium chloride body butter with shea butter and coconut oil.','Magnesium chloride is a magnesium salt, used here in a topical base.','topical magnesium body butter')]},
 {c:'06',n:'Focus',d:'Attention and mental clarity',it:[
  P('L-Theanine','Capsules','90 capsules','1 capsule daily',26,22,'L-theanine 200 mg|Capsule shell: hypromellose. Rice flour.','L-theanine capsules, 200 mg per capsule.','L-theanine is an amino acid found naturally in tea leaves.','L-theanine supplement'),
  P('Caffeine + L-Theanine','Tablets','90 tablets','1 tablet as needed',22,19,'Caffeine (anhydrous) 100 mg; L-theanine 200 mg|Microcrystalline cellulose, stearic acid.','100 mg caffeine with 200 mg L-theanine in one tablet.','Caffeine and L-theanine both occur naturally in tea leaves.','caffeine and L-theanine supplement'),
  P("Lion's Mane Extract",'Capsules','90 capsules','2 capsules daily',34,29,"Lion's mane fruiting body extract 1000 mg (per 2 capsules)|Capsule shell: hypromellose.","Lion's mane fruiting body extract, two capsules daily.","Lion's mane, Hericium erinaceus, is an edible mushroom.","lion's mane mushroom supplement"),
  P('Alpha-GPC','Capsules','60 capsules','1 capsule daily',32,27,'Alpha-glycerylphosphorylcholine 300 mg|Capsule shell: hypromellose. Rice flour.','Alpha-glycerylphosphorylcholine, 300 mg per capsule.','Alpha-GPC is a choline-containing compound.','choline supplement'),
  P('L-Tyrosine','Powder','200 g','2 g, 100 servings',23,20,'L-tyrosine 2 g|No other ingredients.','Unflavoured L-tyrosine powder, 2 g per serving.','L-tyrosine is an amino acid present in many protein foods.','tyrosine supplement'),
  P('Rhodiola Root Extract','Capsules','60 capsules','1 capsule daily',27,23,'Rhodiola rosea root extract 400 mg|Capsule shell: hypromellose. Rice flour.','Rhodiola rosea root extract, one capsule daily.','Rhodiola rosea is a flowering plant whose root is used in herbal preparations.','rhodiola supplement')]},
 {c:'07',n:'Still',d:'Calm, rest, and sleep',it:[
  P('Glycine','Powder','250 g','3 g, 83 servings',22,19,'Glycine 3 g|No other ingredients.','Unflavoured glycine powder, 3 g per serving.','Glycine is the simplest amino acid.','glycine supplement'),
  P('Magnesium L-Threonate','Capsules','90 capsules','3 capsules daily',38,33,'Magnesium (magnesium L-threonate) 144 mg (per 3 capsules)|Capsule shell: hypromellose. Rice flour.','Magnesium L-threonate, three capsules daily.','Magnesium L-threonate is a form of magnesium bound to threonic acid.','magnesium supplement'),
  P('Ashwagandha Root Extract','Capsules','60 capsules','1 capsule daily',24,20,'Ashwagandha root extract 600 mg|Capsule shell: hypromellose. Rice flour.','Ashwagandha root extract, 600 mg per capsule.','Ashwagandha, Withania somnifera, is a plant used in traditional herbal preparations.','ashwagandha supplement'),
  P('Valerian Root','Capsules','90 capsules','1 capsule daily',19,16,'Valerian root extract 400 mg|Capsule shell: hypromellose. Rice flour.','Valerian root extract, 400 mg per capsule.','Valerian, Valeriana officinalis, is a flowering plant whose root is used in herbal preparations.','valerian supplement'),
  P('Lemon Balm Extract','Capsules','60 capsules','1 capsule daily',21,18,'Lemon balm leaf extract 500 mg|Capsule shell: hypromellose. Rice flour.','Lemon balm leaf extract, 500 mg per capsule.','Lemon balm, Melissa officinalis, is a herb in the mint family.','lemon balm supplement'),
  P('Chamomile Infusion','Sachets','30 sachets','1 sachet in hot water',15,13,'Chamomile flower 1.5 g|No other ingredients.','Dried chamomile flowers in infusion sachets.','Chamomile infusions are made from the dried flowers of Matricaria chamomilla.','herbal infusion')]},
 {c:'08',n:'Renew',d:'Skin, hair, and appearance',it:[
  P('Vitamin C Serum','Serum','30 ml','2 to 3 drops, morning',38,33,'|Aqua, ascorbic acid, glycerin, ferulic acid, tocopherol, sodium hyaluronate, phenoxyethanol, ethylhexylglycerin.','A water-based vitamin C serum with ferulic acid and vitamin E.','Ascorbic acid is the chemical name for vitamin C.','topical vitamin C serum'),
  P('Niacinamide Serum','Serum','30 ml','2 to 3 drops, evening',32,28,'|Aqua, niacinamide, glycerin, zinc PCA, panthenol, sodium hyaluronate, phenoxyethanol, ethylhexylglycerin.','A water-based niacinamide serum with zinc PCA.','Niacinamide is a form of vitamin B3.','topical niacinamide serum'),
  P('Ceramide Cream','Cream','50 ml','Apply a thin layer',34,29,'|Aqua, glycerin, squalane, ceramide NP, ceramide AP, ceramide EOP, cholesterol, cetearyl alcohol, tocopherol, phenoxyethanol.','A cream with three ceramides, cholesterol and squalane.','Ceramides are lipids naturally present in the outer layer of skin.','topical ceramide cream'),
  P('Zinc Bisglycinate','Capsules','90 capsules','1 capsule daily',20,17,'Zinc (zinc bisglycinate) 15 mg|Capsule shell: hypromellose. Rice flour.','Zinc as zinc bisglycinate, one capsule daily.','Zinc bisglycinate is a form of zinc bound to glycine.','zinc supplement'),
  P('Biotin','Tablets','120 tablets','1 tablet daily',15,12,'Biotin 5000 mcg|Microcrystalline cellulose, stearic acid.','Biotin tablets, 5000 mcg per tablet.','Biotin is a water-soluble B vitamin, also called vitamin B7.','biotin supplement'),
  P('Hyaluronic Acid','Capsules','60 capsules','1 capsule daily',28,24,'Sodium hyaluronate 120 mg|Capsule shell: hypromellose. Rice flour.','Sodium hyaluronate capsules, 120 mg per capsule.','Sodium hyaluronate is the salt form of hyaluronic acid.','hyaluronic acid supplement')]},
 {c:'09',n:'Vital',d:'Healthy ageing and long-term wellbeing',it:[
  P('Omega-3','Softgels','90 softgels','2 softgels daily',42,36,'Fish oil concentrate 1000 mg (per 2 softgels); EPA (eicosapentaenoic acid) 360 mg; DHA (docosahexaenoic acid) 240 mg|Mixed tocopherols. Softgel shell: gelatin, glycerin.','Fish oil concentrate providing EPA and DHA, two softgels daily.','EPA and DHA are long-chain omega-3 fatty acids found in oily fish.','omega-3 supplement'),
  P('Coenzyme Q10','Softgels','60 softgels','1 softgel daily',36,31,'Coenzyme Q10 (ubiquinone) 100 mg|Sunflower oil. Softgel shell: gelatin, glycerin.','Coenzyme Q10 as ubiquinone, in a sunflower oil softgel.','Ubiquinone is the oxidised form of coenzyme Q10.','coenzyme Q10 supplement'),
  P('Astaxanthin','Softgels','60 softgels','1 softgel daily',33,28,'Astaxanthin 8 mg|Olive oil. Softgel shell: gelatin, glycerin.','Astaxanthin, 8 mg in an olive oil softgel.','Astaxanthin is a red carotenoid pigment produced by certain microalgae.','astaxanthin supplement'),
  P('Vitamin K2 MK-7','Capsules','90 capsules','1 capsule daily',23,19,'Vitamin K2 (menaquinone-7) 100 mcg|Capsule shell: hypromellose. Rice flour.','Vitamin K2 as menaquinone-7, one capsule daily.','Menaquinone-7 is one of the K2 forms of vitamin K.','vitamin K2 supplement'),
  P('Calcium Citrate','Tablets','120 tablets','2 tablets daily',21,18,'Calcium (calcium citrate) 400 mg (per 2 tablets)|Microcrystalline cellulose, stearic acid.','Calcium as calcium citrate, two tablets daily.','Calcium citrate is the calcium salt of citric acid.','calcium supplement'),
  P('Probiotic','Capsules','30 capsules','1 capsule daily',35,30,'Lactobacillus and Bifidobacterium blend 10 billion CFU|Capsule shell: hypromellose. Rice flour.','A Lactobacillus and Bifidobacterium blend, 10 billion CFU per capsule.','Lactobacillus and Bifidobacterium are genera of bacteria used in fermented foods and supplements.','probiotic supplement')]}
];
var CONC={'08-1':[['Ascorbic acid','10%'],['Ferulic acid','0.5%'],['Tocopherol','1%'],['Sodium hyaluronate','0.2%']],'08-2':[['Niacinamide','10%'],['Zinc PCA','1%'],['Panthenol','0.5%']],'08-3':[['Ceramide NP, AP and EOP','1%'],['Squalane','5%'],['Cholesterol','0.5%']],'05-5':[['Magnesium chloride','15%'],['Shea butter','10%'],['Coconut oil','8%']]};

/* ---------------------------------------------------------------- derived catalogue (helpers adapted from v4/app.js) */
var MIN = {Sodium: 1, Potassium: 1, Magnesium: 1, Iron: 1, Zinc: 1, Chromium: 1, Calcium: 1};
var cap = s => s.charAt(0).toUpperCase() + s.slice(1);
var ALL = [];
CAT.forEach((co, ci) => co.it.forEach((p, k) => {
  p.id = co.c + '-' + (k + 1); p.c = co.c; p.cn = co.n; p.k = k; p.ci = ci; p.top = p.g === 'Cream' || p.g === 'Serum';
  ALL.push(p);
}));
var byId = id => ALL.find(p => p.id === id) || null;
var colOf = c => CAT.find(x => x.c === c) || null;
/* pack type by format: the Blender renders (assets/renders/) are made per pack type, not per product */
var FORMATS = {Capsules: 'tin', Tablets: 'tin', Softgels: 'tin', Powder: 'pouch', Sachets: 'box', Serum: 'dropper', Cream: 'jar'};
var PACKNAME = {tin: 'Brushed aluminium tin', pouch: 'Brushed foil pouch', box: 'Sachet box', dropper: 'Frosted dropper bottle', jar: 'Frosted glass jar'};
var cad = usd => Math.round(usd * 1.38);
ALL.forEach(p => { p.pack = FORMATS[p.g] || 'tin'; p.pc = cad(p.po); p.psc = cad(p.ps); });
var PACK = {};
var servingSize = p => { if (/servings/.test(p.s)) return p.s.split(',')[0]; if (p.top) return p.g === 'Serum' ? '2 to 3 drops' : 'A thin layer'; return p.s.replace(/ daily| as needed| in .*$/, ''); };
function fullList(p) {
  if (p.top) return p.oth.replace(/\.$/, '') + '.';
  const a = p.act.map(a => MIN[a.name] && a.form ? cap(a.form) : a.name + (a.form ? ' (' + a.form + ')' : '')).join(', ');
  const o = p.oth.replace(/No other ingredients\.?/i, '').trim();
  return a + (o ? '. ' + o.replace(/\.$/, '') + '.' : '.');
}
function keyIng(p) {
  if (p.top) { const c = (CONC[p.id] || [])[0]; return c ? {n: c[0], v: c[1], per: 'of formula'} : null; }
  const a = p.act[0]; if (!a) return null;
  const per = (p.s.match(/^1 (capsule|tablet|softgel)/) || [])[1];
  return {n: MIN[a.name] && a.form ? cap(a.form) : a.name, v: a.amt + (MIN[a.name] ? ' ' + a.name.toLowerCase() : ''), per: per ? 'per ' + per : 'per serving'};
}
function keyLine(p) {
  if (p.top) return (CONC[p.id] || []).slice(0, 2).map(c => c[0] + ' ' + c[1]).join(' / ');
  return p.act.slice(0, 2).map(a => a.name + (a.amt ? ' ' + a.amt : '')).join(' / ');
}
function purpose(p) {
  if (p.g === 'Serum') return 'Formulated as a ' + p.u + ' for ' + (/morning/.test(p.s) ? 'morning' : 'evening') + ' use.';
  if (p.top) return 'Formulated as a ' + p.u + ' for use as part of a daily routine.';
  if (/as needed/.test(p.s)) return 'Formulated as a ' + p.u + ', taken as needed.';
  if (/daily/.test(p.s)) return 'Formulated as a daily ' + p.u + '.';
  return 'Formulated as a ' + p.u + '.';
}
function directions(p) {
  const s = servingSize(p), d = [];
  if (p.g === 'Serum') { d.push('Apply 2 to 3 drops to clean, dry skin in the ' + (/morning/.test(p.s) ? 'morning' : 'evening') + '.'); d.push('Follow with a moisturiser' + (/morning/.test(p.s) ? ' and sunscreen.' : '.')); }
  else if (p.g === 'Cream') { d.push(/Body/.test(p.n) ? 'Massage a small amount into skin as needed.' : 'Apply a thin layer to clean skin, morning and evening.'); d.push('Avoid broken or irritated skin.'); }
  else if (p.g === 'Powder') d.push('Mix ' + s + ' into 250 to 300 ml of water or another drink.');
  else if (p.g === 'Sachets') d.push('Empty 1 sachet into water and stir until dissolved.');
  else { d.push('Take ' + s + (/as needed/.test(p.s) ? ' as needed' : ' daily') + ' with water.'); d.push('Taking it with a meal is fine.'); }
  d.push(p.top ? 'Store below 25 °C, away from direct light. Keep the lid closed.' : 'Store below 25 °C in a dry place, away from direct light. Close the lid after use.');
  return d;
}
function cautions(p) {
  const c = ['Consult a doctor before use if you are pregnant, nursing, taking medication, or have a medical condition.'];
  if (p.top) { c.push('For external use only. Avoid contact with eyes; if contact occurs, rinse with water.'); c.push('Patch test before first use. Stop using if irritation develops.'); }
  else { c.push('Do not exceed the stated serving.'); c.push('Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle.'); }
  c.push('Keep out of reach of children.');
  return c;
}
var batch = p => '2610-' + p.c + p.id.split('-')[1] + 'A';
/* time of day comes only from each product's directions */
var SLOTS = [
  {k: 'am', w: 'Dawn', code: 'AM', tag: 'Morning', base: 8 * 60 + 2},
  {k: 'md', w: 'Flow', code: 'MD', tag: 'Daily', base: 12 * 60 + 40},
  {k: 'pm', w: 'Dusk', code: 'PM', tag: 'Evening', base: 21 * 60 + 30}
];
function slotsFor(p) {
  if (p.g === 'Serum') return [/morning/.test(p.s) ? 'am' : 'pm'];
  if (p.g === 'Cream' && !/Body/.test(p.n)) return ['am', 'pm'];
  return ['md'];
}
export {FORMATS, PACKNAME, cad, CAT, CONC, ALL, byId, colOf, PACK, servingSize, fullList, keyIng, keyLine, purpose, directions, cautions, batch, SLOTS, slotsFor, MIN};
