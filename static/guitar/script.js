/* ═══ THEME ═══ */
const themeBtn=document.getElementById('theme-toggle');
let isDark=true;
if(localStorage.getItem('guitar-theory-theme')==='light'){document.body.classList.add('light');themeBtn.textContent='🌙';isDark=false}
themeBtn.addEventListener('click',()=>{isDark=!isDark;document.body.classList.toggle('light',!isDark);themeBtn.textContent=isDark?'☀️':'🌙';localStorage.setItem('guitar-theory-theme',isDark?'dark':'light');applyNodeColors()});

/* ═══ RESIZER ═══ */
const resizer=document.getElementById('resizer'),mapPanel=document.getElementById('map-panel'),layout=document.querySelector('.layout');
let isResizing=false;const mobileQ=window.matchMedia('(max-width:860px)');
resizer.addEventListener('mousedown',initR);resizer.addEventListener('touchstart',initR,{passive:false});
function initR(e){if(mobileQ.matches)return;isResizing=true;resizer.classList.add('active');document.body.classList.add('no-select');document.addEventListener('mousemove',doR);document.addEventListener('mouseup',stopR);document.addEventListener('touchmove',doR,{passive:false});document.addEventListener('touchend',stopR);e.preventDefault()}
function doR(e){if(!isResizing)return;const cx=e.touches?e.touches[0].clientX:e.clientX;const r=layout.getBoundingClientRect();let w=Math.max(220,Math.min(r.width-300,cx-r.left));mapPanel.style.width=w+'px';W=mapPanel.clientWidth;H=mapPanel.clientHeight;calcPos(W,H);ng.attr('transform',d=>`translate(${d.x},${d.y})`);lsel.attr('d',linkPath)}
function stopR(){isResizing=false;resizer.classList.remove('active');document.body.classList.remove('no-select');document.removeEventListener('mousemove',doR);document.removeEventListener('mouseup',stopR);document.removeEventListener('touchmove',doR);document.removeEventListener('touchend',stopR)}

/* ═══ MUSIC DATA ═══ */
const NOTE_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const NOTE_IDS=['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];
const STRINGS=[{name:'e¹',openIdx:4},{name:'B',openIdx:11},{name:'G',openIdx:7},{name:'D',openIdx:2},{name:'A',openIdx:9},{name:'E₆',openIdx:4}];
const FRET_MARKERS=new Set([3,5,7,9,12,15]);
const ALL_NOTES=[
  {id:'C',sh:'C',fl:'C',nat:true,freq:261.63},{id:'Cs',sh:'C♯',fl:'D♭',nat:false,freq:277.18},
  {id:'D',sh:'D',fl:'D',nat:true,freq:293.66},{id:'Ds',sh:'D♯',fl:'E♭',nat:false,freq:311.13},
  {id:'E',sh:'E',fl:'E',nat:true,freq:329.63},{id:'F',sh:'F',fl:'F',nat:true,freq:349.23},
  {id:'Fs',sh:'F♯',fl:'G♭',nat:false,freq:369.99},{id:'G',sh:'G',fl:'G',nat:true,freq:392.00},
  {id:'Gs',sh:'G♯',fl:'A♭',nat:false,freq:415.30},{id:'A',sh:'A',fl:'A',nat:true,freq:440.00},
  {id:'As',sh:'A♯',fl:'B♭',nat:false,freq:466.16},{id:'B',sh:'B',fl:'B',nat:true,freq:493.88},
];
const INTERVAL_LIST=[
  {st:0,name:'Perfect Unison',sh:'P1'},{st:1,name:'Minor 2nd',sh:'m2'},{st:2,name:'Major 2nd',sh:'M2'},
  {st:3,name:'Minor 3rd',sh:'m3'},{st:4,name:'Major 3rd',sh:'M3'},{st:5,name:'Perfect 4th',sh:'P4'},
  {st:6,name:'Tritone',sh:'TT'},{st:7,name:'Perfect 5th',sh:'P5'},{st:8,name:'Minor 6th',sh:'m6'},
  {st:9,name:'Major 6th',sh:'M6'},{st:10,name:'Minor 7th',sh:'m7'},{st:11,name:'Major 7th',sh:'M7'},
  {st:12,name:'Perfect Octave',sh:'P8'}
];
const SCALE_TYPES={
  'major':{name:'Major (Ionian)',intervals:[0,2,4,5,7,9,11],degrees:['1','2','3','4','5','6','7']},
  'natural-minor':{name:'Natural Minor (Aeolian)',intervals:[0,2,3,5,7,8,10],degrees:['1','2','♭3','4','5','♭6','♭7']},
  'harmonic-minor':{name:'Harmonic Minor',intervals:[0,2,3,5,7,8,11],degrees:['1','2','♭3','4','5','♭6','7']},
  'melodic-minor':{name:'Melodic Minor (Asc)',intervals:[0,2,3,5,7,9,11],degrees:['1','2','♭3','4','5','6','7']},
  'major-pent':{name:'Major Pentatonic',intervals:[0,2,4,7,9],degrees:['1','2','3','5','6']},
  'minor-pent':{name:'Minor Pentatonic',intervals:[0,3,5,7,10],degrees:['1','♭3','4','5','♭7']},
  'blues':{name:'Blues Scale',intervals:[0,3,5,6,7,10],degrees:['1','♭3','4','♭5','5','♭7']},
  'dorian':{name:'Dorian',intervals:[0,2,3,5,7,9,10],degrees:['1','2','♭3','4','5','6','♭7']},
  'phrygian':{name:'Phrygian',intervals:[0,1,3,5,7,8,10],degrees:['1','♭2','♭3','4','5','♭6','♭7']},
  'lydian':{name:'Lydian',intervals:[0,2,4,6,7,9,11],degrees:['1','2','3','♯4','5','6','7']},
  'mixolydian':{name:'Mixolydian',intervals:[0,2,4,5,7,9,10],degrees:['1','2','3','4','5','6','♭7']},
  'locrian':{name:'Locrian',intervals:[0,1,3,5,6,8,10],degrees:['1','♭2','♭3','4','♭5','♭6','♭7']},
  'phrygian-dom':{name:'Phrygian Dominant',intervals:[0,1,4,5,7,8,10],degrees:['1','♭2','3','4','5','♭6','♭7']},
  'whole-tone':{name:'Whole Tone',intervals:[0,2,4,6,8,10],degrees:['1','2','3','♯4','♯5','♭7']},
};
const CHORD_TYPES={
  'major':{name:'Major',tones:[0,4,7],labels:['R','3','5'],colors:['root','third','fifth']},
  'minor':{name:'Minor',tones:[0,3,7],labels:['R','♭3','5'],colors:['root','third','fifth']},
  'dim':{name:'Diminished',tones:[0,3,6],labels:['R','♭3','♭5'],colors:['root','third','fifth']},
  'aug':{name:'Augmented',tones:[0,4,8],labels:['R','3','♯5'],colors:['root','third','fifth']},
  'maj7':{name:'Major 7th',tones:[0,4,7,11],labels:['R','3','5','7'],colors:['root','third','fifth','seventh']},
  'dom7':{name:'Dominant 7th',tones:[0,4,7,10],labels:['R','3','5','♭7'],colors:['root','third','fifth','seventh']},
  'min7':{name:'Minor 7th',tones:[0,3,7,10],labels:['R','♭3','5','♭7'],colors:['root','third','fifth','seventh']},
  'hdim7':{name:'Half-Diminished',tones:[0,3,6,10],labels:['R','♭3','♭5','♭7'],colors:['root','third','fifth','seventh']},
  'dim7':{name:'Diminished 7th',tones:[0,3,6,9],labels:['R','♭3','♭5','♭♭7'],colors:['root','third','fifth','seventh']},
  'sus4':{name:'Sus4',tones:[0,5,7],labels:['R','4','5'],colors:['root','other','fifth']},
  'sus2':{name:'Sus2',tones:[0,2,7],labels:['R','2','5'],colors:['root','other','fifth']},
  'dom9':{name:'Dominant 9th',tones:[0,4,7,10,2],labels:['R','3','5','♭7','9'],colors:['root','third','fifth','seventh','other']},
  'add9':{name:'Add9',tones:[0,4,7,2],labels:['R','3','5','9'],colors:['root','third','fifth','other']},
  'min9':{name:'Minor 9th',tones:[0,3,7,10,2],labels:['R','♭3','5','♭7','9'],colors:['root','third','fifth','seventh','other']},
};

/* ═══ SHARED FRETBOARD RENDERER ═══ */
function renderFB(containerId,highlights,maxFret){
  maxFret=maxFret||15;
  const el=document.getElementById(containerId);if(!el)return;
  // highlights = [{stringIdx:0-5, fret:0-15, label:'R', colorClass:'root'|'third'|'fifth'|'seventh'|'other'}]
  const hmap={};
  highlights.forEach(h=>{hmap[`${h.stringIdx}-${h.fret}`]=h});
  let html='<table><thead><tr><th></th>';
  for(let f=0;f<=maxFret;f++) html+=`<th${FRET_MARKERS.has(f)?' class="fb-fret-marker"':''}>${f}</th>`;
  html+='</tr></thead><tbody>';
  STRINGS.forEach((s,si)=>{
    html+=`<tr><td class="fb-str-label">${s.name}</td>`;
    for(let f=0;f<=maxFret;f++){
      const key=`${si}-${f}`;
      const h=hmap[key];
      if(h) html+=`<td><span class="fb-dot ${h.colorClass}">${h.label}</span></td>`;
      else html+=`<td></td>`;
    }
    html+='</tr>';
  });
  html+='</tbody></table>';
  el.innerHTML=html;
}

function buildLegend(items){
  return '<div class="fb-legend">'+items.map(i=>`<div class="fb-legend-item"><div class="fb-legend-dot ${i.cls}"></div>${i.name}</div>`).join('')+'</div>';
}

/* ═══ CONTENT DATABASE ═══ */
/* Personalisasi: tambahkan field  intro:"..."  setelah  sub:"..."  di node manapun
   untuk kalimat pembuka bersuara pengalaman pribadi (1-3 kalimat).
   Contoh sudah ada di: root, sound, scales, guitar.
   Tinggal ikuti pola yang sama untuk node lain (notes, intervals, chords, dst). */
const C={
root:{title:"Apa yang Kamu Juga Perlu Tahu Soal Gitar",sub:"Catatan gitaris soal hal-hal yang seharusnya ada yang ngasih tau pas kamu baru pegang gitar. Tapi nggak ada yang ngasih tau.",intro:"Banyak gitaris main bertahun-tahun sebelum serius pegang teori. Aku salah satunya. Penyesalannya selalu sama: nunda kelamaan gara-gara ngira teori bakal bikin permainan jadi kaku. Padahal sebaliknya. Teori itu yang ngebebasin. Halaman ini peta dari semuanya. Klik node yang menarik, atau toggle ke mode esai kalau mau baca runtut dari awal.",secs:[{l:"Kenapa Repot Belajar Teori?",t:"Teori musik itu bukan aturan yang ngebatasin. Anggap aja <strong>bahasa buat ngejelasin</strong> apa yang udah kejadian di sebuah lagu, kenapa bagian ini enak didengar dan kenapa yang itu bikin merinding. Begitu kamu paham, ngobrol sama musisi lain jadi nggak bingung lagi, bedah lagu yang kamu suka juga nggak perlu nebak-nebak."},{l:"Alur Belajar",li:["1. <strong>Sound & Acoustics</strong> : suara secara fisik","2. <strong>Notes & Tuning</strong> : sistem nada dan frekuensi","3. <strong>Intervals</strong> : DNA chord dan scale","4. <strong>Scales</strong> : palette warna musik","5. <strong>Scale Math</strong> : logika matematika scale","6. <strong>Chord Construction</strong> : triad, 7th, extensions","7. <strong>Diatonic Harmony</strong> : family chord, fungsi harmoni","8. <strong>Modes</strong> : 7 warna dari 1 parent scale","9. <strong>Advanced Harmony</strong> : cadence, modulasi","10. <strong>Rhythm & Meter</strong> : struktur waktu","11. <strong>Guitar Essentials + sub-topics</strong>","12. <strong>Ear Training, Practice & Mindset</strong>"]},{l:"Tiga Pilar Musikalitas",li:["<strong>Ear Training</strong> : dengar, kenali, reproduksi","<strong>Fretboard Knowledge</strong> : tahu setiap nada tanpa berpikir","<strong>Rhythmic Fluency</strong> : nada tepat di waktu tepat"]}],tk:"Teori itu GPS, bukan penjara. Tugasnya ngejelasin 'kenapa' dari musik yang udah kamu rasain. Biar kamu nggak nyasar tiap kepingin bikin sesuatu baru.",refs:["Aldwell, E., Schachter, C. (2018). Harmony and Voice Leading, 5th ed. Cengage.","Levine, M. (1995). The Jazz Theory Book. Sher Music Co."]},

sound:{title:"Sound & Acoustics",sub:"Suara secara fisik: gelombang, frekuensi, dan gimana telinga ngolah semuanya.",intro:"Bagian ini sering dilewat karena kerasa terlalu 'sains'. Sayang banget. Begitu kamu paham kenapa fifth bunyinya stabil dan tritone bikin tegang, semua teori chord setelahnya jadi masuk akal. Bukan hafalan.",secs:[{l:"Apa Itu Suara?",t:"Suara itu <strong>gelombang mekanis longitudinal</strong>: getaran yang merambat lewat udara sekitar 343 m/s, bikin daerah rapat (kompresi) dan renggang (rarefaction) bergantian."},{l:"4 Properti Suara",tbl:{h:["Properti","Fisik","Persepsi","Satuan"],r:[["Frequency","Siklus/detik","Pitch","Hz"],["Amplitude","Variasi tekanan","Loudness","dB"],["Timbre","Komposisi overtones","Warna suara",""],["Duration","Lama getaran","Panjang nada","s"]]}},{l:"Harmonic Series",t:"Satu senar nggak cuma getar di satu frekuensi. Dia getar di 1/2, 1/3, 1/4 panjangnya sekaligus, dan itu yang ngehasilin <strong>overtones</strong>. Tiap instrumen punya komposisi harmonik beda-beda, itu yang bikin senar gitar kedengeran beda sama piano walaupun nadanya sama."},{l:"Consonance dan Dissonance",t:"Rasio frekuensi yang sederhana kedengeran konsonan (oktaf 2:1, fifth 3:2). Yang rasionya rumit kedengeran disonan. Dua-duanya <strong>alat ekspresi</strong>, tinggal kamu mau pakai yang mana. Disonan itu bukan kesalahan."}],tk:"Semua teori musik akhirnya bisa ditarik balik ke hubungan matematika antar frekuensi. Itu doang.",refs:["Rossing, T. D. (2002). The Science of Sound, 3rd ed. Addison Wesley.","Helmholtz, H. von (1885/1954). On the Sensations of Tone. Dover."]},

notes:{title:"Notes & Tuning Systems",sub:"12 nada, A = 440 Hz, dan perdebatan temperament yang udah jalan berabad-abad.",secs:[{l:"12-Note Chromatic System",t:"Musik Barat motong satu oktaf jadi <strong>12 nada berjarak sama</strong> (12-TET). Yang natural ada 7: C D E F G A B. Khusus E ke F dan B ke C, jaraknya udah cuma satu semitone."},{l:"Matematika 12-TET",t:"Tiap semitone naik dengan rasio <strong>¹²√2 ≈ 1.05946</strong>. Dari A4 = 440 Hz, A♯4 jadi 466.16 Hz, dan setelah 12 semitone ketemu 880 Hz alias naik satu oktaf pas."},{l:"Standard Guitar Tuning",tbl:{h:["String","Nada","Hz"],r:[["6","E2","82.41"],["5","A2","110.00"],["4","D3","146.83"],["3","G3","196.00"],["2","B3","246.94"],["1","E4","329.63"]]}},{l:"Alternate Tunings",li:["<strong>Drop D</strong> (D A D G B E) : power chords 1 jari","<strong>Open G</strong> (D G D G B D) : Keith Richards, blues slide","<strong>DADGAD</strong> : Celtic/folk, Jimmy Page","<strong>Open D</strong> (D A D F♯ A D) : slide, fingerstyle"]}],tk:"12-TET itu kompromi. Interval yang benar-benar murni dikorbankan, ditukar sama kebebasan main di semua 12 key tanpa harus nyetem ulang tiap pindah.",refs:["Isacoff, S. (2001). Temperament. Vintage.","Duffin, R. W. (2007). How Equal Temperament Ruined Harmony. Norton."]},

intervals:{title:"Intervals",sub:"Jarak antara dua nada. Unit paling kecil yang nyusun semua hal di musik.",secs:[{l:"13 Interval dalam 1 Oktaf",tbl:{h:["ST","Nama","Simbol","Rasio","Karakter"],r:[["0","Perfect Unison","P1","1:1","Identik"],["1","Minor 2nd","m2","16:15","Tegang"],["2","Major 2nd","M2","9:8","Terbuka"],["3","Minor 3rd","m3","6:5","Sedih"],["4","Major 3rd","M3","5:4","Cerah"],["5","Perfect 4th","P4","4:3","Kuat"],["6","Tritone","TT","45:32","Disonan"],["7","Perfect 5th","P5","3:2","Stabil"],["8","Minor 6th","m6","8:5","Misterius"],["9","Major 6th","M6","5:3","Hangat"],["10","Minor 7th","m7","9:5","Blues"],["11","Major 7th","M7","15:8","Dreamy"],["12","Octave","P8","2:1","Identik+"]]}},{l:"Klasifikasi",li:["<strong>Perfect</strong> (P1, P4, P5, P8) : tidak punya major/minor","<strong>Major/Minor</strong> (2nd, 3rd, 6th, 7th) : beda 1 semitone","<strong>Augmented</strong> : +1/2 step dari perfect/major","<strong>Diminished</strong> : -1/2 step dari perfect/minor"]},{l:"Inversion",t:"Nama interval plus inversionnya selalu jumlahnya 9, dan semitone-nya jumlahnya 12. Contoh: M3 (4 semitone) kalau dibalik jadi m6 (8 semitone). Major selalu jadi minor pas dibalik."}],tk:"Kuasai 13 interval ini lewat teori sekaligus lewat telinga. Sisa teori musik itu cuma cara nyusun interval-interval ini, jadi waktu yang kamu habisin di sini ngehemat banyak waktu di topik lain.",refs:["Kostka, S. & Payne, D. (2012). Tonal Harmony, 7th ed. McGraw-Hill."]},

scales:{title:"Scales",sub:"Kumpulan nada yang ditata rapi. Palette warna yang nentuin karakter sebuah musik.",intro:"Kalau kamu cuma hafal kotak minor pentatonik dan stuck di situ bertahun-tahun, bagian ini yang bakal ngebebasin. Scale itu rumus jarak antar nada, bukan posisi jari yang kamu hafal. Begitu rumus jaraknya nyantol, kamu bisa geser ke key mana aja.",secs:[{l:"Major Scale",t:"Pola jaraknya: <strong>W-W-H-W-W-W-H</strong>. Ini scale paling fundamental. Semua teori tonal lain didefinisikan relatif ke dia."},{l:"Natural Minor",t:"Pola jaraknya: <strong>W-H-W-W-H-W-W</strong>. Bedanya sama major: nada 3, 6, dan 7-nya diturunin (♭3, ♭6, ♭7), dan itu yang bikin terdengar lebih gelap."},{l:"Harmonic Minor",t:"Natural minor tapi nada ke-7-nya dinaikin. Efeknya ada dua: muncul jarak Augmented 2nd yang khas, dan chord V berubah jadi Dominant 7. Yang kedua itu yang bikin resolusinya kerasa kuat, kayak suara musik klasik atau flamenco."},{l:"Pentatonic",tbl:{h:["Scale","Formula","Karakter"],r:[["Major Pent","1 2 3 5 6","Cerah, melodis"],["Minor Pent","1 ♭3 4 5 ♭7","Bluesy, raw"]]}},{l:"Blues Scale",t:"Minor pentatonic ditambah ♭5 alias blue note: 1 ♭3 4 ♭5 5 ♭7. Satu nada itu doang yang bikin semuanya kedengeran ngeblues."}],tk:"Major scale itu titik acuan utama buat semua teori. Minor pentatonic itu scale yang paling sering kepake buat improvisasi sehari-hari. Dua-duanya wajib lengket di tangan.",refs:["Persichetti, V. (1961). Twentieth-Century Harmony. Norton."]},

math:{title:"Mathematics of Scale",sub:"Logika dan simetri matematika di balik cara scale dibangun.",secs:[{l:"Tetrachord",t:"Major scale sebenernya <strong>2 tetrachord yang identik</strong> (masing-masing W-W-H), disambung satu Whole Step di tengah sebagai jembatan."},{l:"Visualisasi",cd:"Tetrachord 1     Bridge     Tetrachord 2\n W _ W _ H         W         W _ W _ H\n 1   2   3   4         5   6   7   8\n\nC Major: C_D_E_F  <W>  G_A_B_C"},{l:"Circle of Fifths",t:"Tetrachord kedua dari satu key bakal jadi tetrachord pertama buat key berikutnya, dan tiap pindah nambah satu sharp. Tiap key naik satu Perfect 5th. Itu kenapa namanya Circle of Fifths."}],tk:"Tetrachord plus Circle of Fifths itu fondasi matematika dari seluruh harmoni tonal.",refs:["Benson, D. (2006). Music: A Mathematical Offering. Cambridge UP."]},

chords:{title:"Chord Construction",sub:"Chord itu interval yang ditumpuk, bukan hafalan posisi jari.",secs:[{l:"4 Triad",tbl:{h:["Tipe","Formula","Stack"],r:[["Major","1 3 5","M3+m3"],["Minor","1 ♭3 5","m3+M3"],["Dim","1 ♭3 ♭5","m3+m3"],["Aug","1 3 ♯5","M3+M3"]]}},{l:"5 Jenis 7th Chord",tbl:{h:["Tipe","Formula","Simbol"],r:[["Maj7","1 3 5 7","Cmaj7"],["Dom7","1 3 5 ♭7","C7"],["Min7","1 ♭3 5 ♭7","Cm7"],["Half-Dim","1 ♭3 ♭5 ♭7","Cø"],["Dim7","1 ♭3 ♭5 ♭♭7","C°7"]]}},{l:"Extensions",t:"9th itu nada 2nd yang dinaikin satu oktaf, 11th itu 4th, 13th itu 6th. Fungsinya nambah warna tanpa ngubah peran dasar chordnya."},{l:"Suspended",t:"Sus4 (1 4 5) dan Sus2 (1 2 5) ngeganti nada ke-3 sama nada 4 atau 2. Yang nentuin major versus minor itu nada ke-3, jadi sus chord kedengeran ambigu: bukan major, bukan minor, cuma menggantung."}],tk:"Chord itu tumpukan interval. Yang bikin Dominant 7 spesial: ada tritone di dalamnya, dan tritone itu yang narik chord buat resolve.",refs:["Levine, M. (1995). The Jazz Theory Book. Sher Music.","Piston, W. (1987). Harmony, 5th ed. Norton."]},

family:{title:"Diatonic Harmony",sub:"7 chord bawaan tiap key, dan gimana mereka saling kerja secara fungsional.",secs:[{l:"7 Diatonic Chords (C Major)",tbl:{h:["Deg","Roman","Chord","7th","Mode"],r:[["1","I","C","Cmaj7","Ionian"],["2","ii","Dm","Dm7","Dorian"],["3","iii","Em","Em7","Phrygian"],["4","IV","F","Fmaj7","Lydian"],["5","V","G","G7","Mixolydian"],["6","vi","Am","Am7","Aeolian"],["7","vii°","Bdim","Bø7","Locrian"]]}},{l:"3 Fungsi Harmoni",tbl:{h:["Fungsi","Chord","Peran"],r:[["Tonic","I, iii, vi","Stabilitas"],["Subdominant","ii, IV","Movement"],["Dominant","V, vii°","Tension"]]}},{l:"Progresi Populer",tbl:{h:["Progresi","Contoh"],r:[["I V vi IV","Don't Stop Believin'"],["ii V I","Jazz standard"],["vi IV I V","Pop modern"],["i ♭VII ♭VI V","Andalusian"]]}}],tk:"Roman numeral berlaku universal di key mana pun. Progresi yang bagus intinya main-main sama tension dan pelepasannya.",refs:["Aldwell & Schachter (2018). Harmony and Voice Leading. Cengage."]},

modes:{title:"The 7 Modes",sub:"Satu parent scale, 7 titik mulai, 7 karakter emosi yang beda.",secs:[{l:"7 Mode",tbl:{h:["#","Mode","Formula","Ciri","Karakter"],r:[["1","Ionian","1 2 3 4 5 6 7","std","Cerah"],["2","Dorian","1 2 ♭3 4 5 6 ♭7","nat 6","Hopeful minor"],["3","Phrygian","1 ♭2 ♭3 4 5 ♭6 ♭7","♭2","Dark, exotic"],["4","Lydian","1 2 3 ♯4 5 6 7","♯4","Dreamy"],["5","Mixolydian","1 2 3 4 5 6 ♭7","♭7","Bluesy"],["6","Aeolian","1 2 ♭3 4 5 ♭6 ♭7","std","Melancholic"],["7","Locrian","1 ♭2 ♭3 4 ♭5 ♭6 ♭7","♭5","Unstable"]]}},{l:"Bright to Dark",cd:"Bright <                          > Dark\nLydian > Ionian > Mixolydian > Dorian > Aeolian > Phrygian > Locrian"},{l:"Chord-Scale Theory",t:"Tiap chord diatonic punya mode-nya sendiri yang paling pas: misalnya Dm7 di key C cocoknya pakai D Dorian."}],tk:"Lydian paling terang, Locrian paling gelap. Chord-Scale Theory itu yang nyambungin tiap chord ke mode yang pas.",refs:["Russell, G. (2001). Lydian Chromatic Concept. Concept Publishing."]},

harmony:{title:"Advanced Harmony",sub:"Cadence, secondary dominant, dan modulasi.",secs:[{l:"4 Cadence",tbl:{h:["Cadence","Gerak","Kesan"],r:[["Perfect Authentic","V lalu I","Final"],["Plagal","IV lalu I","Amen"],["Half","? lalu V","Menggantung"],["Deceptive","V lalu vi","Kejutan"]]}},{l:"Secondary Dominants",t:"Dom7 dadakan yang ngarah ke chord diatonic selain I, ditulis V/x. Di key C: A7 itu V/ii, D7 itu V/V. Kayak minjam tarikan dominant buat sebentar terus dibalikin."},{l:"Tritone Substitution",t:"Satu Dom7 bisa diganti Dom7 lain yang jaraknya tritone. Contohnya G7 bisa ditukar D♭7. Bisa karena dua-duanya punya tritone yang sama persis di dalamnya."},{l:"Modulasi",li:["<strong>Direct</strong> : langsung pindah key","<strong>Pivot Chord</strong> : chord di kedua key sebagai jembatan","<strong>Common Tone</strong> : 1 nada dipertahankan","<strong>Chromatic</strong> : gerakan semitone"]}],tk:"Cadence itu tanda baca dalam harmoni. Semua teknik di sini intinya main sama ekspektasi pendengar.",refs:["Piston, W. (1987). Harmony, 5th ed. Norton."]},

rhythm:{title:"Rhythm & Meter",sub:"Rhythm itu soal kapan nada dibunyiin. Sama pentingnya sama nada apa yang dibunyiin.",secs:[{l:"Time Signatures",tbl:{h:["Sig","Arti","Contoh"],r:[["4/4","4 quarter/measure","90%+ pop/rock"],["3/4","3 quarter/measure","Waltz"],["6/8","6 eighth (2x3)","Nothing Else Matters"],["5/4","5 beats","Take Five"]]}},{l:"Note Values",cd:"Whole=4 beats  Half=2  Quarter=1\nEighth=1/2  Sixteenth=1/4  Triplet=3 in 2"},{l:"Syncopation",t:"Penekanan jatuh di offbeat, bukan di ketukan kuat. Ini inti dari groove di funk, reggae, dan jazz."}],tk:"Time signature itu cara ngelompokin ketukan, syncopation itu yang ngasih groove-nya. Tapi semua itu lewat kalau ritmenya goyang. Jadi metronome dulu, syncopation belakangan.",refs:["London, J. (2012). Hearing in Time. Oxford UP."]},

guitar:{title:"Guitar Essentials",sub:"Hal-hal mendasar yang harus dipegang tiap gitaris.",intro:"Ini bagian yang paling 'tangan'. Semua teori di atas akhirnya ketemu fretboard di sini. Kalau kamu bisa main tapi nggak tahu nada apa yang lagi dipencet, mulainya dari sini.",secs:[{l:"Tuning: E A D G B E",t:"Jarak antar senar: P4-P4-P4-M3-P4. Yang dari G ke B beda sendiri (cuma M3), dan justru anomali ini yang bikin beberapa pattern harus digeser satu fret pas lewat senar itu."},{l:"Essential Skills",li:["Open Chords: C A G E D Am Em Dm","Barre: E-shape, A-shape","Power Chords: 1+5","Minor Pentatonic Shape 1","Hammer-on, Pull-off, Slide, Bend, Vibrato"]}],tk:"Tiap fret itu satu semitone. Beresin dulu open chord, barre, sama pentatonic sebelum ngurusin yang lain.",refs:["Leavitt, W. (1966). A Modern Method for Guitar. Berklee Press."]},

caged:{title:"CAGED System",sub:"5 bentuk chord buat nutupin seluruh fretboard.",secs:[{l:"Konsep",t:"5 bentuk open chord (C-A-G-E-D) digeser pakai barre ke seluruh fretboard. Urutannya muter terus: C, A, G, E, D, lalu balik lagi ke C."},{l:"Root Navigation",cd:"Str 6: E F F# G G# A A# B C C# D D# E\nFret:  0 1 2  3 4  5 6  7 8 9  10 11 12\n\nStr 5: A A# B C C# D D# E F F# G G# A\nFret:  0 1  2 3 4  5 6  7 8 9  10 11 12"}],tk:"Hafal posisi root di senar 6 dan 5 dulu. Itu titik mulai buat tiap bentuk CAGED. Kalau root-nya udah keliatan, sisanya tinggal nyusun bentuk yang udah kamu hafal.",refs:["Kolb, T. (2006). The CAGED System. Hal Leonard."]},

fretboard:{title:"Fretboard Mapping",sub:"Kenalan sama tiap nada di fretboard sampai hafal di luar kepala.",secs:[{l:"Natural Notes per String",cd:"e1: E F   G   A   B C   D   E\nB : B C   D   E F   G   A   B\nG : G   A   B C   D   E F   G\nD : D   E F   G   A   B C   D\nA : A   B C   D   E F   G   A\nE6: E F   G   A   B C   D   E\n    0 1 2 3 4 5 6 7 8 9 10 11 12"},{l:"Shortcuts",li:["String 1 = String 6 (keduanya E)","Fret 12 = Open (1 oktaf lebih tinggi)","Octave: 6 ke 4 = +2 string +2 fret"]}],tk:"Hafalin natural notes dulu (C D E F G A B). Sharp dan flat-nya tinggal geser satu fret dari natural-nya. Lima menit sehari setahun bakal bikin kamu hafal di luar kepala.",refs:["Gambale, F. (1997). Fretboard Knowledge. Manhattan Music."]},

techniques:{title:"Lead Techniques",sub:"Teknik yang bikin gitar kedengeran kayak ngomong.",secs:[{l:"Essential",tbl:{h:["Teknik","Efek"],r:[["Hammer-On","Legato smooth"],["Pull-Off","Legato descending"],["Slide","Glissando"],["Bend","Vocal quality"],["Vibrato","Sustain hidup"],["Palm Mute","Chunky, tight"],["Tapping","Wide intervals"]]}},{l:"Bend dan Vibrato",t:"Dua teknik ini yang paling ngebedain gitaris satu sama lain. Bend wajib pas pitchnya, fals dikit langsung ketahuan. Vibrato wajib konsisten ritmenya, kalau goyang kedengeran kayak orang yang baru belajar bend."}],tk:"Teknik lead itu soal kontrol dan ekspresi. Cepat itu efek samping dari kontrol yang udah jadi, bukan tujuan.",refs:["Denyer, R. (1992). The Guitar Handbook. Knopf."]},

ear:{title:"Ear Training",sub:"Telinga itu instrumen kamu yang paling penting.",secs:[{l:"4 Area",tbl:{h:["Area","Metode"],r:[["Interval Recognition","Reference songs, app"],["Chord Quality","Mainkan acak, tebak"],["Scale/Mode ID","Backing track"],["Melodic Dictation","Reproduksi frase"]]}},{l:"Latihan Harian",li:["Nyanyikan interval sebelum mainkan di gitar","Transkripsi solo by ear (bukan tab)","App: Functional Ear Trainer, EarMaster"]}],tk:"Relative pitch bisa dilatih siapa aja, ini bukan soal bakat. Yang paling ngefek: transkripsi solo pakai kuping, tanpa lihat tab. Awalnya susah banget, dan emang harusnya gitu.",refs:["Karpinski, G. S. (2000). Aural Skills Acquisition. Oxford UP."]},

practice:{title:"Practice & Mindset",sub:"Latihan 30 menit yang terarah ngalahin 3 jam yang ngasal.",secs:[{l:"Deliberate Practice",t:"Riset Ericsson nunjukin: yang paling nentuin keahlian itu <strong>deliberate practice</strong>. Latihan yang terstruktur, fokus, sengaja keluar dari zona nyaman. Jam terbang doang nggak cukup, harus ada tujuan tiap sesinya."},{l:"Struktur Sesi",tbl:{h:["Segmen","Durasi"],r:[["Warm Up","5-10 min"],["Technique","10-15 min"],["Theory","10-15 min"],["Repertoire","10-15 min"],["Cool Down","5 min"]]}},{l:"Mindset",li:["<strong>Consistency > Intensity</strong> : 20 min/hari lebih baik dari 3 jam/minggu","<strong>Slow is Fast</strong> : akurasi membangun muscle memory benar","<strong>Record Yourself</strong> : feedback paling jujur","<strong>Everything is Connected</strong> : chord = scale = mode = interval"]}],tk:"Konsistensi ngalahin intensitas. Soal plateau, itu normal banget. Biasanya tanda otak kamu lagi nyusun ulang skill yang udah ada, bukan tanda kamu mentok.",refs:["Ericsson, K. A. et al. (1993). The Role of Deliberate Practice. Psych Review, 100(3)."]}
};

/* ═══ NOTE PICKER STATE ═══ */
const PS={enabled:new Set(['C','D','E','F','G','A','B']),count:1,bpm:60,running:false,current:[]};
let tmr=null;
function clearTmr(){if(tmr){clearInterval(tmr);tmr=null}}
function getCustomPresets(){try{return JSON.parse(localStorage.getItem('gtp')||'[]')}catch{return[]}}
function saveCustomPresets(a){localStorage.setItem('gtp',JSON.stringify(a))}
function pickRandom(){const pool=ALL_NOTES.filter(n=>PS.enabled.has(n.id));if(!pool.length)return;const cnt=Math.min(PS.count,pool.length),av=[...pool];PS.current=[];for(let i=0;i<cnt;i++){const x=Math.floor(Math.random()*av.length);PS.current.push(av.splice(x,1)[0])}updND();pulseBeat()}
function updND(){const el=document.getElementById('nd');if(!el)return;if(!PS.current.length){el.innerHTML='<span class="note-empty">SELECT NOTES BELOW</span>';return}el.innerHTML=PS.current.map(n=>`<div class="note-card"><div class="note-name">${n.sh}</div>${n.nat?'':`<div class="note-alt">${n.sh} / ${n.fl}</div>`}<div class="note-freq">${n.freq} Hz</div></div>`).join('');updPickerFB()}
function updPickerFB(){const fb=document.getElementById('picker-fb');if(!fb||!PS.current.length){if(fb)fb.innerHTML='';return}const t=PS.current.map(n=>n.sh);let h='<table><thead><tr><th></th>';for(let f=0;f<=15;f++)h+=`<th>${f}</th>`;h+='</tr></thead><tbody>';STRINGS.forEach(s=>{h+=`<tr><td class="string-label">${s.name}</td>`;for(let f=0;f<=15;f++){const nn=NOTE_NAMES[(s.openIdx+f)%12];const hit=t.includes(nn);h+=`<td class="${hit?'hit':''}">${hit?nn:'·'}</td>`}h+='</tr>'});h+='</tbody></table>';fb.innerHTML=h}
function pulseBeat(){const el=document.getElementById('nd');if(el){el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),120)}const bf=document.getElementById('bf');if(!bf)return;const ms=Math.round(60000/PS.bpm);bf.style.transition='none';bf.style.width='0%';requestAnimationFrame(()=>{bf.style.transition=`width ${ms}ms linear`;bf.style.width='100%'})}
function startTmr(){PS.running=true;updTBtn();pickRandom();tmr=setInterval(pickRandom,Math.round(60000/PS.bpm))}
function stopTmr(){PS.running=false;clearTmr();updTBtn();const bf=document.getElementById('bf');if(bf){bf.style.transition='none';bf.style.width='0%'}}
function updTBtn(){const b=document.getElementById('tbtn');if(!b)return;b.textContent=PS.running?'⏹ Stop':'▶ Start';b.classList.toggle('go',PS.running)}
function updBpmLbl(){const el=document.getElementById('bv');if(!el)return;el.textContent=`${PS.bpm} BPM · ${(60/PS.bpm).toFixed(2)}s`}
function setCount(n){PS.count=n;document.querySelectorAll('.count-row .p-btn').forEach((b,i)=>b.classList.toggle('on',i===n-1));if(PS.current.length)pickRandom()}
function toggleNote(id){if(PS.enabled.has(id))PS.enabled.delete(id);else PS.enabled.add(id);const b=document.querySelector(`.note-btn[data-id="${id}"]`);if(b)b.classList.toggle('on',PS.enabled.has(id))}
function setPreset(t){PS.enabled.clear();if(t==='nat')ALL_NOTES.filter(n=>n.nat).forEach(n=>PS.enabled.add(n.id));else if(t==='all')ALL_NOTES.forEach(n=>PS.enabled.add(n.id));else if(t==='pent')['C','D','E','G','A'].forEach(id=>PS.enabled.add(id));document.querySelectorAll('.note-btn').forEach(b=>b.classList.toggle('on',PS.enabled.has(b.dataset.id)))}
function loadCP(i){const p=getCustomPresets();if(!p[i])return;PS.enabled.clear();p[i].notes.forEach(id=>PS.enabled.add(id));document.querySelectorAll('.note-btn').forEach(b=>b.classList.toggle('on',PS.enabled.has(b.dataset.id)))}
function delCP(i){const p=getCustomPresets();p.splice(i,1);saveCustomPresets(p);renderCPs()}
function showAddPM(){const c=document.getElementById('pm-container');if(!c||!PS.enabled.size){if(!PS.enabled.size)alert('Pilih minimal 1 note.');return}c.innerHTML=`<div class="preset-modal"><input type="text" id="pm-input" placeholder="Nama preset..." maxlength="30"><button class="pm-save" onclick="savePM()">Save</button><button class="pm-cancel" onclick="document.getElementById('pm-container').innerHTML=''">Cancel</button></div>`;setTimeout(()=>{const inp=document.getElementById('pm-input');if(inp)inp.focus()},50)}
function savePM(){const inp=document.getElementById('pm-input');const name=(inp?inp.value:'').trim();if(!name)return alert('Masukkan nama.');const p=getCustomPresets();p.push({name,notes:[...PS.enabled]});saveCustomPresets(p);document.getElementById('pm-container').innerHTML='';renderCPs()}
function renderCPs(){const c=document.getElementById('cp-list');if(!c)return;const p=getCustomPresets();c.innerHTML=p.map((x,i)=>`<button class="custom-preset-chip" onclick="loadCP(${i})" title="${x.notes.join(', ')}">${x.name} <span class="chip-del" onclick="event.stopPropagation();delCP(${i})">×</span></button>`).join('')}
function onBpmChange(v){PS.bpm=+v;updBpmLbl();if(PS.running){stopTmr();startTmr()}}

/* ═══ INTERVAL TRAINER ═══ */
const IT={mode:'identify',score:0,total:0,streak:0,root:0,target:0,answer:0,answered:false,difficulty:'all'};
function itNewQ(){
  IT.answered=false;
  const maxST=IT.difficulty==='easy'?7:12;
  IT.root=Math.floor(Math.random()*12);
  IT.answer=Math.floor(Math.random()*(maxST+1));
  IT.target=(IT.root+IT.answer)%12;
  const disp=document.getElementById('it-display');if(!disp)return;
  if(IT.mode==='identify'){
    disp.innerHTML=`<span class="quiz-note">${NOTE_NAMES[IT.root]}</span><span class="quiz-arrow">→</span><span class="quiz-note">${NOTE_NAMES[IT.target]}</span>`;
    renderITChoicesInterval();
  } else {
    const iv=INTERVAL_LIST[IT.answer];
    disp.innerHTML=`<span class="quiz-note">${NOTE_NAMES[IT.root]}</span><span class="quiz-arrow">+</span><span class="quiz-interval-show">${iv.sh}</span><span class="quiz-arrow">= ?</span>`;
    renderITChoicesNote();
  }
  disp.className='quiz-display';
}
function renderITChoicesInterval(){
  const el=document.getElementById('it-choices');if(!el)return;
  const maxST=IT.difficulty==='easy'?7:12;
  const options=INTERVAL_LIST.filter(x=>x.st<=maxST);
  el.innerHTML=options.map(iv=>`<button class="quiz-btn" onclick="itCheck(${iv.st})">${iv.sh} <span style="font-size:9px;opacity:.6;display:block">${iv.name}</span></button>`).join('');
}
function renderITChoicesNote(){
  const el=document.getElementById('it-choices');if(!el)return;
  el.innerHTML=NOTE_NAMES.map((n,i)=>`<button class="quiz-btn" onclick="itCheck(${i})">${n}</button>`).join('');
}
function itCheck(val){
  if(IT.answered)return;IT.answered=true;IT.total++;
  const disp=document.getElementById('it-display');
  let correct;
  if(IT.mode==='identify'){correct=val===IT.answer}
  else{correct=val===IT.target}
  if(correct){IT.score++;IT.streak++;disp.classList.add('correct')}
  else{IT.streak=0;disp.classList.add('wrong')}
  // highlight buttons
  const btns=document.querySelectorAll('#it-choices .quiz-btn');
  btns.forEach(b=>{b.setAttribute('disabled','true')});
  if(IT.mode==='identify'){
    btns.forEach(b=>{const sv=parseInt(b.getAttribute('onclick').match(/\d+/)[0]);if(sv===IT.answer)b.classList.add('correct-answer');else if(sv===val&&!correct)b.classList.add('wrong-answer')});
  } else {
    btns.forEach(b=>{const sv=parseInt(b.getAttribute('onclick').match(/\d+/)[0]);if(sv===IT.target)b.classList.add('correct-answer');else if(sv===val&&!correct)b.classList.add('wrong-answer')});
  }
  updITScore();
  setTimeout(itNewQ,correct?800:1500);
}
function updITScore(){const el=document.getElementById('it-score');if(!el)return;const pct=IT.total?Math.round(IT.score/IT.total*100):0;el.innerHTML=`<span class="score-label">Score:</span> <span class="score-val">${IT.score}/${IT.total}</span> <span class="score-label">(${pct}%)</span> <span class="score-label" style="margin-left:auto">Streak:</span> <span class="streak">${IT.streak}</span>`}
function itSetMode(m){IT.mode=m;IT.score=0;IT.total=0;IT.streak=0;document.querySelectorAll('#it-mode-row .p-btn').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));itNewQ();updITScore()}
function itSetDiff(d){IT.difficulty=d;IT.score=0;IT.total=0;IT.streak=0;document.querySelectorAll('#it-diff-row .p-btn').forEach(b=>b.classList.toggle('on',b.dataset.diff===d));itNewQ();updITScore()}

/* ═══ SCALE VISUALIZER ═══ */
const SV={root:0,scale:'major',position:'all'};
function svUpdate(){
  const sc=SCALE_TYPES[SV.scale];if(!sc)return;
  const highlights=[];
  const posRange=SV.position==='all'?[0,15]:svPosRange(SV.position);
  STRINGS.forEach((s,si)=>{
    for(let f=posRange[0];f<=posRange[1];f++){
      const noteIdx=(s.openIdx+f)%12;
      const rel=(noteIdx-SV.root+12)%12;
      const degIdx=sc.intervals.indexOf(rel);
      if(degIdx!==-1){
        const label=sc.degrees[degIdx];
        const cls=degIdx===0?'root':label.includes('3')?'third':label.includes('5')?'fifth':label.includes('7')?'seventh':'other';
        highlights.push({stringIdx:si,fret:f,label,colorClass:cls});
      }
    }
  });
  renderFB('sv-fb',highlights);
  const info=document.getElementById('sv-info');
  if(info){
    info.innerHTML=`<strong>${NOTE_NAMES[SV.root]} ${sc.name}</strong> : ${sc.degrees.map((d,i)=>NOTE_NAMES[(SV.root+sc.intervals[i])%12]+' ('+d+')').join(' · ')}`;
  }
}
function svPosRange(pos){
  // 5 CAGED positions based on root on string 6
  const rootFret6=(SV.root-4+12)%12; // E=0, so root fret on str 6
  const offsets=[[0,3],[2,6],[4,8],[7,10],[9,12]];
  const p=parseInt(pos)-1;
  const o=offsets[p]||[0,3];
  let start=rootFret6+o[0], end=rootFret6+o[1];
  if(start>15)start-=12;if(end>15)end=15;
  if(start<0)start=0;
  return [start,end];
}
function svSetRoot(v){SV.root=parseInt(v);svUpdate()}
function svSetScale(v){SV.scale=v;svUpdate()}
function svSetPos(v){SV.position=v;document.querySelectorAll('#sv-pos-row .p-btn').forEach(b=>b.classList.toggle('on',b.dataset.pos===v));svUpdate()}

/* ═══ CHORD TONE HIGHLIGHTER ═══ */
const CH={root:0,chord:'major'};
function chUpdate(){
  const ct=CHORD_TYPES[CH.chord];if(!ct)return;
  const highlights=[];
  STRINGS.forEach((s,si)=>{
    for(let f=0;f<=15;f++){
      const noteIdx=(s.openIdx+f)%12;
      const rel=(noteIdx-CH.root+12)%12;
      const toneIdx=ct.tones.indexOf(rel);
      if(toneIdx!==-1){
        highlights.push({stringIdx:si,fret:f,label:ct.labels[toneIdx],colorClass:ct.colors[toneIdx]});
      }
    }
  });
  renderFB('ch-fb',highlights);
  const info=document.getElementById('ch-info');
  if(info){
    info.innerHTML=`<strong>${NOTE_NAMES[CH.root]} ${ct.name}</strong> : ${ct.tones.map((t,i)=>NOTE_NAMES[(CH.root+t)%12]+' ('+ct.labels[i]+')').join(' · ')}`;
  }
}
function chSetRoot(v){CH.root=parseInt(v);chUpdate()}
function chSetChord(v){CH.chord=v;chUpdate()}

/* ═══ RENDER ═══ */
const cp=document.getElementById('cp');

/* Build the inner HTML for one prose node. Shared by map-mode render() and essay mode. */
function buildNodeHTML(id,opts){
  opts=opts||{};
  const d=C[id];if(!d)return'';
  let h=`<div class="content-title">${d.title}</div><div class="content-sub">${d.sub}</div>`;
  if(d.intro)h+=`<p class="content-intro">${d.intro}</p>`;
  d.secs.forEach((s,i)=>{
    h+=`<div class="sec"${opts.noAnim?'':` style="animation-delay:${i*.04}s"`}><div class="sec-label">${s.l}</div>`;
    if(s.t)h+=`<p class="sec-text">${s.t}</p>`;
    if(s.li)h+=`<ul class="sec-list">${s.li.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    if(s.tbl){h+=`<div class="table-wrap"><table class="sec-table"><thead><tr>${s.tbl.h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${s.tbl.r.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
    if(s.cd)h+=`<pre class="sec-code">${s.cd}</pre>`;
    h+=`</div>`;
  });
  if(d.tk)h+=`<div class="takeaway"${opts.noAnim?'':` style="animation-delay:${d.secs.length*.04}s"`}><div class="takeaway-label">Key Takeaway</div><p class="takeaway-text">${d.tk}</p></div>`;
  if(d.refs)h+=`<div class="ref-block"${opts.noAnim?'':` style="animation-delay:${(d.secs.length+1)*.04}s"`}><div class="ref-label">References</div><ul class="ref-list">${d.refs.map(r=>`<li>${r}</li>`).join('')}</ul></div>`;
  return h;
}

function render(id){
  clearTmr();PS.running=false;
  if(id==='picker'){renderPicker();return}
  if(id==='intrainer'){renderIntervalTrainer();return}
  if(id==='scaleviz'){renderScaleViz();return}
  if(id==='chordhl'){renderChordHL();return}
  if(id==='tools'){renderToolsLanding();return}
  const d=C[id];if(!d)return;
  cp.innerHTML=`<div class="content-inner">${buildNodeHTML(id)}</div>`;cp.scrollTop=0;
}

/* ═══ ESSAY MODE ═══ */
/* Urutan baca linear: root dulu, lalu L1 prosa berurutan, anak guitar disisipkan setelah guitar. */
const ESSAY_ORDER=['root','sound','notes','intervals','scales','math','chords','family','modes','harmony','rhythm','guitar','caged','fretboard','techniques','ear','practice'];
let viewMode=localStorage.getItem('guitar-view-mode')==='essay'?'essay':'map';

function renderEssay(){
  clearTmr();PS.running=false;
  let h='<div class="essay-doc">';
  ESSAY_ORDER.forEach((id,idx)=>{
    if(!C[id])return;
    const isChild=['caged','fretboard','techniques'].includes(id);
    h+=`<article class="essay-section${isChild?' essay-child':''}" id="essay-${id}">${buildNodeHTML(id,{noAnim:true})}</article>`;
    if(idx<ESSAY_ORDER.length-1)h+='<div class="essay-divider"></div>';
  });
  // Catatan untuk alat interaktif yang tidak punya versi prosa
  h+=`<div class="essay-divider"></div><article class="essay-section"><div class="content-title">Alat Interaktif</div><p class="content-intro">Note Picker, Interval Trainer, Scale Visualizer, dan Chord Tone Highlighter bersifat interaktif, jadi cuma tersedia di mode Mind Map. <button class="essay-inline-link" onclick="setViewMode('map');selectNode('tools')">Buka Practice Tools di Mind Map →</button></p></article>`;
  h+='</div>';
  cp.innerHTML=h;cp.scrollTop=0;
}

function setViewMode(m){
  viewMode=m;localStorage.setItem('guitar-view-mode',m);
  document.body.classList.toggle('essay-mode',m==='essay');
  const b=document.getElementById('view-toggle');
  if(b){b.textContent=m==='essay'?'🗺 Mind Map':'📄 Mode Esai';b.title=m==='essay'?'Beralih ke tampilan mind map':'Baca sebagai esai runtut'}
  if(m==='essay')renderEssay();
  else render(selectedId||'root');
}

function renderToolsLanding(){
  cp.innerHTML=`<div class="tool-wrap">
    <div class="tool-title">Practice Tools</div>
    <div class="tool-sub">Empat tools interaktif untuk membangun skill gitaris: fretboard mapping, interval recognition, scale visualization, dan chord tone awareness. Klik sub-node di mind map.</div>
    <div class="sec"><div class="sec-label">Available Tools</div>
    <ul class="sec-list">
      <li><strong>Note Picker</strong> : random note generator untuk latihan hafal fretboard</li>
      <li><strong>Interval Trainer</strong> : quiz interaktif untuk mengenali interval antar nada</li>
      <li><strong>Scale Visualizer</strong> : lihat pattern scale apapun di fretboard, filter per posisi CAGED</li>
      <li><strong>Chord Tone Highlighter</strong> : lihat chord tones (Root, 3rd, 5th, 7th) di seluruh fretboard dengan warna berbeda</li>
    </ul></div>
  </div>`;cp.scrollTop=0;
}

function renderPicker(){
  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Note Picker</div>
<div class="tool-sub">Random note generator untuk latihan fretboard mapping.</div>
<div id="nd" class="note-display"><span class="note-empty">SELECT NOTES BELOW</span></div>
<div class="beat-bar"><div id="bf" class="beat-fill"></div></div>
<div id="picker-fb" class="fretboard-mini"></div>
<div class="ctrl-row">
  <button class="p-btn" onclick="pickRandom()">↻ Random</button>
  <button class="p-btn t-btn" id="tbtn" onclick="PS.running?stopTmr():startTmr()">▶ Start</button>
  <div class="bpm-row"><span class="bpm-label">BPM</span><input type="range" min="20" max="240" value="${PS.bpm}" oninput="onBpmChange(this.value)"><span class="bpm-value" id="bv">${PS.bpm} BPM</span></div>
</div>
<div class="sub-label">Notes per beat</div>
<div class="count-row">${[1,2,3,4].map(n=>`<button class="p-btn${PS.count===n?' on':''}" onclick="setCount(${n})">${n}</button>`).join('')}</div>
<div class="sub-label">Active notes</div>
<div class="notes-grid">${ALL_NOTES.map(n=>`<button class="note-btn${n.nat?' nat':''} ${PS.enabled.has(n.id)?'on':''}" data-id="${n.id}" onclick="toggleNote('${n.id}')">${n.nat?n.sh:`${n.sh}<br><span style="font-size:9px;opacity:.5">${n.fl}</span>`}</button>`).join('')}</div>
<div class="sub-label">Presets</div>
<div class="preset-row">
  <button class="p-btn" onclick="setPreset('nat')">Natural</button>
  <button class="p-btn" onclick="setPreset('pent')">C Pent</button>
  <button class="p-btn" onclick="setPreset('all')">All 12</button>
  <button class="p-btn" onclick="setPreset('none')">Clear</button>
</div>
<div class="sub-label" style="margin-top:14px">Custom Presets</div>
<div class="custom-preset-row"><div id="cp-list"></div><button class="preset-add-btn" onclick="showAddPM()" title="Save selection as preset">+</button></div>
<div id="pm-container"></div>
</div>`;
  cp.scrollTop=0;if(PS.current.length)updND();updTBtn();updBpmLbl();renderCPs();
}

function renderIntervalTrainer(){
  IT.score=0;IT.total=0;IT.streak=0;
  const rootOpts=NOTE_NAMES.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Interval Trainer</div>
<div class="tool-sub">Latih kemampuan mengenali interval. Mode Identify: lihat 2 nada, tebak intervalnya. Mode Build: lihat root + interval, tebak nada targetnya.</div>
<div class="sub-label">Mode</div>
<div class="tool-row" id="it-mode-row">
  <button class="p-btn on" data-mode="identify" onclick="itSetMode('identify')">Identify Interval</button>
  <button class="p-btn" data-mode="build" onclick="itSetMode('build')">Build from Interval</button>
</div>
<div class="sub-label">Difficulty</div>
<div class="tool-row" id="it-diff-row">
  <button class="p-btn" data-diff="easy" onclick="itSetDiff('easy')">Easy (P1 to P5)</button>
  <button class="p-btn on" data-diff="all" onclick="itSetDiff('all')">All Intervals</button>
</div>
<div id="it-score" class="score-bar"></div>
<div id="it-display" class="quiz-display"><span class="note-empty">Loading...</span></div>
<div id="it-choices" class="quiz-grid"></div>
</div>`;
  cp.scrollTop=0;itNewQ();updITScore();
}

function renderScaleViz(){
  const rootOpts=NOTE_NAMES.map((n,i)=>`<option value="${i}"${SV.root===i?' selected':''}>${n}</option>`).join('');
  const scaleOpts=Object.entries(SCALE_TYPES).map(([k,v])=>`<option value="${k}"${SV.scale===k?' selected':''}>${v.name}</option>`).join('');
  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Scale Visualizer</div>
<div class="tool-sub">Pilih root note dan tipe scale untuk melihat pattern-nya di seluruh fretboard. Filter per posisi CAGED.</div>
<div class="tool-row">
  <div><div class="sub-label">Root Note</div><select class="tool-select" onchange="svSetRoot(this.value)">${rootOpts}</select></div>
  <div><div class="sub-label">Scale Type</div><select class="tool-select" onchange="svSetScale(this.value)">${scaleOpts}</select></div>
</div>
<div class="sub-label">Position</div>
<div class="tool-row" id="sv-pos-row">
  <button class="p-btn on" data-pos="all" onclick="svSetPos('all')">All</button>
  ${[1,2,3,4,5].map(p=>`<button class="p-btn" data-pos="${p}" onclick="svSetPos('${p}')">Pos ${p}</button>`).join('')}
</div>
${buildLegend([{cls:'root',name:'Root (1)'},{cls:'third',name:'3rd'},{cls:'fifth',name:'5th'},{cls:'seventh',name:'7th'},{cls:'other',name:'Other'}])}
<div class="fb-board" id="sv-fb"></div>
<div class="tool-info" id="sv-info"></div>
</div>`;
  cp.scrollTop=0;svUpdate();
}

function renderChordHL(){
  const rootOpts=NOTE_NAMES.map((n,i)=>`<option value="${i}"${CH.root===i?' selected':''}>${n}</option>`).join('');
  const chordOpts=Object.entries(CHORD_TYPES).map(([k,v])=>`<option value="${k}"${CH.chord===k?' selected':''}>${v.name}</option>`).join('');
  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Chord Tone Highlighter</div>
<div class="tool-sub">Lihat di mana setiap chord tone (Root, 3rd, 5th, 7th) berada di seluruh fretboard. Pahami kenapa chord shape-nya berbentuk seperti itu.</div>
<div class="tool-row">
  <div><div class="sub-label">Root Note</div><select class="tool-select" onchange="chSetRoot(this.value)">${rootOpts}</select></div>
  <div><div class="sub-label">Chord Type</div><select class="tool-select" onchange="chSetChord(this.value)">${chordOpts}</select></div>
</div>
${buildLegend([{cls:'root',name:'Root (R)'},{cls:'third',name:'3rd'},{cls:'fifth',name:'5th'},{cls:'seventh',name:'7th'},{cls:'other',name:'Other (9, sus)'}])}
<div class="fb-board" id="ch-fb"></div>
<div class="tool-info" id="ch-info"></div>
</div>`;
  cp.scrollTop=0;chUpdate();
}

/* ═══ MIND MAP ═══ */
const NODES=[
  {id:'root',lab:'Music Theory\nfor Guitar',lv:0,sp:false},
  {id:'sound',lab:'Sound &\nAcoustics',lv:1,sp:false},
  {id:'notes',lab:'Notes &\nTuning',lv:1,sp:false},
  {id:'intervals',lab:'Intervals',lv:1,sp:false},
  {id:'scales',lab:'Scales',lv:1,sp:false},
  {id:'math',lab:'Scale\nMath',lv:1,sp:false},
  {id:'chords',lab:'Chord\nConstruction',lv:1,sp:false},
  {id:'family',lab:'Diatonic\nHarmony',lv:1,sp:false},
  {id:'modes',lab:'The 7\nModes',lv:1,sp:false},
  {id:'harmony',lab:'Advanced\nHarmony',lv:1,sp:false},
  {id:'rhythm',lab:'Rhythm\n& Meter',lv:1,sp:false},
  {id:'guitar',lab:'Guitar\nEssentials',lv:1,sp:false},
  {id:'ear',lab:'Ear\nTraining',lv:1,sp:false},
  {id:'practice',lab:'Practice\n& Mindset',lv:1,sp:false},
  {id:'tools',lab:'Practice\nTools',lv:1,sp:true},
  // L2: guitar children
  {id:'caged',lab:'CAGED\nSystem',lv:2,sp:false},
  {id:'fretboard',lab:'Fretboard\nMapping',lv:2,sp:false},
  {id:'techniques',lab:'Lead\nTechniques',lv:2,sp:false},
  // L2: tools children
  {id:'picker',lab:'Note\nPicker',lv:2,sp:true},
  {id:'intrainer',lab:'Interval\nTrainer',lv:2,sp:true},
  {id:'scaleviz',lab:'Scale\nVisualizer',lv:2,sp:true},
  {id:'chordhl',lab:'Chord Tone\nHighlight',lv:2,sp:true},
];
const LINKS=[
  // Hub spokes (root to every L1 topic
  {s:'root',t:'sound'},{s:'root',t:'notes'},{s:'root',t:'intervals'},{s:'root',t:'scales'},
  {s:'root',t:'math'},{s:'root',t:'modes'},{s:'root',t:'chords'},{s:'root',t:'family'},
  {s:'root',t:'harmony'},{s:'root',t:'rhythm'},{s:'root',t:'guitar'},{s:'root',t:'ear'},
  {s:'root',t:'practice'},{s:'root',t:'tools'},
  // Sequential learning rim (adjacent topics in the conceptual chain
  {s:'sound',t:'notes'},{s:'notes',t:'intervals'},{s:'intervals',t:'scales'},
  {s:'scales',t:'math'},{s:'scales',t:'modes'},{s:'modes',t:'chords'},
  {s:'chords',t:'family'},{s:'family',t:'harmony'},
  // Cross-links (conceptual bridges that show how topics actually relate
  {s:'intervals',t:'chords'},     // chords = stacked intervals
  {s:'intervals',t:'ear'},        // interval recognition is core ear training
  {s:'scales',t:'chords'},        // chord tones come from scales
  {s:'scales',t:'family'},        // diatonic chords come from the major scale
  {s:'chords',t:'ear'},           // chord-quality recognition
  {s:'modes',t:'family'},         // each diatonic chord has its corresponding mode
  {s:'modes',t:'harmony'},        // modal harmony
  {s:'rhythm',t:'practice'},      // rhythm needs metronome discipline
  {s:'guitar',t:'notes'},         // where notes live on the fretboard
  {s:'guitar',t:'chords'},        // chord shapes on the fretboard
  {s:'guitar',t:'scales'},        // scale patterns on the fretboard
  {s:'ear',t:'practice'},         // ear training is daily practice
  // L2 guitar children
  {s:'guitar',t:'caged'},{s:'guitar',t:'fretboard'},{s:'guitar',t:'techniques'},
  {s:'caged',t:'chords'},         // CAGED is chord-shape system
  {s:'caged',t:'fretboard'},      // CAGED helps navigate fretboard
  {s:'fretboard',t:'notes'},      // fretboard = notes spatially mapped
  {s:'techniques',t:'practice'},  // techniques live and die by practice
  // L2 tools children + their conceptual targets
  {s:'tools',t:'picker'},{s:'tools',t:'intrainer'},{s:'tools',t:'scaleviz'},{s:'tools',t:'chordhl'},
  {s:'picker',t:'notes'},         // note picker exercises notes
  {s:'intrainer',t:'intervals'},  // interval trainer
  {s:'intrainer',t:'ear'},        // interval trainer = ear training
  {s:'scaleviz',t:'scales'},      // scale visualizer
  {s:'chordhl',t:'chords'},       // chord-tone highlight tool
];
const L1=['sound','notes','intervals','scales','math','modes','chords','family','harmony','rhythm','guitar','ear','practice','tools'];
const GI=L1.indexOf('guitar'),TI=L1.indexOf('tools');
const nmap={};NODES.forEach(n=>{nmap[n.id]=n});

function calcPos(W,H){
  const cx=W/2,cy=H/2,r1=Math.min(W,H)*.30,r2=Math.min(W,H)*.47,n=L1.length;
  nmap['root'].x=cx;nmap['root'].y=cy;
  L1.forEach((id,i)=>{const a=-Math.PI/2+i*(2*Math.PI/n);nmap[id].x=cx+r1*Math.cos(a);nmap[id].y=cy+r1*Math.sin(a)});
  // Guitar children
  const ga=-Math.PI/2+GI*(2*Math.PI/n);
  [['caged',-.24],['fretboard',0],['techniques',.24]].forEach(([id,off])=>{nmap[id].x=cx+r2*Math.cos(ga+off);nmap[id].y=cy+r2*Math.sin(ga+off)});
  // Tools children
  const ta=-Math.PI/2+TI*(2*Math.PI/n);
  [['picker',-.30],['intrainer',-.10],['scaleviz',.10],['chordhl',.30]].forEach(([id,off])=>{nmap[id].x=cx+r2*Math.cos(ta+off);nmap[id].y=cy+r2*Math.sin(ta+off)});
}

const mp=document.getElementById('map-panel');
let W=mp.clientWidth,H=mp.clientHeight;
calcPos(W,H);

const svg=d3.select('#mm');const g=svg.append('g');
svg.call(d3.zoom().scaleExtent([.3,3.5]).on('zoom',e=>g.attr('transform',e.transform)));
function linkPath(d){
  const s=nmap[d.s],t=nmap[d.t];
  // Hub spokes: straight radial line
  if(d.s==='root'||d.t==='root') return `M${s.x},${s.y}L${t.x},${t.y}`;
  // Cross-links: quadratic Bezier curving outward (away from canvas center)
  const cx=W/2,cy=H/2;
  const mx=(s.x+t.x)/2,my=(s.y+t.y)/2;
  let dx=mx-cx,dy=my-cy;
  let dlen=Math.hypot(dx,dy);
  if(dlen<1){dx=-(t.y-s.y);dy=t.x-s.x;dlen=Math.hypot(dx,dy)||1}
  const linkLen=Math.hypot(t.x-s.x,t.y-s.y);
  const curve=Math.min(linkLen*0.18,70);
  const px=mx+(dx/dlen)*curve,py=my+(dy/dlen)*curve;
  return `M${s.x},${s.y}Q${px},${py} ${t.x},${t.y}`;
}
const lsel=g.append('g').selectAll('path').data(LINKS).join('path')
  .attr('d',linkPath)
  .attr('fill','none');
const R={0:38,1:22,2:16};
const ng=g.append('g').selectAll('g').data(NODES).join('g')
  .attr('transform',d=>`translate(${d.x},${d.y})`)
  .attr('cursor','pointer')
  .on('click',(e,d)=>{e.stopPropagation();selectNode(d.id)});
ng.append('circle').attr('r',d=>R[d.lv]).attr('stroke-width',d=>d.lv===0?2:1.5);
ng.each(function(d){
  const el=d3.select(this),lines=d.lab.split('\n');
  const fs=d.lv===0?9:d.lv===1?7.5:6.5,lh=d.lv===0?11:9;
  const tx=el.append('text').attr('text-anchor','middle').attr('pointer-events','none').attr('font-family',"'Poppins',sans-serif");
  lines.forEach((ln,i)=>{tx.append('tspan').attr('x',0).attr('dy',i===0?-(lines.length-1)*lh/2:lh).attr('font-size',fs).attr('font-weight',d.lv===0?'700':'500').text(ln)});
});

let selectedId=null;
function getCS(){const s=getComputedStyle(document.body);const g=v=>s.getPropertyValue(v).trim();return{rootFill:g('--node-root-fill'),rootStroke:g('--node-root-stroke'),rootText:g('--node-root-text'),l1Fill:g('--node-l1-fill'),l1Stroke:g('--node-l1-stroke'),l1Text:g('--node-l1-text'),l2Fill:g('--node-l2-fill'),l2Stroke:g('--node-l2-stroke'),l2Text:g('--node-l2-text'),spFill:g('--node-sp-fill'),spStroke:g('--node-sp-stroke'),spText:g('--node-sp-text'),activeFill:g('--node-active-fill'),activeStroke:g('--node-active-stroke'),activeText:g('--node-active-text'),spActiveFill:g('--node-sp-active-fill'),spActiveStroke:g('--node-sp-active-stroke'),linkColor:g('--link-color'),linkActive:g('--link-active')}}

function applyNodeColors(){
  const c=getCS();
  ng.select('circle')
    .attr('fill',d=>{if(d.id===selectedId)return d.sp?c.spActiveFill:c.activeFill;if(d.sp)return c.spFill;return d.lv===0?c.rootFill:d.lv===1?c.l1Fill:c.l2Fill})
    .attr('stroke',d=>{if(d.id===selectedId)return d.sp?c.spActiveStroke:c.activeStroke;if(d.sp)return c.spStroke;return d.lv===0?c.rootStroke:d.lv===1?c.l1Stroke:c.l2Stroke});
  ng.select('text')
    .attr('fill',d=>{if(d.id===selectedId)return d.sp?c.spText:c.activeText;if(d.sp)return c.spText;return d.lv===0?c.rootText:d.lv===1?c.l1Text:c.l2Text});
  lsel.attr('stroke',d=>(d.s===selectedId||d.t===selectedId)?c.linkActive:c.linkColor)
    .attr('stroke-width',d=>(d.s===selectedId||d.t===selectedId)?1.6:0.85)
    .attr('stroke-opacity',d=>(d.s===selectedId||d.t===selectedId)?.85:.45);
}
function selectNode(id){clearTmr();PS.running=false;selectedId=id;applyNodeColors();if(viewMode==='map')render(id)}
new ResizeObserver(()=>{W=mp.clientWidth;H=mp.clientHeight;calcPos(W,H);ng.attr('transform',d=>`translate(${d.x},${d.y})`);lsel.attr('d',linkPath)}).observe(mp);

/* ═══ VIEW TOGGLE (Mind Map ⟷ Esai) ═══ */
(function initViewToggle(){
  const btn=document.createElement('button');
  btn.id='view-toggle';
  btn.className='view-toggle';
  const hdr=document.querySelector('header');
  const themeT=document.getElementById('theme-toggle');
  hdr.insertBefore(btn,themeT);
  btn.addEventListener('click',()=>setViewMode(viewMode==='essay'?'map':'essay'));
})();

selectedId='root';applyNodeColors();
setViewMode(viewMode);
