/* ═══ THEME ═══ */
const themeBtn=document.getElementById('theme-toggle');
let isDark=true;
if(localStorage.getItem('learning-theme')==='light'){document.body.classList.add('light');themeBtn.textContent='🌙';isDark=false}
themeBtn.addEventListener('click',()=>{isDark=!isDark;document.body.classList.toggle('light',!isDark);themeBtn.textContent=isDark?'☀️':'🌙';localStorage.setItem('learning-theme',isDark?'dark':'light');applyNodeColors()});

/* ═══ RESIZER ═══ */
const resizer=document.getElementById('resizer'),mapPanel=document.getElementById('map-panel'),layout=document.querySelector('.layout');
let isResizing=false;const mobileQ=window.matchMedia('(max-width:860px)');
resizer.addEventListener('mousedown',initR);resizer.addEventListener('touchstart',initR,{passive:false});
function initR(e){if(mobileQ.matches)return;isResizing=true;resizer.classList.add('active');document.body.classList.add('no-select');document.addEventListener('mousemove',doR);document.addEventListener('mouseup',stopR);document.addEventListener('touchmove',doR,{passive:false});document.addEventListener('touchend',stopR);e.preventDefault()}
function doR(e){if(!isResizing)return;const cx=e.touches?e.touches[0].clientX:e.clientX;const r=layout.getBoundingClientRect();let w=Math.max(220,Math.min(r.width-300,cx-r.left));mapPanel.style.width=w+'px';W=mapPanel.clientWidth;H=mapPanel.clientHeight;calcPos(W,H);ng.attr('transform',d=>`translate(${d.x},${d.y})`);lsel.attr('d',linkPath)}
function stopR(){isResizing=false;resizer.classList.remove('active');document.body.classList.remove('no-select');document.removeEventListener('mousemove',doR);document.removeEventListener('mouseup',stopR);document.removeEventListener('touchmove',doR);document.removeEventListener('touchend',stopR)}

/* ═══ CONTENT DATABASE ═══
   Bilingual: Indonesian body + English technical terms + English citations.
   Rigorous: where source notes were pop-sci, claims are replaced or annotated
   with peer-reviewed findings.
*/
const C={
root:{title:"Apa yang Kamu Juga Perlu Tahu Soal Belajar",sub:"Catatan tentang gimana cara belajar yang didukung riset, bukan yang viral di TikTok study-with-me.",intro:"Aku habis SMA dengan ranking yang lumayan, tapi pas ditanya isi pelajaran kelas 11, kosong. Itu pelajaran pertama yang nggak masuk silabus: studying nggak otomatis sama dengan learning. Halaman ini peta dari semua hal yang aku rasa harusnya diajarin lebih awal, dengan sumber peer-reviewed di belakang tiap klaim. Klik node yang menarik, atau toggle Essay Mode di header buat baca runtut.",secs:[
  {l:"Kenapa Peta Ini Ada",t:"Belajar itu skill yang bisa dilatih, bukan bakat bawaan. Sebagian besar orang nggak pernah diajarin tekniknya, dan akhirnya ngerasa duduk lama di perpus itu sama dengan belajar. Riset memori 50 tahun terakhir bilang sebaliknya. Yang nentuin retensi bukan jumlah jam menatap halaman, tapi seberapa sering kamu narik info itu balik keluar dari kepala (Roediger & Karpicke, 2006)."},
  {l:"Alur Pembacaan",li:["1. <strong>Studying vs Learning</strong> : kerangka meta","2. <strong>Time Architecture</strong> : pomodoro, dan kritik klaim 10.000 jam","3. <strong>Focus & Attention</strong> : single-task vs multi-task","4. <strong>Active Recall</strong> : the testing effect","5. <strong>Spaced Repetition</strong> : forgetting curve","6. <strong>Pareto & Deliberate Practice</strong> : prioritas dan kelemahan","7. <strong>Mindset & Difficulty</strong> : growth mindset, dengan caveat","8. <strong>Goals & Identity</strong> : implementation intentions","9. <strong>Reading Method</strong> : aktif, marginalia, review","10. <strong>Mind Mapping (GRINDE)</strong> : evidence yang campur","11. <strong>Social Layer</strong> : peer learning dan mentor","12. <strong>Body & Sleep</strong> : substrat fisik","13. <strong>Practice Tools</strong> : implementasi"]},
  {l:"Tiga Layer Belajar",li:["<strong>Encoding</strong> : recall, spaced repetition, mind mapping. Cara info masuk dan bertahan.","<strong>Kondisi</strong> : time, focus, body, social. Lingkungan yang ngebuat encoding mungkin.","<strong>Arah</strong> : mindset, goals, priority. Yang nentuin kemana effort dialokasiin."]}
],tk:"Kalo cuma bisa baca satu hal di halaman ini, baca Active Recall. Itu temuan paling konsisten dari riset pendidikan modern, dan paling banyak diabaiin sama gimana sekolah ngajarin.",refs:["Brown, P. C., Roediger, H. L., & McDaniel, M. A. (2014). Make It Stick: The Science of Successful Learning. Harvard University Press.","Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58.","Roediger, H. L., & Karpicke, J. D. (2006). The power of testing memory. Perspectives on Psychological Science, 1(3), 181-210."]},

meta:{title:"Studying vs Learning",sub:"Empat jam di perpus bukan empat jam belajar. Bedanya nggak halus.",intro:"Empat jam baca buku linguistik di kafe favoritku, ngerasa udah ngerti. Besoknya ditanya ringkasannya, blank total. Pengalaman itu pelajaran pertama yang nggak masuk silabus.",secs:[
  {l:"Bedanya Apa?",t:"Studying itu input. Kamu duduk, baca, highlight, nontonin lecturer. Learning itu encoding yang bertahan. Karpicke dan Roediger (2008) nge-test mahasiswa pakai dua kondisi sederhana. Satu grup re-read materi sampe empat kali. Satu grup baca sekali, lalu nge-tes diri tiga kali. Yang re-read ngerasa lebih pede. Sebulan kemudian, yang nge-tes diri inget 80% materi. Yang re-read cuma 36%."},
  {l:"Illusion of Competence",t:"Kenapa duduk lama nipu kita? Soalnya rasa familiar itu rasanya kayak knowledge. Baca paragraf yang sama lima kali, kamu mulai hafal bentuknya. Otak nganggap familiarity itu pemahaman. Robert Bjork (1994) nyebut ini sebagai <em>illusion of competence</em>, dan dia identify highlight serta re-read sebagai biang keroknya. Cara paling murah ngecek: kalo nggak bisa nutup buku dan ngejelasin balik isinya, berarti belum belajar."},
  {l:"Metacognition Gap",t:"Yang lebih jahat lagi, orang paling overconfident biasanya paling nggak akurat ngerti pemahamannya sendiri (Kruger & Dunning, 1999). Mereka nggak punya kalibrasi internal. Solusinya bukan baca lebih lama. Solusinya tes diri lebih sering, lebih awal, dan lebih kecil. Salah pas kuis 5 soal lebih baik daripada salah pas UAS."},
  {l:"Desirable Difficulty",t:"Bjork punya istilah lain yang penting: <em>desirable difficulty</em>. Cara belajar yang bikin sesi terasa lambat dan menyusahkan biasanya yang paling jangka panjang efektif. Yang gampang itu jebakan. Kalo kamu lagi belajar dan rasanya gampang banget, itu sinyal bahwa kamu mungkin lagi mode familiarity, bukan mode encoding."}
],tk:"Cara paling adil ngukur belajar: bisa atau nggak kamu nutup buku dan ngejelasin isinya. Sampe situ, masih studying.",refs:["Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. Science, 319(5865), 966-968.","Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In Metacognition: Knowing about knowing (pp. 185-205). MIT Press.","Kruger, J., & Dunning, D. (1999). Unskilled and unaware of it. Journal of Personality and Social Psychology, 77(6), 1121-1134.","Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way."]},

time:{title:"Time Architecture",sub:"Pomodoro bukan magic. Tapi struktur waktu apapun beats no structure.",intro:"Pertama kali nyobain pomodoro, aku setia banget sama 25/5. Lama-lama sadar angka 25 itu arbitrary. Yang penting cuma satu: ada break terjadwal sebelum konsentrasi anjlok.",secs:[
  {l:"Vigilance Decrement",t:"Otak nggak bisa konsentrasi konstan. Ariga dan Lleras (2011) nunjukin yang disebut <em>vigilance decrement</em>: performance di task perhatian jatuh signifikan setelah ~20-30 menit. Tapi rest break yang singkat me-restore performance ke level semula. Itulah landasan empiris pomodoro. Bukan angka 25/5-nya, tapi prinsip break terjadwal sebelum decrement kedetect."},
  {l:"Mitos Ratio 1:2",t:"Catatan asal ngusulin rasio studi:praktik 1:2. Aku coba cari sumbernya, nggak nemu paper yang ngedukung. Yang didukung literatur: rasio yang work itu konsisten, bukan optimal pada angka tertentu. Cirillo (1992) sendiri ngusulin 25/5 dari pengalaman pribadi pas kuliah, bukan dari studi randomized. Pomodoro Inc. udah berkali-kali ngakuin angka itu rule of thumb, bukan finding."},
  {l:"Mitos 10.000 Jam dan 20 Jam",t:"Klaim '10.000 jam jadi expert' itu salah baca Gladwell terhadap Ericsson, Krampe, dan Tesch-Römer (1993). Paper asli Ericsson nggak pernah ngeklaim angka magis. Macnamara, Hambrick, dan Oswald (2014) lakuin meta-analisis 88 studi: deliberate practice ngejelasin 26% variansi performance di game, 21% di musik, 18% di olahraga, dan cuma 4% di pendidikan akademis. Domain matters banget. Klaim '20 jam buat learn a skill' dari Josh Kaufman juga nggak punya basis peer-review."},
  {l:"3-Hour Daily, Dengan Caveat",t:"Catatan asal ngusulin tiga jam non-negotiable: pagi body, siang consume, malem create. Sebagai struktur kebiasaan, itu masuk akal karena align sama implementation intentions (Gollwitzer, 1999): jadwal yang spesifik tiga kali lebih mungkin diikutin daripada niat umum. Tapi angka tiga jam-nya arbitrary. Yang penting konsistensi, bukan total jam-nya. Tracker di tools pakai frame ini karena gampang dilembagain, bukan karena tiga jam adalah angka ajaib."}
],tk:"Pomodoro work karena melawan vigilance decrement, bukan karena 25/5 magis. 10.000 jam dan 20 jam itu pop-sci. Yang work: struktur konsisten + break terjadwal + jadwal harian spesifik.",refs:["Ariga, A., & Lleras, A. (2011). Brief and rare mental 'breaks' keep you focused. Cognition, 118(3), 439-443.","Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice in the acquisition of expert performance. Psychological Review, 100(3), 363-406.","Macnamara, B. N., Hambrick, D. Z., & Oswald, F. L. (2014). Deliberate practice and performance in music, games, sports, education, and professions: A meta-analysis. Psychological Science, 25(8), 1608-1618.","Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493-503."]},

focus:{title:"Focus & Attention",sub:"HP di sebelah laptop itu pajak kognitif yang kamu bayar tanpa sadar.",intro:"Aku dulu pikir bisa belajar sambil notifikasi WhatsApp nyala. Sekarang kalo HP-ku di kamar lain, belajar selesai lebih cepat dan inget lebih banyak. Bukan placebo.",secs:[
  {l:"Switching Cost Itu Real",t:"Mark, Gudith, dan Klocke (2008) ngeobservasi pekerja kantor: tiap kali ke-interrupt, butuh rata-rata 23 menit 15 detik buat balik ke task original. Rosen dan kolega (2013) ngedapetin mahasiswa rata-rata cuma fokus 6 menit sebelum check device. Multi-task itu illusion. Yang otak lakuin sebenarnya task-switching, dan tiap switch ada cost-nya."},
  {l:"Brain Drain",t:"Ward, Duke, Gneezy, dan Bos (2017) nge-test sesuatu yang lebih halus. Tiga grup mahasiswa nge-test cognitive capacity. Grup A: HP di meja, layar bawah. Grup B: HP di tas. Grup C: HP di kamar lain. Bahkan dengan HP mati. Hasilnya monoton: makin jauh HP, makin tinggi working memory. Mereka nyebut ini <em>brain drain effect</em>. Cuma keberadaan HP di field of vision udah ngambil resource kognitif."},
  {l:"Supertasker Itu Mitos",t:"Ophir, Nass, dan Wagner (2009) di PNAS nge-test heavy media multitaskers vs light: heavy multitaskers performance lebih buruk di tiap test, termasuk task-switching itu sendiri. Strayer dan Watson (2012) ngeklaim cuma ~2.5% populasi qualifying sebagai supertasker. Statistik sederhana: kemungkinan kamu salah satunya kecil. Asumsi default-nya kamu bukan."},
  {l:"Praktik Konkretnya",li:["<strong>HP di kamar lain</strong> bukan di meja, bukan di tas","<strong>Single-task hard</strong>, dual-task hanya di task ringan (audiobook saat jalan)","<strong>Pre-focus ritual</strong> : 2 menit napas, atur meja, set timer. Cue ke otak bahwa mode focus mulai","<strong>Lingkungan minim cue</strong> : meja bersih ngurangin distraksi visual"]}
],tk:"Single-task isn't a virtue, it's the only mode otak bisa optimal. Treat multi-task sebagai default skill yang lebih buruk, kecuali kamu salah satu dari 2.5% supertasker.",refs:["Mark, G., Gudith, D., & Klocke, U. (2008). The cost of interrupted work: More speed and stress. Proceedings of CHI 2008, 107-110.","Ward, A. F., Duke, K., Gneezy, A., & Bos, M. W. (2017). Brain drain: The mere presence of one's own smartphone reduces available cognitive capacity. Journal of the Association for Consumer Research, 2(2), 140-154.","Ophir, E., Nass, C., & Wagner, A. D. (2009). Cognitive control in media multitaskers. PNAS, 106(37), 15583-15587.","Strayer, D. L., & Watson, J. M. (2012). Supertaskers and the multitasking brain. Scientific American Mind, 23(1), 22-29."]},

recall:{title:"Active Recall",sub:"Kalo cuma ada satu teknik yang harus kamu adopt dari halaman ini, ini dia.",intro:"Pertama kali aku ditunjukin active recall, reaksinya 'gini doang?'. Lalu IPK semester berikutnya naik 0.4 tanpa nambah jam belajar. Aku jadi defensive sama waktu yang ke-buang dulu di mode re-read.",secs:[
  {l:"The Testing Effect",t:"Roediger dan Karpicke (2006) namain ini <em>testing effect</em>. Tes nggak cuma ngukur pengetahuan. Tes itu sendiri jadi event encoding. Tiap kali kamu narik info keluar dari memori, koneksi neural-nya menguat. Effect-nya gede dan replicable. Meta-analisis Adesope, Trevisan, dan Sundararajan (2017) ngebandingin testing vs re-study di 118 studi. Effect size median d=0.61. Itu di domain pendidikan termasuk besar."},
  {l:"Retrieval Practice Mengalahkan Concept Mapping",t:"Ini temuan yang nyentil. Karpicke dan Blunt (2011) di Science ngebandingin empat kondisi: re-study, retrieval practice, concept mapping awal, dan elaborative concept mapping. Sebulan kemudian, yang retrieval practice ngalahin concept mapping di test retention dan inference. Tapi prediksi mahasiswa sendiri kebalik: mereka yang ngerjain concept map pede mereka inget paling banyak. Lagi-lagi illusion of competence."},
  {l:"Bentuk Konkretnya",li:["<strong>Flashcards</strong> : kartu pertanyaan-jawaban, drill secara berkala. Klasik karena work.","<strong>Blurt</strong> : selesai baca satu sub-bab, tutup buku, tulis semua yang kamu inget di kertas kosong selama 5-10 menit. Lalu bandingin sama materi.","<strong>Practice problems</strong> : kerjain soal sebelum review jawaban, bahkan kalo kamu yakin gagal. Failed retrieval pun nguatin encoding (Kornell, Hays, & Bjork, 2009).","<strong>Self-explanation</strong> : sambil baca, paksa diri jawab 'kenapa ini bener?' di tiap step."]},
  {l:"Feynman Sebagai Recall Terdalam",t:"Feynman technique itu retrieval practice yang dipush ke extreme: bukan cuma narik info keluar, tapi paksa diri ngejelasin pake bahasa yang sesimple mungkin. Itu nge-expose gap di pemahaman dengan jujur. Klik node Feynman Method buat detail lebih lanjut, atau langsung pake Feynman Walker di tools."}
],tk:"Kalo kamu nggak retrieve, kamu nggak belajar. Highlight nggak retrieve. Re-read nggak retrieve. Tes diri retrieve.",refs:["Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249-255.","Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying with concept mapping. Science, 331(6018), 772-775.","Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. Review of Educational Research, 87(3), 659-701.","Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance subsequent learning. Journal of Experimental Psychology, 35(4), 989-998."]},

spaced:{title:"Spaced Repetition",sub:"Ebbinghaus udah bukti ini di tahun 1885. Kita masih ngecram kayak itu nggak relevan.",intro:"Pertama kali aku pake Anki buat belajar Jepang, kerasa boring. Lima belas menit per hari, gitu doang. Tiga bulan kemudian aku bisa baca manga ringan tanpa kamus. Spacing menang dari intensitas.",secs:[
  {l:"Forgetting Curve",t:"Hermann Ebbinghaus (1885) ngehabisin tahunan ngehapal nonsense syllables, ngitung berapa banyak yang dia inget di interval berbeda. Hasilnya forgetting curve klasik: paling besar lupa kejadiannya di jam pertama. Setelah itu rate of forgetting melambat. Tapi yang penting bukan curve-nya. Yang penting yang dia temuin selanjutnya: tiap kali kamu review tepat sebelum lupa total, curve-nya jadi makin landai. Memory bisa di-shape."},
  {l:"Lag Effect dan Distributed Practice",t:"Cepeda, Pashler, Vul, Wixted, dan Rohrer (2006) ngerjain meta-analisis 254 studi spacing. Kesimpulannya jelas: spacing effect itu salah satu finding paling robust di seluruh literatur memori. Pertanyaan praktis lebih kompleks: berapa lama jarak optimal antar review? Studi mereka (Cepeda et al., 2008) di 1.354 orang nunjukin rule of thumb: jarak review optimal ≈ 10-30% dari rentang waktu kamu butuh inget materi. Mau inget seminggu? Spacing 1-2 hari. Mau inget setahun? Spacing 2-4 bulan."},
  {l:"Leitner Box: Versi Manual",t:"Sebastian Leitner (1972) bikin sistem analog yang sampe sekarang masih elegan. Lima box. Kartu yang kamu jawab bener naik satu box. Kartu yang salah balik ke box 1. Tiap box punya interval review yang lebih panjang. Anki, SuperMemo, dan semua app spaced repetition modern itu re-implementation digital dari prinsip yang sama. Tools di halaman ini implement Leitner versi sederhana karena yang penting adalah grasp prinsipnya, bukan algoritma SM-2 yang detail."},
  {l:"Kenapa Cramming Gagal",t:"Cramming dapet hasil bagus di kuis besoknya. Tapi penelitian Bahrick dan kolega (1993) yang nge-track retention sampai 8 tahun nunjukin retention dari mass practice jatuh dramatis setelah seminggu. Dari spaced practice? Lebih lestari. Skala waktu yang relevan buat dipikirin bukan 'minggu depan ujian', tapi 'tahun depan masih inget'. Cramming optimal buat metrik yang salah."}
],tk:"Schedule beats intensity. Lima belas menit tiap hari ngalahin tiga jam sekali seminggu, dan itu hampir selalu bener buat memori jangka panjang.",refs:["Ebbinghaus, H. (1885/1913). Memory: A contribution to experimental psychology. Teachers College, Columbia University.","Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin, 132(3), 354-380.","Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. Psychological Science, 19(11), 1095-1102.","Bahrick, H. P., Bahrick, L. E., Bahrick, A. S., & Bahrick, P. E. (1993). Maintenance of foreign language vocabulary and the spacing effect. Psychological Science, 4(5), 316-321."]},

priority:{title:"Pareto & Deliberate Practice",sub:"Kebanyakan orang ngabisin 80% waktu di 20% materi paling gampang. Itu kebalik.",intro:"Aku punya kebiasaan lama: nge-review topik yang aku udah ngerti karena rasanya enak. Sampe akhirnya aku sadar itu cara ngumpetin diri dari topik yang aku nggak ngerti. Kelemahan kamu yang seharusnya dapet 80% waktu.",secs:[
  {l:"Pareto Bukan Hukum, Tapi Pattern Berguna",t:"Vilfredo Pareto observasi distribusi tanah Italia abad 19: 20% populasi punya 80% tanah. Diturunin jadi 'Pareto principle', orang generalize ke semua hal. Hati-hati: nggak ada hukum matematika yang ngepaksa 80/20 di belajar. Tapi sebagai heuristik buat prioritas, work. Di kebanyakan domain, ada subset kecil konsep fundamental yang ngebuka pemahaman besar. Identifikasi mereka, fokus disitu lebih dulu."},
  {l:"Deliberate Practice, Versi Aslinya",t:"Sebelum Gladwell ngepopulerin 10.000 jam, Ericsson dan kolega (1993) udah lebih spesifik soal apa yang ngebuat practice efektif. Mereka nyebut deliberate practice, dengan ciri spesifik: ada tujuan eksplisit di tiap sesi, ada feedback langsung, ada repetisi pada elemen tertentu, dan paling penting, di-design buat nyentuh batas kemampuan sekarang. Casual practice (main bola sama temen) bukan deliberate practice. Drill spesifik di teknik yang lemah, itu deliberate practice."},
  {l:"Zone of Proximal Development",t:"Vygotsky (1978) ngusulin konsep yang searah: ada tiga zona buat tiap skill. Yang udah dikuasai (terlalu gampang, growth nol), yang di luar jangkauan (terlalu sulit, frustasi), dan zona di tengah, di mana materi cukup menantang tapi masih bisa diselesaikan dengan effort. Belajar paling cepat terjadi di zona tengah. Praktiknya: kalo materi terlalu gampang, kamu cuma nyemen apa yang udah ada. Kalo terlalu sulit, kamu cuma frustasi tanpa progress."},
  {l:"Cara Identifikasi Kelemahan",li:["<strong>Tes diri dulu sebelum baca</strong>. Pertanyaan yang kamu gagal jawab itu peta kelemahanmu.","<strong>Catat pattern error</strong>. Bukan list soal yang salah, tapi kategorinya. 'Sering salah di integration by parts' beda dari 'salah hitung'.","<strong>Cari masalah yang baru-baru ini gagal</strong>, bukan yang baru-baru ini sukses. Comfort ngumpetin kelemahan.","<strong>Spend 80% time di 20% area yang paling lemah</strong>. Bukan area yang paling lo benci, tapi yang feedback-nya bilang kamu paling salah."]}
],tk:"Tempat kamu paling lemah itu tempat kurva belajar paling curam. Cari rasa nggak nyaman itu sebagai sinyal arah, bukan sinyal stop.",refs:["Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice. Psychological Review, 100(3), 363-406.","Macnamara, B. N., Hambrick, D. Z., & Oswald, F. L. (2014). Deliberate practice and performance: A meta-analysis. Psychological Science, 25(8), 1608-1618.","Vygotsky, L. S. (1978). Mind in Society: The Development of Higher Psychological Processes. Harvard University Press.","Hambrick, D. Z., et al. (2018). Beyond the dichotomy between innate talent and deliberate practice. American Psychologist."]},

mindset:{title:"Mindset & Difficulty",sub:"Growth mindset ada bukti empirisnya, tapi efeknya jauh lebih kecil dari yang diviralkan.",intro:"Aku pernah ngehabisin sebulan baca buku self-help mindset, dan IPK-ku nggak gerak. Apa yang akhirnya gerakin? Ganti teknik belajar. Mindset matters, tapi nggak bisa ngeganti metode yang salah.",secs:[
  {l:"Klaim Asli Growth Mindset",t:"Carol Dweck (2006) ngeklaim siswa yang percaya intelligence bisa dikembangin (growth mindset) outperform yang percaya intelligence itu fixed. Tema sentral: praise effort, not ability. Buku Mindset jadi bestseller, dan growth mindset masuk ke kurikulum sekolah di banyak negara."},
  {l:"Meta-Analisis Yang Bikin Pause",t:"Sisk dan kolega (2018) nge-review 273 studi (n>365.000) di Psychological Science. Korelasi mindset dengan achievement: r=0.10, dampak intervensi mindset: d=0.08. Itu effect kecil, signifikan secara statistik di sample besar tapi praktis nggak banyak. Burgoyne, Hambrick, dan Macnamara (2020) konfirmasi: efek growth mindset diestimasi terlalu tinggi di literatur populer. Bukan zero, tapi jauh dari magic bullet."},
  {l:"Yang Lebih Kuat Buktinya: Desirable Difficulty",t:"Cara reframe yang lebih punya basis empiris kuat: bukan 'mindset positive ngebuat belajar lebih baik', tapi 'kesulitan adalah informasi'. Bjork (1994, 2011) nunjukin task yang terasa sulit pas ngerjain biasanya yang ngehasilin retention terbaik jangka panjang. Sebaliknya yang terasa gampang sering kali less effective. Kalo materi terasa berat, itu bukan tanda buat menyerah. Itu tanda encoding lagi terjadi."},
  {l:"Apa Yang Diambil",li:["<strong>Effort itu informasi</strong>, bukan tanda kekurangan","<strong>Tools dan teknik &gt; mindset alone</strong>. Mindset bagus tapi pake re-read kalah dari mindset apa-aja pake active recall","<strong>Struggle != bad</strong>. Sebuah kesalahan adalah satu unit data tentang batas pemahamanmu","<strong>Hati-hati sama klaim besar</strong>. Kalo ada self-help yang ngeklaim transformasi total dari mindset shift, periksa effect size-nya"]}
],tk:"Mindset matters tapi marginally. Yang lebih ngerjain perbedaan: teknik belajar yang work secara empiris. Growth mindset tanpa active recall masih kalah dari fixed mindset dengan active recall.",refs:["Dweck, C. S. (2006). Mindset: The New Psychology of Success. Random House.","Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent and under which circumstances are growth mindsets important to academic achievement? Psychological Science, 29(4), 549-571.","Burgoyne, A. P., Hambrick, D. Z., & Macnamara, B. N. (2020). How firm are the foundations of mind-set theory? Psychological Science, 31(3), 258-267.","Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way."]},

goals:{title:"Goals & Identity",sub:"Niat 'mau rajin belajar' kalah dari 'tiap Senin jam 8, di meja ini, buka chapter 3'.",intro:"Aku pernah punya niat olahraga rutin selama dua tahun. Yang akhirnya bikin work: nentuin satu kalimat spesifik, 'tiap selasa-kamis-sabtu jam 6 pagi, sepatu udah di pintu, langsung lari'. Specificity beats willpower.",secs:[
  {l:"Goal Setting yang Punya Bukti",t:"Locke dan Latham (2002) ngumpulin 35 tahun riset goal-setting. Temuan inti: goal yang spesifik dan menantang ngehasilin performance lebih baik daripada 'do your best'. Tapi ada syarat: ada feedback loop, kamu commit pada goal-nya, dan task-nya nggak terlalu kompleks sampe goal-nya distract dari learning curve. Buat belajar: 'master chapter 3 sampe bisa ngerjain semua soal end-of-chapter' lebih kuat daripada 'belajar yang serius'."},
  {l:"Implementation Intentions",t:"Yang ngeloncatin success rate dari niat ke aksi adalah implementation intentions (Gollwitzer, 1999): formula 'kalo situasi X, gue lakuin Y di tempat Z'. Meta-analisis Gollwitzer dan Sheeran (2006) di 94 studi nunjukin effect size d=0.65, salah satu intervensi behavior change paling kuat di psikologi. Mahal nyari intervensi yang efek-nya segede itu."},
  {l:"Identity-Based vs Outcome-Based",t:"James Clear (Atomic Habits, 2018) ngepopulerin distinksi: bukan 'gue mau lulus dengan IPK 3.8' (outcome) tapi 'gue orang yang study tiap pagi' (identity). Basis psikologisnya: self-perception theory dari Daryl Bem (1972). Kita ngambil kesimpulan tentang siapa diri kita dengan ngeobservasi tindakan kita sendiri. Lebih banyak tindakan 'orang yang belajar', lebih kuat identity self-as-learner, lebih gampang sustain."},
  {l:"Bentuk Praktisnya",li:["<strong>Spesifik &gt; umum</strong> : 'sebulan bisa konjugasi verb Spanyol regular' bukan 'belajar Spanyol'","<strong>Kapan, di mana, gimana</strong> : 'tiap weekend jam 10, di meja, buka Duolingo + Anki' bukan 'belajar saat sempat'","<strong>Identity statement</strong> : sebelum sesi, ucap 'gue orang yang belajar tiap hari'. Cheesy tapi punya bukti","<strong>Habit stacking</strong> : tempelin habit baru ke yang udah ada. 'Habis kopi pagi → buka Anki 10 menit'"]}
],tk:"Niat 'mau belajar' lemah. Niat 'tiap senin 8 pagi, di meja, buka chapter 3' kuat. Specificity bukan opsional, itu mekanisme.",refs:["Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation. American Psychologist, 57(9), 705-717.","Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493-503.","Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69-119.","Bem, D. J. (1972). Self-perception theory. Advances in Experimental Social Psychology, 6, 1-62."]},

reading:{title:"Reading Method",sub:"Baca yang banyak nggak otomatis berarti dapet yang banyak. Cara bacanya yang menentukan.",intro:"Dulu aku ngitung jumlah buku selesai per tahun, ngerasa pintar. Sampe sadar dari 30 buku setahun, aku nggak bisa nyebut argumen utama 25 di antaranya. Reading-nya passive, retrieval-nya nol.",secs:[
  {l:"Aktif vs Pasif",t:"Adler dan Van Doren (1972) di How to Read a Book ngebagi empat level: elementary, inspectional, analytical, syntopical. Klasik tapi nggak empirical. Yang lebih empirical: McNamara (2004) nunjukin self-explanation saat baca (paksa diri ngejelasin tiap kalimat) meningkatkan comprehension signifikan dibanding baca pasif. Effect bagus terutama buat text yang kompleks dan mahasiswa low-knowledge."},
  {l:"Marginalia: Annotation Yang Aktif",t:"Marginalia, catatan di pinggir halaman, punya purpose ganda: ngepaksa otak ngeprocess di waktu baca, dan jadi anchor buat review nanti. Yang nggak bekerja: highlight tanpa annotation. Dunlosky dan kolega (2013) classify highlighting sebagai 'low utility' di review famous mereka. Highlight rasanya produktif tapi seringnya bikin illusion of competence. Annotation yang nuntut otak berpikir (pertanyaan, reaksi, hubungan ke konsep lain) lebih efektif."},
  {l:"Routine Untuk Bacaan Serius",li:["<strong>Sebelum buka</strong> : 1 menit. Apa pertanyaan yang kamu lagi cari jawabannya?","<strong>Per paragraf</strong> : kalo paragraf padat, satu kalimat marginalia. Bukan ringkasan, tapi pertanyaan atau reaksi","<strong>Per halaman atau sub-bab</strong> : tutup buku, blurt 1-2 menit. Apa yang kamu inget?","<strong>Per sesi</strong> : tulis 3-5 bullet ringkasan di Notion atau jurnal","<strong>Per buku selesai</strong> : review 500 kata. Kalo bisa, post sebagai blog. Public commitment menguatkan encoding"]},
  {l:"Reading vs Re-Reading",t:"Mengejutkan: re-reading hampir selalu kalah dari single read + recall (Callender & McDaniel, 2009). Kalo kamu butuh boost retention, lebih baik baca sekali lalu retrieval test, bukan baca dua kali. Tapi reading + recall + re-reading bagian sulit aja itu kombinasi yang work. Re-reading buku secara penuh itu hampir selalu less efficient buat learning, walaupun bisa rewarding buat pengalaman estetik."}
],tk:"Reading itu retrieval, bukan absorpsi. Kalo kamu bisa nutup buku dan ngerangkum bab tadi tanpa lihat, baru itu reading yang efektif.",refs:["Adler, M. J., & Van Doren, C. (1972). How to Read a Book. Simon & Schuster.","McNamara, D. S. (2004). SERT: Self-explanation reading training. Discourse Processes, 38(1), 1-30.","Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58.","Callender, A. A., & McDaniel, M. A. (2009). The limited benefits of rereading educational texts. Contemporary Educational Psychology, 34(1), 30-41."]},

mindmap:{title:"Mind Mapping (GRINDE)",sub:"Mind map ada bukti efektif, tapi nggak sekencang yang diklaim Buzan. Kapan work dan kapan nggak penting dipahami.",intro:"Aku skeptis sama mind map selama bertahun-tahun karena versi yang dipopulerin Tony Buzan terlalu mirip sales pitch. Lalu aku coba versi Cornell yang lebih akademis, dan rasanya bener. Bedanya di seberapa serius proses encoding-nya.",secs:[
  {l:"Bukti Empirisnya Campur",t:"Farrand, Hussain, dan Hennessy (2002) di Medical Education ngebandingin mind map vs note-taking standard di mahasiswa kedokteran. Hasilnya: mind map meningkatkan recall ~10%. Modest tapi positif. Nesbit dan Adesope (2006) meta-analysis 67 studi concept/knowledge mapping: effect size d=0.43 buat retention, d=0.69 buat transfer ke domain baru. Solid result."},
  {l:"Tapi Caveat Penting",t:"Karpicke dan Blunt (2011) yang udah disebut di Active Recall ngebandingin mind mapping head-to-head dengan retrieval practice. Retrieval practice menang besar di retention dan inference. Kesimpulan praktis: mind mapping useful sebagai tahap encoding awal (organize info), tapi jangan stop di situ. Tetap perlu retrieval practice buat ngamanin retensi."},
  {l:"GRINDE: Aturan yang Ngebuat Map Itu Efektif",li:["<strong>G</strong>rouped : item terkait dikelompokkan visually","<strong>R</strong>eflective : map merefleksikan strukur konseptual, bukan urutan baca","<strong>I</strong>nterconnected : cross-link antar topik, bukan cuma hierarki strict","<strong>N</strong>on-verbal : pake icon, warna, simbol, bukan cuma kata","<strong>D</strong>irectionality : panah ngunjukkin arah/causality","<strong>E</strong>mphasize : item penting dibesarin, dibuat tebal, dikasih warna mencolok"]},
  {l:"Asal-Usul GRINDE",t:"Aturan GRINDE itu pop-sci framework (Justin Sung dan komunitas study YouTube). Nggak ada paper akademis yang validate akronim spesifik ini. Tapi komponen-komponennya punya basis di dual coding theory (Paivio, 1971): info visual dan verbal di-encode di sistem berbeda, dan kombinasi keduanya menguatkan retensi. Pakai GRINDE sebagai checklist praktis, bukan sebagai hukum."},
  {l:"Site Ini Pakai GRINDE",t:"Mind map di kiri ngikutin prinsipnya. Node L1 dikelompokkan by category warna (foundation purple, structure blue, method green, will amber, body pink). Cross-link kuning antar topik konseptual. Icon emoji buat non-verbal cues. Hover preview buat directionality. Klik node Tools (hijau) buat akses praktis."}
],tk:"Mind map bagus buat organize encoding. Tapi nggak gantiin retrieval. Bikin map sekali, lalu tutup dan coba gambar ulang dari memori. Itu mind map dengan retrieval practice.",refs:["Farrand, P., Hussain, F., & Hennessy, E. (2002). The efficacy of the 'mind map' study technique. Medical Education, 36(5), 426-431.","Nesbit, J. C., & Adesope, O. O. (2006). Learning with concept and knowledge maps: A meta-analysis. Review of Educational Research, 76(3), 413-448.","Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying with concept mapping. Science, 331(6018), 772-775.","Paivio, A. (1971). Imagery and Verbal Processes. Holt, Rinehart and Winston."]},

social:{title:"Social Layer",sub:"Belajar sendiri itu mungkin. Tapi orang sekitarmu nentuin apakah belajarmu sustain.",intro:"Tahun pertama kuliah, aku nge-isolate diri karena ngerasa belajar sendiri lebih efisien. IPK bagus tapi rapuh. Tahun ketiga, aku gabung study group rutin, dan walaupun jam belajar sendiri turun, retensi-nya naik. Social bukan luxury, tapi mekanisme.",secs:[
  {l:"Peer Learning Punya Bukti",t:"Topping (2005) meta-analisis peer learning di higher education: effect d=0.55 buat outcome akademis, dan effect lebih besar lagi buat motivasi dan persistence. Mekanisme yang work: nge-jelasin ke orang lain itu retrieval practice plus elaboration. Yang nge-tutor seringkali belajar lebih banyak daripada yang di-tutor (Cohen, Kulik, & Kulik, 1982)."},
  {l:"Community of Practice",t:"Lave dan Wenger (1991) bawa konsep <em>community of practice</em>: belajar itu nggak cuma transfer info, tapi participasi gradual di komunitas yang ngepraktikkan skill itu. Pemain catur muda jadi pemain catur lewat ngobrol dan main sama pemain catur lain. Programmer jadi programmer lewat code review dan diskusi PR. Aplikasi praktisnya buat student: gabung komunitas (online atau offline) di domain yang lagi kamu pelajarin. Hadir, ngomong, ngajuin pertanyaan, walaupun pertanyaannya 'bodoh'."},
  {l:"Mentor: Asal Bukan Mitos",t:"Riset mentorship campur. Allen dan kolega (2004) meta-analisis ngedapetin career mentorship punya effect d=0.20-0.40, modest. Lebih kuat buat learning teknis: mentor langsung dari ahli domain bisa ngecut waktu belajar signifikan dengan ngarahin attention ke pattern yang mereka udah pelajari pahit. Tapi waspada glorifikasi mentor. Mentor bagus = orang yang ngasih feedback honest dan ngarahin practice, bukan orang famous yang you follow at distance."},
  {l:"Yang Praktis",li:["<strong>Cari satu study partner</strong> yang seriusan. Bukan teman main yang kebetulan satu jurusan.","<strong>Jadwal regular</strong> review bareng tiap minggu. Implementation intentions di level sosial.","<strong>Explain to each other</strong>. Kamu ngerti X, partner-mu ngerti Y. Switch.","<strong>Pilih komunitas online</strong> yang quality (subreddit teknikal, Discord buat kursus tertentu). Hindari yang flame.","<strong>Cari kritikus, bukan cheerleader</strong>. Orang yang ngasih validasi terus nggak bantu growth."]}
],tk:"Solo grind ada batasnya. Komunitas yang tepat ngeleverage retrieval practice (ngajarin orang lain), implementation intentions (jadwal sosial), dan identity (jadi 'orang yang belajar' di antara orang yang belajar).",refs:["Topping, K. J. (2005). Trends in peer learning. Educational Psychology, 25(6), 631-645.","Cohen, P. A., Kulik, J. A., & Kulik, C. C. (1982). Educational outcomes of tutoring. American Educational Research Journal, 19(2), 237-248.","Lave, J., & Wenger, E. (1991). Situated Learning: Legitimate Peripheral Participation. Cambridge University Press.","Allen, T. D., Eby, L. T., Poteet, M. L., Lentz, E., & Lima, L. (2004). Career benefits associated with mentoring for protégés: A meta-analysis. Journal of Applied Psychology, 89(1), 127-136."]},

body:{title:"Body & Sleep",sub:"Otak yang nggak tidur belajar kayak laptop yang RAM-nya penuh.",intro:"Aku ngerogoh banyak waktu ngeoptimize teknik belajar selama dua tahun. Yang ngebuat improvement paling besar terakhirnya bukan teknik. Tapi tidur cukup 7 jam tiap malem, konsisten. Substrat menang dari method.",secs:[
  {l:"Sleep dan Consolidation",t:"Stickgold dan Walker (2013) di Nature Neuroscience nyebut sleep sebagai <em>memory triage</em>: otak pas tidur ngeproses dan ngonsoliasi memori dari hari itu. Walker dan kolega (2003) nunjukin ini secara dramatis buat motor learning: latihan piano malem, tidur, hasilnya 20% improvement keesokan harinya tanpa latihan tambahan. Tanpa tidur, improvement-nya nol. Belajar yang nggak diikuti tidur cukup hampir setara nggak belajar."},
  {l:"Naps dan Daytime Sleep",t:"Tucker dan kolega (2006): nap 60-90 menit setelah sesi belajar ngebantu konsoliasi memori deklaratif (fakta) dan prosedural (skill). Nap 20 menit punya benefit lebih kecil tapi masih positif buat alertness. Studi cohort mahasiswa: yang nap regular cenderung perform sedikit lebih baik di test memori dibanding yang nggak."},
  {l:"Exercise dan Cognition",t:"Hillman, Erickson, dan Kramer (2008) di Nature Reviews Neuroscience ngerangkum bukti: aerobic exercise meningkatkan executive function, attention, dan memory. Mekanismenya termasuk BDNF (brain-derived neurotrophic factor) yang ngedukung neurogenesis di hippocampus. Exercise pagi cenderung punya benefit kognitif lebih kuat buat performance hari itu juga."},
  {l:"Brain Plasticity Itu Real Sampe Tua",t:"Maguire dan kolega (2000) studi famous: taxi driver London yang habis bertahun-tahun ngehapal jalanan kota punya hippocampus posterior yang lebih besar daripada non-taxi-driver. Penelitian longitudinal mereka (Maguire, Woollett, & Spiers, 2006) nge-track perubahan struktural otak selama pelatihan. Neuroplasticity itu real dan aktif sampe tua, walaupun lebih lambat dibanding masa muda."},
  {l:"Diet, Dengan Caveat",t:"Yang ada bukti kuat: glukosa di sirkulasi rendah ngegangguin cognition; dehidrasi (2% body water loss) ngedrop performance kognitif. Yang bukti lebih lemah: 'brain foods' spesifik. Klaim catatan asal soal nuts dan berries vs sweets ada beberapa basis (gula sederhana ngegasi spike + crash glukosa), tapi efeknya lebih kecil dari yang sering dijanjikan. Yang lebih penting: konsistensi makan + hidrasi."}
],tk:"Tidur cukup, gerak rutin, makan teratur. Bukan glamor tapi nguntit semua optimasi teknik belajar yang lain. Substrat sebelum method.",refs:["Stickgold, R., & Walker, M. P. (2013). Sleep-dependent memory triage. Nature Neuroscience, 16(2), 139-145.","Walker, M. P., Brakefield, T., Hobson, J. A., & Stickgold, R. (2003). Dissociable stages of human memory consolidation and reconsolidation. Nature, 425(6958), 616-620.","Hillman, C. H., Erickson, K. I., & Kramer, A. F. (2008). Be smart, exercise your heart: exercise effects on brain and cognition. Nature Reviews Neuroscience, 9(1), 58-65.","Maguire, E. A., et al. (2000). Navigation-related structural change in the hippocampi of taxi drivers. PNAS, 97(8), 4398-4403."]},

tools:{title:"Practice Tools",sub:"Setiap teknik di halaman ini punya implementasi nyatanya di sini.",intro:"Reading tentang spaced repetition tanpa pernah pake aplikasi flashcards itu mirip baca buku renang tanpa pernah nyemplung. Tools-tools ini sederhana sengaja, biar fokus tetap di prinsipnya bukan di UI-nya.",secs:[
  {l:"Lima Tools Tersedia",li:["<strong>⏲️ Pomodoro Timer</strong> : structured focus dengan ring countdown. Default 25/5 tapi bisa custom.","<strong>🗂️ Spaced Flashcards</strong> : Leitner 5-box sistem. Add kartu, drill harian.","<strong>✍️ Blurt Pad</strong> : timer + textarea buat retrieval practice tanpa lihat materi.","<strong>🧩 Feynman Walker</strong> : 4-step prompt untuk teknik Feynman.","<strong>🔥 3-Pillar Habit Tracker</strong> : track tiga jam non-negotiable harian dengan streak."]},
  {l:"Pemetaan Konsep ke Tool",li:["Pomodoro Timer implement <em>vigilance decrement</em> mitigation (Ariga & Lleras, 2011)","Spaced Flashcards implement <em>spacing effect</em> (Cepeda et al., 2006) lewat Leitner box","Blurt Pad implement <em>testing effect</em> (Roediger & Karpicke, 2006) dalam bentuk paling murni","Feynman Walker implement <em>self-explanation</em> dan <em>elaborative interrogation</em> (Dunlosky et al., 2013)","Habit Tracker implement <em>implementation intentions</em> (Gollwitzer, 1999) + <em>identity-based habit</em> (self-perception theory)"]},
  {l:"Catatan Privasi",t:"Semua data tools tersimpan local di browser kamu (localStorage). Nggak ada server, nggak ada akun, nggak ada tracking. Kalo kamu bersihin browser data, datanya hilang. Buat persistence permanen, copy keluar manual."}
],tk:"Tool tanpa praktik sama dengan teknik tanpa adopsi. Pilih satu, pakai konsisten seminggu, baru tambah yang lain."},

feynman:{title:"Feynman Method",sub:"Kalo bisa ngejelasin ke anak SMP, kamu beneran ngerti. Kalo nggak, kamu cuma hafal istilahnya.",intro:"Richard Feynman pernah bilang dia nggak ngerti topik kalo dia nggak bisa ngejelasinnya ke mahasiswa freshman. Itu nada paling tinggi dari standard, dan masuk akal kenapa hampir nggak pernah dipraktikin sama orang.",secs:[
  {l:"Empat Step",li:["<strong>Step 1 — Pilih konsep</strong>. Spesifik, bukan 'fisika', tapi 'momentum conservation' atau 'time value of money'","<strong>Step 2 — Jelasin ke anak 12 tahun</strong>. Tulis, bicara, atau ngajar imaginary. Pake kata-kata sederhana. Tanpa jargon.","<strong>Step 3 — Identifikasi gap</strong>. Di mana kamu reach for jargon karena nggak bisa simplify? Di mana stuck? Itu peta lubangmu.","<strong>Step 4 — Simplify dan re-explain</strong>. Balik ke source material untuk gap yang teridentifikasi, lalu ulangi step 2 dengan understanding yang lebih dalam."]},
  {l:"Kenapa Work",t:"Feynman technique itu kombinasi tiga teknik yang masing-masing punya bukti kuat. <em>Self-explanation</em> (McNamara, 2004): paksa diri ngejelasin tiap step ngebuat encoding lebih dalam. <em>Elaborative interrogation</em> (Dunlosky et al., 2013): nanya 'kenapa ini bener?' di setiap claim. <em>Retrieval practice</em> (Roediger & Karpicke, 2006): narik info dari memori, bukan dari buku. Feynman ngegabungin ketiganya."},
  {l:"Kapan Pake",li:["Topik yang kamu rasa 'familiar tapi nggak yakin ngerti'","Sebelum ujian besar, sebagai final check pemahaman","Saat baca paper teknis, dipraktikin sambil baca per konsep","Saat ngajar teman; teman jadi anak 12 tahun-mu"]},
  {l:"Gunakan Feynman Walker Tool",t:"Tools di halaman ini punya Feynman Walker dengan struktur 4-step yang terpandu. Tersimpan di localStorage jadi bisa lanjut session lain."}
],tk:"Kalo kamu nggak bisa ngejelasin tanpa jargon, kamu belum ngerti. Itu standard yang berat tapi kalibrasi.",refs:["McNamara, D. S. (2004). SERT: Self-explanation reading training. Discourse Processes, 38(1), 1-30.","Dunlosky, J., et al. (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58."]},

cornell:{title:"Cornell Notes",sub:"Bukan note-taking, tapi struktur encoding plus self-quiz di halaman yang sama.",intro:"Cornell notes terlihat membosankan, tapi yang ngebuat work bukan layout-nya. Yang work adalah strukturnya memaksa kamu retrieve setelah dengar/baca, bukan saat dengar/baca.",secs:[
  {l:"Layout",t:"Bagi halaman jadi tiga area. Kolom kanan (~70% lebar) buat catatan utama saat dengar/baca. Kolom kiri (~25%) buat cue/keyword/pertanyaan, diisi <em>setelah</em> sesi. Bagian bawah (5 baris) buat ringkasan 2-3 kalimat di akhir."},
  {l:"Workflow yang Ngebuat Work",li:["<strong>Saat sesi</strong> : tulis di kolom kanan saja. Catat ide utama, contoh, terminologi.","<strong>5-10 menit setelah sesi</strong> : tutup buku/laptop. Lihat catatanmu. Di kolom kiri, tulis keyword atau pertanyaan yang bisa dijawab oleh konten kolom kanan.","<strong>Sebelum tidur (atau besok pagi)</strong> : tulis summary 2-3 kalimat di bagian bawah.","<strong>Review</strong> : tutup kolom kanan. Baca kolom kiri sebagai prompt. Coba retrieve isi kolom kanan dari memori. Cek hasilnya."]},
  {l:"Yang Ngebuat Cornell Bukan Sekadar Note",t:"Step pengisian kolom kiri itu retrieval practice tersembunyi: kamu paksa otak ngerangkum apa yang baru disampaikan. Step review pake kolom kiri sebagai cue itu testing effect (Roediger & Karpicke, 2006). Cornell bukan tentang format halaman, tapi tentang loop encode-retrieve-review yang built-in."},
  {l:"Caveat",t:"Cornell punya effect positif tapi modest di literatur. Yang ngebuat efek bagus adalah kepatuhan terhadap workflow-nya, bukan layout halamannya. Banyak orang isi ketiga area di waktu yang sama, dan itu hilangin retrieval component-nya. Disiplinkan waktu pengisian."}
],tk:"Cornell work karena memaksa retrieval pasca-sesi dan review terstruktur. Tanpa step-stepnya, itu cuma note dengan margin lebar.",refs:["Pauk, W., & Owens, R. J. Q. (2010). How to Study in College (10th ed.). Wadsworth.","Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. Psychological Science, 17(3), 249-255."]},

grinde:{title:"GRINDE Rules",sub:"Aturan praktis ngebuat mind map yang nggak cuma decoratif tapi beneran nguatin encoding.",intro:"Tony Buzan ngepopulerin mind map, tapi banyak versinya jadi sekadar coloring book yang lucu tanpa struktur konseptual. GRINDE itu effort komunitas study buat formalize prinsip yang ngebuat mind map work.",secs:[
  {l:"Akronim",li:["<strong>G — Grouped</strong> : item yang related secara visual berdekatan. Cluster berdasarkan kategori, bukan urutan input.","<strong>R — Reflective</strong> : struktur visual mencerminkan struktur konseptual. Hierarki jelas, hubungan parent-child jelas.","<strong>I — Interconnected</strong> : cross-link antar topik yang nggak strict hierarki. Knowledge nyatanya bukan tree, tapi web.","<strong>N — Non-verbal</strong> : pake icon, simbol, warna. Dual coding (Paivio, 1971): visual + verbal di-encode di sistem berbeda, kombinasi keduanya lebih kuat dari salah satu.","<strong>D — Directionality</strong> : panah menunjukkan arah/cause/dependency. Bukan cuma garis penghubung netral.","<strong>E — Emphasize</strong> : item penting dibesarin, dibuat tebal, dikasih warna mencolok. Otak processes salient items lebih cepat."]},
  {l:"Penerapan di Site Ini",li:["<strong>Grouped</strong> : node L1 dikelompokkan warna by category (foundation purple, structure blue, method green, will amber, body pink)","<strong>Reflective</strong> : root di tengah, L1 spokes around, L2 children outside","<strong>Interconnected</strong> : cross-link kuning antar node konseptual (recall ↔ feynman, spaced ↔ recall, dst)","<strong>Non-verbal</strong> : emoji icon di setiap node + warna fill kategori","<strong>Directionality</strong> : rim links dash buat sequential learning chain, parent links dot buat hierarki","<strong>Emphasize</strong> : root lebih besar, hovered node halo yang lebih terang, faded non-focused"]},
  {l:"Status Empirisnya",t:"GRINDE sebagai akronim spesifik nggak punya validasi peer-review. Tapi komponen-komponennya ada basis: dual coding theory (Paivio, 1971), spatial organization meningkatkan retention (Robinson, 1998), color coding ngebantu chunking. Pakai GRINDE sebagai checklist praktis, bukan sebagai law of cognition."},
  {l:"Praktik Bikin Sendiri",li:["Mulai dari topik di tengah","Tulis 3-7 sub-topik utama sebagai cabang","Tambah icon kecil di setiap node","Beda warna buat beda kategori (max 5-6 warna)","Pikirin cross-link: mana topik yang ngehubungin yang lain?","Setelah selesai, tutup map, gambar ulang dari memori (retrieval practice!)"]}
],tk:"GRINDE checklist praktis buat ngebuat map yang work. Tapi setelah map jadi, tutup dan retrieve. Map adalah encoding aid, bukan substitusi retrieval.",refs:["Paivio, A. (1971). Imagery and Verbal Processes. Holt, Rinehart and Winston.","Robinson, D. H. (1998). Graphic organizers as aids to text learning. Reading Research and Instruction, 37(2), 85-105.","Nesbit, J. C., & Adesope, O. O. (2006). Learning with concept and knowledge maps: A meta-analysis. Review of Educational Research, 76(3), 413-448."]},

't-pomo':{title:"Pomodoro Timer",sub:"Tool: structured focus sessions dengan break terjadwal.",tool:'pomo'},
't-flash':{title:"Spaced Flashcards (Leitner Box)",sub:"Tool: 5-box spaced repetition. Add kartu, drill harian.",tool:'flash'},
't-blurt':{title:"Blurt Pad",sub:"Tool: timed retrieval practice. Pick topic, blurt everything you remember.",tool:'blurt'},
't-feyn':{title:"Feynman Walker",sub:"Tool: 4-step structured Feynman technique walker.",tool:'feyn'},
't-habit':{title:"3-Pillar Habit Tracker",sub:"Tool: track 3-hour daily pillars dengan streak counter.",tool:'habit'}
};

/* ═══ MIND MAP DATA ═══
   Categories: found (foundation/violet), time (blue), method (emerald),
   will (amber), body (pink). sp:true = tool node.
*/
const NODES=[
  {id:'root',lab:'Belajar\nGimana Belajar',emoji:'🧠',cat:'root',lv:0,sp:false},
  // Foundation (violet)
  {id:'meta',lab:'Studying vs\nLearning',emoji:'🔍',cat:'found',lv:1,sp:false},
  {id:'reading',lab:'Reading\nMethod',emoji:'📖',cat:'found',lv:1,sp:false},
  {id:'mindmap',lab:'Mind\nMapping',emoji:'🗺️',cat:'found',lv:1,sp:false},
  // Time/Structure (blue)
  {id:'time',lab:'Time\nArchitecture',emoji:'⏱️',cat:'time',lv:1,sp:false},
  {id:'focus',lab:'Focus &\nAttention',emoji:'🎧',cat:'time',lv:1,sp:false},
  // Method (emerald)
  {id:'recall',lab:'Active\nRecall',emoji:'♻️',cat:'method',lv:1,sp:false},
  {id:'spaced',lab:'Spaced\nRepetition',emoji:'📅',cat:'method',lv:1,sp:false},
  {id:'priority',lab:'Pareto &\nDeliberate',emoji:'🪜',cat:'method',lv:1,sp:false},
  // Will (amber)
  {id:'mindset',lab:'Mindset &\nDifficulty',emoji:'🌱',cat:'will',lv:1,sp:false},
  {id:'goals',lab:'Goals &\nIdentity',emoji:'🎯',cat:'will',lv:1,sp:false},
  // Substrate (pink)
  {id:'social',lab:'Social\nLayer',emoji:'👥',cat:'body',lv:1,sp:false},
  {id:'body',lab:'Body &\nSleep',emoji:'🛏️',cat:'body',lv:1,sp:false},
  // Tools (special)
  {id:'tools',lab:'Practice\nTools',emoji:'🔧',cat:'method',lv:1,sp:true},
  // L2 — recall children
  {id:'feynman',lab:'Feynman\nMethod',emoji:'💡',cat:'method',lv:2,sp:false},
  {id:'cornell',lab:'Cornell\nNotes',emoji:'📝',cat:'method',lv:2,sp:false},
  // L2 — mindmap child
  {id:'grinde',lab:'GRINDE\nRules',emoji:'🎨',cat:'found',lv:2,sp:false},
  // L2 — tool children
  {id:'t-pomo',lab:'Pomodoro',emoji:'⏲️',cat:'method',lv:2,sp:true},
  {id:'t-flash',lab:'Flashcards',emoji:'🗂️',cat:'method',lv:2,sp:true},
  {id:'t-blurt',lab:'Blurt Pad',emoji:'✍️',cat:'method',lv:2,sp:true},
  {id:'t-feyn',lab:'Feynman\nWalker',emoji:'🧩',cat:'method',lv:2,sp:true},
  {id:'t-habit',lab:'Habit\nTracker',emoji:'🔥',cat:'method',lv:2,sp:true},
];

const LINKS=[
  // Spokes — root to every L1
  {s:'root',t:'meta',k:'spoke'},{s:'root',t:'time',k:'spoke'},{s:'root',t:'focus',k:'spoke'},
  {s:'root',t:'recall',k:'spoke'},{s:'root',t:'spaced',k:'spoke'},{s:'root',t:'priority',k:'spoke'},
  {s:'root',t:'mindset',k:'spoke'},{s:'root',t:'goals',k:'spoke'},{s:'root',t:'reading',k:'spoke'},
  {s:'root',t:'mindmap',k:'spoke'},{s:'root',t:'social',k:'spoke'},{s:'root',t:'body',k:'spoke'},
  {s:'root',t:'tools',k:'spoke'},
  // Rim — pedagogical sequential chain
  {s:'meta',t:'time',k:'rim'},{s:'time',t:'focus',k:'rim'},{s:'focus',t:'recall',k:'rim'},
  {s:'recall',t:'spaced',k:'rim'},{s:'spaced',t:'priority',k:'rim'},{s:'priority',t:'mindset',k:'rim'},
  {s:'mindset',t:'goals',k:'rim'},{s:'goals',t:'reading',k:'rim'},{s:'reading',t:'mindmap',k:'rim'},
  // Cross — conceptual bridges
  {s:'spaced',t:'recall',k:'cross'},
  {s:'mindset',t:'priority',k:'cross'},
  {s:'goals',t:'mindset',k:'cross'},
  {s:'reading',t:'recall',k:'cross'},
  {s:'reading',t:'mindmap',k:'cross'},
  {s:'mindmap',t:'recall',k:'cross'},
  {s:'body',t:'mindset',k:'cross'},
  {s:'social',t:'priority',k:'cross'},
  {s:'social',t:'recall',k:'cross'},
  // Parent — L1 to L2 children
  {s:'recall',t:'feynman',k:'parent'},{s:'recall',t:'cornell',k:'parent'},
  {s:'mindmap',t:'grinde',k:'parent'},
  // Tools children
  {s:'tools',t:'t-pomo',k:'parent'},{s:'tools',t:'t-flash',k:'parent'},
  {s:'tools',t:'t-blurt',k:'parent'},{s:'tools',t:'t-feyn',k:'parent'},{s:'tools',t:'t-habit',k:'parent'},
  // Tool concept cross-links
  {s:'t-pomo',t:'time',k:'cross'},
  {s:'t-flash',t:'spaced',k:'cross'},
  {s:'t-blurt',t:'recall',k:'cross'},
  {s:'t-feyn',t:'feynman',k:'cross'},
  {s:'t-habit',t:'goals',k:'cross'},
];

const L1=['meta','reading','mindmap','time','focus','recall','spaced','priority','tools','mindset','goals','social','body'];
const nmap={};NODES.forEach(n=>{nmap[n.id]=n});

function calcPos(W,H){
  const cx=W/2,cy=H/2,r1=Math.min(W,H)*.32,r2=Math.min(W,H)*.49,n=L1.length;
  nmap['root'].x=cx;nmap['root'].y=cy;
  L1.forEach((id,i)=>{const a=-Math.PI/2+i*(2*Math.PI/n);nmap[id].x=cx+r1*Math.cos(a);nmap[id].y=cy+r1*Math.sin(a)});
  const place=(parentId,childOffsets)=>{
    const p=nmap[parentId];if(!p)return;
    const dx=p.x-cx,dy=p.y-cy;const pa=Math.atan2(dy,dx);
    childOffsets.forEach(([id,off])=>{const c=nmap[id];if(!c)return;c.x=cx+r2*Math.cos(pa+off);c.y=cy+r2*Math.sin(pa+off)});
  };
  place('recall',[['feynman',-.12],['cornell',.12]]);
  place('mindmap',[['grinde',0]]);
  place('tools',[['t-pomo',-.32],['t-flash',-.16],['t-blurt',0],['t-feyn',.16],['t-habit',.32]]);
}

const mp=document.getElementById('map-panel');
let W=mp.clientWidth,H=mp.clientHeight;
calcPos(W,H);

// Adjacency for hover/select highlight + "Terhubung dengan" chips
const adj={};NODES.forEach(n=>{adj[n.id]=new Set()});
LINKS.forEach(l=>{adj[l.s].add(l.t);adj[l.t].add(l.s)});

/* ═══ CONTENT PANEL RENDERER ═══ */
const cp=document.getElementById('cp');

function renderContent(id){
  const n=nmap[id];const t=C[id];if(!t)return;
  if(t.tool){renderTool(t.tool);return}
  let html=`<div class="content-inner"><div class="content-title">${t.title}</div><div class="content-sub">${t.sub}</div>`;
  if(t.intro)html+=`<div class="content-intro">${t.intro}</div>`;
  (t.secs||[]).forEach((s)=>{
    html+=`<div class="sec"><div class="sec-label">${s.l}</div>`;
    if(s.t)html+=`<div class="sec-text">${s.t}</div>`;
    if(s.li)html+=`<ul class="sec-list">${s.li.map(it=>`<li>${it}</li>`).join('')}</ul>`;
    html+='</div>';
  });
  if(t.tk)html+=`<div class="takeaway"><div class="takeaway-label">Takeaway</div><div class="takeaway-text">${t.tk}</div></div>`;
  if(t.refs && t.refs.length)html+=`<div class="ref-block"><div class="ref-label">Sumber</div><ul class="ref-list">${t.refs.map(r=>`<li>${r}</li>`).join('')}</ul></div>`;
  const related=Array.from(adj[id]||[]).filter(rid=>rid!=='root'&&C[rid]);
  if(related.length){
    html+='<div class="related-block"><span class="related-label">Terhubung dengan</span>';
    related.forEach(rid=>{const rn=nmap[rid];if(!rn)return;html+=`<button class="related-chip" data-go="${rid}">${(rn.emoji||'')} ${C[rid].title}</button>`});
    html+='</div>';
  }
  html+='</div>';
  cp.innerHTML=html;cp.scrollTop=0;
  cp.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>selectNode(b.getAttribute('data-go'))));
}

function render(id){renderContent(id)}

/* ═══ MIND MAP RENDER (D3) ═══ */
const svg=d3.select('#mm');
const gZoom=svg.append('g');
const linkG=gZoom.append('g').attr('class','links');
const nodeG=gZoom.append('g').attr('class','nodes');

const zoom=d3.zoom().scaleExtent([0.4,2.5]).on('zoom',e=>gZoom.attr('transform',e.transform));
svg.call(zoom);

const R={0:42,1:32,2:24};
function linkPath(d){const a=nmap[d.s],b=nmap[d.t];return`M${a.x},${a.y}L${b.x},${b.y}`}

const lsel=linkG.selectAll('path').data(LINKS).enter().append('path')
  .attr('d',linkPath)
  .attr('fill','none')
  .attr('class',d=>'link link-'+d.k);

const ng=nodeG.selectAll('g').data(NODES).enter().append('g')
  .attr('transform',d=>`translate(${d.x},${d.y})`)
  .attr('class',d=>'node node-lv'+d.lv+(d.cat?' cat-'+d.cat:'')+(d.sp?' sp':''))
  .style('cursor','pointer')
  .on('click',(e,d)=>{selectNode(d.id)})
  .on('mouseenter',(e,d)=>{hoverId=d.id;showTip(e,d);applyNodeColors()})
  .on('mousemove',(e)=>moveTip(e))
  .on('mouseleave',()=>{hoverId=null;hideTip();applyNodeColors()});

ng.append('circle').attr('r',d=>R[d.lv]).attr('stroke-width',d=>d.lv===0?2:1.5);

ng.each(function(d){
  const el=d3.select(this);
  if(d.emoji){
    el.append('text')
      .attr('class','node-emoji')
      .attr('text-anchor','middle')
      .attr('y',d.lv===0?-10:d.lv===1?-6:-4)
      .attr('font-size',d.lv===0?16:d.lv===1?13:11)
      .attr('pointer-events','none')
      .text(d.emoji);
  }
  const lines=d.lab.split('\n');
  const fs=d.lv===0?8:d.lv===1?7:6;
  const lh=d.lv===0?9:8;
  const yStart=d.lv===0?6:d.lv===1?5:4;
  const tx=el.append('text')
    .attr('class','node-label')
    .attr('text-anchor','middle')
    .attr('pointer-events','none')
    .attr('font-family',"'Poppins',sans-serif");
  lines.forEach((ln,i)=>{
    tx.append('tspan')
      .attr('x',0)
      .attr('dy',i===0?yStart:lh)
      .attr('font-size',fs)
      .attr('font-weight',d.lv===0?'700':'500')
      .text(ln);
  });
});

const tipEl=document.createElement('div');tipEl.className='mm-tooltip';document.body.appendChild(tipEl);
function showTip(e,d){if(!C[d.id])return;const t=C[d.id];tipEl.innerHTML=`<strong>${t.title.replace(/\n/g,' ')}</strong>${t.sub||''}`;tipEl.classList.add('visible');moveTip(e)}
function moveTip(e){const pad=14;let x=e.clientX+pad,y=e.clientY+pad;const r=tipEl.getBoundingClientRect();if(x+r.width>window.innerWidth-8)x=e.clientX-r.width-pad;if(y+r.height>window.innerHeight-8)y=e.clientY-r.height-pad;tipEl.style.left=x+'px';tipEl.style.top=y+'px'}
function hideTip(){tipEl.classList.remove('visible')}

let selectedId=null;
let hoverId=null;

function getCS(){
  const s=getComputedStyle(document.documentElement);
  const g=v=>s.getPropertyValue(v).trim();
  return{
    bg:g('--bg'),bgAlt:g('--bg-alt'),text:g('--text'),
    textMuted:g('--text-muted'),textDim:g('--text-dim'),
    border:g('--border'),accent:g('--accent'),
    linkColor:g('--link-color')||'#1e2d3d',linkActive:g('--link-active')||'#1da1f2',
  };
}

function applyNodeColors(){
  const c=getCS();
  const focusId = hoverId || (selectedId && selectedId!=='root' ? selectedId : null);
  const focusSet = focusId ? new Set([focusId, ...adj[focusId]]) : null;
  const isLinkActive = d => focusId && (d.s===focusId || d.t===focusId);
  const isNodeInFocus = id => !focusSet || focusSet.has(id);

  ng.select('circle')
    .attr('fill',function(d){
      const sel=d.id===selectedId;
      if(d.lv===0) return sel?c.bgAlt:c.bg;
      const nodeEl=this.parentNode;
      const cs=getComputedStyle(nodeEl);
      const fill=cs.getPropertyValue('--cat-fill').trim();
      const stroke=cs.getPropertyValue('--cat-stroke').trim();
      if(sel)return stroke;
      return fill || c.bg;
    })
    .attr('stroke',function(d){
      const sel=d.id===selectedId;
      const neighbor=focusSet && focusSet.has(d.id) && d.id!==focusId;
      if(sel) return c.linkActive;
      if(neighbor) return c.linkActive;
      if(d.lv===0) return c.accent;
      const nodeEl=this.parentNode;
      const cs=getComputedStyle(nodeEl);
      return cs.getPropertyValue('--cat-stroke').trim() || c.border;
    })
    .attr('stroke-width',d=>{
      if(d.id===selectedId)return d.lv===0?2.4:2.2;
      if(focusSet && focusSet.has(d.id))return 2;
      return d.lv===0?2:1.5;
    });

  ng.attr('opacity',d=>isNodeInFocus(d.id)?1:0.32);

  ng.select('text.node-label')
    .attr('fill',function(d){
      const sel=d.id===selectedId;
      if(d.lv===0) return c.text;
      if(sel) return c.bg;
      const nodeEl=this.parentNode;
      const cs=getComputedStyle(nodeEl);
      return cs.getPropertyValue('--cat-text').trim() || c.textMuted;
    });

  const W_INACTIVE = {spoke:0.7, rim:1.1, cross:1.1, parent:0.9};
  const W_ACTIVE   = {spoke:1.5, rim:1.9, cross:1.9, parent:1.7};
  const O_INACTIVE = {spoke:0.30, rim:0.55, cross:0.55, parent:0.45};
  const DASH       = {rim:'5,4', parent:'2,3'};
  lsel.attr('stroke',d=>isLinkActive(d)?c.linkActive:c.linkColor)
    .attr('stroke-width',d=>isLinkActive(d)?W_ACTIVE[d.k]:W_INACTIVE[d.k])
    .attr('stroke-opacity',d=>{
      if(isLinkActive(d))return 0.95;
      if(focusId)return 0.10;
      return O_INACTIVE[d.k];
    })
    .attr('stroke-dasharray',d=>DASH[d.k]||null);
}

function selectNode(id){
  clearAllToolTimers();
  selectedId=id;applyNodeColors();
  if(viewMode==='map'){
    render(id);
  } else {
    const tgt=document.getElementById('essay-sec-'+id);
    if(tgt)tgt.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

new ResizeObserver(()=>{W=mp.clientWidth;H=mp.clientHeight;calcPos(W,H);ng.attr('transform',d=>`translate(${d.x},${d.y})`);lsel.attr('d',linkPath)}).observe(mp);

/* ═══ MAP LEGEND ═══ */
(function buildLegend(){
  const legend=document.createElement('div');legend.className='map-legend';
  const items=[
    {label:'Foundation',color:'var(--violet)'},
    {label:'Time/Focus',color:'var(--accent)'},
    {label:'Method',color:'var(--emerald)'},
    {label:'Mindset',color:'var(--amber)'},
    {label:'Substrate',color:'var(--pink)'},
  ];
  items.forEach(i=>{
    const chip=document.createElement('span');chip.className='legend-chip';
    chip.innerHTML=`<span class="legend-dot" style="background:${i.color}"></span>${i.label}`;
    legend.appendChild(chip);
  });
  mp.appendChild(legend);
})();

/* ═══ VIEW TOGGLE (Mind Map ⟷ Essay) ═══ */
let viewMode='map';
function setViewMode(m){
  viewMode=m;
  if(m==='essay'){
    document.body.classList.add('essay-mode');
    renderEssay();
    const btn=document.getElementById('view-toggle');if(btn)btn.textContent='🗺 Map';
  } else {
    document.body.classList.remove('essay-mode');
    if(selectedId)render(selectedId);else cp.innerHTML='<div class="welcome"><div class="welcome-icon">🧠</div><div class="welcome-title">Choose topic to start!</div><div class="welcome-sub">Catatan seorang yang lagi belajar gimana cara belajar.</div><a class="welcome-back" href="https://dimassuryo.com">← dimassuryo.com</a></div>';
    const btn=document.getElementById('view-toggle');if(btn)btn.textContent='📄 Essay';
  }
}

function renderEssay(){
  // Build sequential essay following the pedagogical chain
  const order=['root','meta','time','focus','recall','spaced','priority','mindset','goals','reading','mindmap','feynman','cornell','grinde','social','body','tools'];
  let html='<div class="essay-doc">';
  order.forEach((id,idx)=>{
    const t=C[id];if(!t||t.tool)return;
    const isChild=['feynman','cornell','grinde'].includes(id);
    html+=`<div class="essay-section${isChild?' essay-child':''}" id="essay-sec-${id}">`;
    html+=`<div class="content-title">${t.title}</div>`;
    html+=`<div class="content-sub">${t.sub}</div>`;
    if(t.intro)html+=`<div class="content-intro">${t.intro}</div>`;
    (t.secs||[]).forEach(s=>{
      html+=`<div class="sec"><div class="sec-label">${s.l}</div>`;
      if(s.t)html+=`<div class="sec-text">${s.t}</div>`;
      if(s.li)html+=`<ul class="sec-list">${s.li.map(it=>`<li>${it}</li>`).join('')}</ul>`;
      html+='</div>';
    });
    if(t.tk)html+=`<div class="takeaway"><div class="takeaway-label">Takeaway</div><div class="takeaway-text">${t.tk}</div></div>`;
    if(t.refs && t.refs.length)html+=`<div class="ref-block"><div class="ref-label">Sumber</div><ul class="ref-list">${t.refs.map(r=>`<li>${r}</li>`).join('')}</ul></div>`;
    html+='</div>';
    if(idx<order.length-1 && !isChild)html+='<div class="essay-divider"></div>';
  });
  html+='</div>';
  cp.innerHTML=html;cp.scrollTop=0;
}

(function initViewToggle(){
  const btn=document.createElement('button');
  btn.id='view-toggle';
  btn.className='view-toggle';
  btn.textContent='📄 Essay';
  const hdr=document.querySelector('header');
  const themeT=document.getElementById('theme-toggle');
  hdr.insertBefore(btn,themeT);
  btn.addEventListener('click',()=>setViewMode(viewMode==='essay'?'map':'essay'));
})();

document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const ae=document.activeElement;
  if(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable))return;
  if(viewMode==='essay'){setViewMode('map');return}
  if(selectedId && selectedId!=='root')selectNode('root');
});

/* ═══ TOOL DISPATCHER ═══ */
const toolTimers=[];
function clearAllToolTimers(){
  toolTimers.forEach(t=>clearInterval(t));toolTimers.length=0;
  // Reset running flags so re-entering tool starts clean
  if(typeof PomoState!=='undefined'){PomoState.running=false;PomoState._t=null}
  if(typeof BlurtState!=='undefined'){BlurtState.running=false;BlurtState._t=null}
}

function renderTool(name){
  clearAllToolTimers();
  if(name==='pomo')return renderPomo();
  if(name==='flash')return renderFlash();
  if(name==='blurt')return renderBlurt();
  if(name==='feyn')return renderFeyn();
  if(name==='habit')return renderHabit();
}

/* ═══ TOOL 1: POMODORO ═══ */
const PomoState={
  focusMin:25,breakMin:5,
  phase:'focus',timeLeft:25*60,running:false,
  sessionsToday:0,today:'',
};

function pomoLoadState(){
  const today=new Date().toDateString();
  const saved=localStorage.getItem('learning-pomo');
  if(saved){
    try{
      const o=JSON.parse(saved);
      if(o.today===today)PomoState.sessionsToday=o.sessionsToday||0;
      if(o.focusMin)PomoState.focusMin=o.focusMin;
      if(o.breakMin)PomoState.breakMin=o.breakMin;
    }catch(e){}
  }
  PomoState.today=today;
  PomoState.timeLeft=PomoState.focusMin*60;
}
function pomoSaveState(){
  localStorage.setItem('learning-pomo',JSON.stringify({
    sessionsToday:PomoState.sessionsToday,today:PomoState.today,
    focusMin:PomoState.focusMin,breakMin:PomoState.breakMin
  }));
}
function pomoBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.value=PomoState.phase==='focus'?880:660;
    g.gain.setValueAtTime(0.18,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
    o.start();o.stop(ctx.currentTime+0.6);
  }catch(e){}
}
function pomoFmt(s){const m=Math.floor(s/60),sc=s%60;return`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`}

function renderPomo(){
  pomoLoadState();
  const totalSec=PomoState.phase==='focus'?PomoState.focusMin*60:PomoState.breakMin*60;
  const pct=1-PomoState.timeLeft/totalSec;
  const circumference=2*Math.PI*100;
  const dashOffset=circumference*(1-pct);
  const isBreak=PomoState.phase==='break';
  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Pomodoro Timer</div>
<div class="tool-sub">Structured focus dengan break terjadwal. Basis: vigilance decrement mitigation (Ariga & Lleras, 2011). Angka 25/5 cuma default. Konsistensinya yang penting, bukan rasionya.</div>

<div class="pomo-wrap">
<div class="pomo-ring${isBreak?' is-break':''}" id="pomo-ring">
<svg viewBox="0 0 220 220">
<circle class="ring-bg" cx="110" cy="110" r="100"></circle>
<circle class="ring-fg" cx="110" cy="110" r="100"
  stroke-dasharray="${circumference}"
  stroke-dashoffset="${dashOffset}"></circle>
</svg>
<div class="pomo-display">
<div class="pomo-time" id="pomo-time">${pomoFmt(PomoState.timeLeft)}</div>
<div class="pomo-phase" id="pomo-phase">${isBreak?'BREAK':'FOCUS'}</div>
</div>
</div>
</div>

<div class="pomo-controls">
<button class="p-btn ${PomoState.running?'':'on'}" id="pomo-start">${PomoState.running?'⏸ Pause':'▶ Start'}</button>
<button class="p-btn" id="pomo-reset">↻ Reset</button>
<button class="p-btn" id="pomo-skip">⤳ Skip</button>
</div>

<div class="pomo-presets">
<div class="pomo-preset-row">
<label>FOCUS (min)</label>
<input type="number" id="pomo-focus" min="1" max="180" value="${PomoState.focusMin}">
<label>BREAK (min)</label>
<input type="number" id="pomo-break" min="1" max="60" value="${PomoState.breakMin}">
</div>
<div class="tool-row">
<button class="p-btn" data-preset="25,5">25 / 5</button>
<button class="p-btn" data-preset="50,10">50 / 10</button>
<button class="p-btn" data-preset="90,20">90 / 20</button>
<button class="p-btn" data-preset="45,15">45 / 15</button>
</div>
</div>

<div class="pomo-stats">
<div><strong id="pomo-sess">${PomoState.sessionsToday}</strong> sesi focus hari ini</div>
<div><strong id="pomo-min">${PomoState.sessionsToday*PomoState.focusMin}</strong> menit total focus</div>
</div>
</div>`;
  cp.scrollTop=0;

  const updRing=()=>{
    const total=PomoState.phase==='focus'?PomoState.focusMin*60:PomoState.breakMin*60;
    const pp=1-PomoState.timeLeft/total;
    const off=circumference*(1-pp);
    document.querySelector('#pomo-ring .ring-fg').setAttribute('stroke-dashoffset',off);
    document.getElementById('pomo-time').textContent=pomoFmt(PomoState.timeLeft);
    document.getElementById('pomo-phase').textContent=PomoState.phase==='focus'?'FOCUS':'BREAK';
    document.getElementById('pomo-ring').classList.toggle('is-break',PomoState.phase==='break');
  };

  const tick=()=>{
    PomoState.timeLeft--;
    if(PomoState.timeLeft<=0){
      pomoBeep();
      if(PomoState.phase==='focus'){
        PomoState.sessionsToday++;pomoSaveState();
        document.getElementById('pomo-sess').textContent=PomoState.sessionsToday;
        document.getElementById('pomo-min').textContent=PomoState.sessionsToday*PomoState.focusMin;
        PomoState.phase='break';PomoState.timeLeft=PomoState.breakMin*60;
      } else {
        PomoState.phase='focus';PomoState.timeLeft=PomoState.focusMin*60;
      }
    }
    updRing();
  };

  document.getElementById('pomo-start').addEventListener('click',()=>{
    PomoState.running=!PomoState.running;
    const btn=document.getElementById('pomo-start');
    if(PomoState.running){
      btn.textContent='⏸ Pause';btn.classList.remove('on');
      const t=setInterval(tick,1000);toolTimers.push(t);PomoState._t=t;
    } else {
      btn.textContent='▶ Start';btn.classList.add('on');
      if(PomoState._t){clearInterval(PomoState._t);PomoState._t=null}
    }
  });

  document.getElementById('pomo-reset').addEventListener('click',()=>{
    PomoState.running=false;PomoState.phase='focus';PomoState.timeLeft=PomoState.focusMin*60;
    if(PomoState._t){clearInterval(PomoState._t);PomoState._t=null}
    document.getElementById('pomo-start').textContent='▶ Start';
    document.getElementById('pomo-start').classList.add('on');
    updRing();
  });

  document.getElementById('pomo-skip').addEventListener('click',()=>{
    if(PomoState.phase==='focus'){PomoState.phase='break';PomoState.timeLeft=PomoState.breakMin*60}
    else{PomoState.phase='focus';PomoState.timeLeft=PomoState.focusMin*60}
    updRing();
  });

  const applyDurations=()=>{
    const f=parseInt(document.getElementById('pomo-focus').value)||25;
    const b=parseInt(document.getElementById('pomo-break').value)||5;
    PomoState.focusMin=Math.max(1,Math.min(180,f));
    PomoState.breakMin=Math.max(1,Math.min(60,b));
    PomoState.timeLeft=PomoState.phase==='focus'?PomoState.focusMin*60:PomoState.breakMin*60;
    PomoState.running=false;
    if(PomoState._t){clearInterval(PomoState._t);PomoState._t=null}
    document.getElementById('pomo-start').textContent='▶ Start';
    document.getElementById('pomo-start').classList.add('on');
    pomoSaveState();updRing();
    document.getElementById('pomo-min').textContent=PomoState.sessionsToday*PomoState.focusMin;
  };
  document.getElementById('pomo-focus').addEventListener('change',applyDurations);
  document.getElementById('pomo-break').addEventListener('change',applyDurations);

  document.querySelectorAll('[data-preset]').forEach(b=>{
    b.addEventListener('click',()=>{
      const [f,br]=b.getAttribute('data-preset').split(',').map(Number);
      document.getElementById('pomo-focus').value=f;
      document.getElementById('pomo-break').value=br;
      applyDurations();
    });
  });
}

/* ═══ TOOL 2: SPACED FLASHCARDS (Leitner) ═══ */
const LEITNER_INTERVALS=[1,2,4,8,14]; // days per box (1-indexed via box-1)
const FlashState={cards:[],idx:0,flipped:false};
function flashLoad(){
  try{const s=localStorage.getItem('learning-flash');if(s)FlashState.cards=JSON.parse(s)||[]}
  catch(e){FlashState.cards=[]}
}
function flashSave(){localStorage.setItem('learning-flash',JSON.stringify(FlashState.cards))}
function flashIsDue(c){const now=Date.now();return !c.nextDue || c.nextDue<=now}
function flashGetDue(){return FlashState.cards.filter(flashIsDue)}
function flashNextDueDate(box){return Date.now()+LEITNER_INTERVALS[box-1]*86400000}

function renderFlash(){
  flashLoad();
  const due=flashGetDue();
  const byBox=[0,0,0,0,0],dueByBox=[0,0,0,0,0];
  FlashState.cards.forEach(c=>{byBox[c.box-1]++;if(flashIsDue(c))dueByBox[c.box-1]++});

  let cardHtml='';
  if(due.length===0){
    cardHtml=`<div class="flash-empty">${FlashState.cards.length===0?'Belum ada kartu. Tambah dulu di bawah.':'Semua kartu udah selesai untuk hari ini. Datang lagi besok.'}</div>`;
  } else {
    const c=due[FlashState.idx%due.length];
    const side=FlashState.flipped?'back':'front';
    const text=FlashState.flipped?c.back:c.front;
    cardHtml=`<div class="flash-card" id="flash-card">
      <div class="flash-side-label">${side}</div>
      <div class="flash-box-label">Box ${c.box}</div>
      <button class="flash-del" id="flash-del" title="Hapus kartu ini" aria-label="Hapus kartu ini">×</button>
      <div>${text||''}</div>
    </div>`;
  }

  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Spaced Flashcards (Leitner)</div>
<div class="tool-sub">5-box system: jawab bener → naik box, salah → balik box 1. Interval per box: 1d, 2d, 4d, 8d, 14d. Implementasi spacing effect (Cepeda et al., 2006).</div>

<div class="flash-boxes">
${[1,2,3,4,5].map(b=>`<div class="flash-box${dueByBox[b-1]>0?' due':''}"><div class="flash-box-num">${byBox[b-1]}</div><div class="flash-box-int">B${b} · ${LEITNER_INTERVALS[b-1]}d</div></div>`).join('')}
</div>

<div class="sub-label">${due.length>0?`${due.length} kartu jatuh tempo`:'Tidak ada kartu jatuh tempo'}</div>
${cardHtml}

${due.length>0?`<div class="flash-actions">
<button class="p-btn wrong" id="flash-wrong">✗ Lupa (→ Box 1)</button>
<button class="p-btn right" id="flash-right">✓ Inget (naik box)</button>
</div>`:''}

<div class="sub-label">Tambah kartu baru</div>
<div class="flash-add">
<input type="text" id="flash-front" placeholder="Pertanyaan / depan (contoh: 'Apa itu testing effect?')">
<textarea id="flash-back" placeholder="Jawaban / belakang"></textarea>
<div class="add-row">
<span class="add-hint">Total: ${FlashState.cards.length} kartu</span>
<button class="p-btn on" id="flash-add">+ Tambah</button>
</div>
</div>

${FlashState.cards.length>0?`<button class="habit-reset" id="flash-reset">Reset semua kartu</button>`:''}
</div>`;
  cp.scrollTop=0;

  const card=document.getElementById('flash-card');
  if(card){card.addEventListener('click',()=>{FlashState.flipped=!FlashState.flipped;renderFlash()})}

  const delBtn=document.getElementById('flash-del');
  if(delBtn)delBtn.addEventListener('click',e=>{
    e.stopPropagation();
    const dueNow=flashGetDue();const c=dueNow[FlashState.idx%dueNow.length];
    if(confirm('Hapus kartu ini?\n\nFront: '+(c.front||'').slice(0,60))){
      FlashState.cards=FlashState.cards.filter(x=>x.id!==c.id);
      FlashState.flipped=false;flashSave();renderFlash();
    }
  });

  const rightBtn=document.getElementById('flash-right');
  if(rightBtn)rightBtn.addEventListener('click',()=>{
    const dueNow=flashGetDue();const c=dueNow[FlashState.idx%dueNow.length];
    if(c.box<5)c.box++;
    c.lastSeen=Date.now();c.nextDue=flashNextDueDate(c.box);
    FlashState.flipped=false;flashSave();renderFlash();
  });

  const wrongBtn=document.getElementById('flash-wrong');
  if(wrongBtn)wrongBtn.addEventListener('click',()=>{
    const dueNow=flashGetDue();const c=dueNow[FlashState.idx%dueNow.length];
    c.box=1;c.lastSeen=Date.now();c.nextDue=flashNextDueDate(1);
    FlashState.flipped=false;flashSave();renderFlash();
  });

  document.getElementById('flash-add').addEventListener('click',()=>{
    const f=document.getElementById('flash-front').value.trim();
    const b=document.getElementById('flash-back').value.trim();
    if(!f||!b)return;
    FlashState.cards.push({id:Date.now()+Math.random(),front:f,back:b,box:1,lastSeen:0,nextDue:0});
    flashSave();renderFlash();
  });

  const resetBtn=document.getElementById('flash-reset');
  if(resetBtn)resetBtn.addEventListener('click',()=>{
    if(confirm('Hapus semua kartu? Ini gak bisa di-undo.')){FlashState.cards=[];FlashState.idx=0;FlashState.flipped=false;flashSave();renderFlash()}
  });
}

/* ═══ TOOL 3: BLURT PAD ═══ */
const BlurtState={topic:'',duration:300,timeLeft:300,running:false,text:''};
function renderBlurt(){
  const min=Math.floor(BlurtState.timeLeft/60),sec=BlurtState.timeLeft%60;
  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Blurt Pad</div>
<div class="tool-sub">Pilih topik, set durasi, tulis semua yang kamu inget tanpa lihat materi. Lalu bandingin sama source untuk identifikasi gap. Implementasi paling murni dari testing effect (Roediger & Karpicke, 2006).</div>

<div class="blurt-topbar">
<input type="text" id="blurt-topic" placeholder="Topik (contoh: 'Spacing effect')" value="${BlurtState.topic}">
<select id="blurt-dur" class="p-btn">
<option value="180"${BlurtState.duration===180?' selected':''}>3 min</option>
<option value="300"${BlurtState.duration===300?' selected':''}>5 min</option>
<option value="600"${BlurtState.duration===600?' selected':''}>10 min</option>
<option value="900"${BlurtState.duration===900?' selected':''}>15 min</option>
</select>
<div class="blurt-timer${BlurtState.running?'':' idle'}" id="blurt-timer">${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}</div>
<button class="p-btn on" id="blurt-toggle">${BlurtState.running?'⏸ Pause':'▶ Start'}</button>
<button class="p-btn" id="blurt-reset">↻ Reset</button>
</div>

<textarea class="blurt-textarea" id="blurt-text" placeholder="Tulis semua yang kamu inget tentang topik ini, tanpa lihat materi. Nggak perlu rapi. Nggak perlu lengkap. Yang penting effortful retrieval.">${BlurtState.text}</textarea>
<div class="blurt-wordcount" id="blurt-wc">0 kata</div>

<div class="sec">
<div class="sec-label">Setelah Selesai</div>
<div class="sec-text">Bandingin tulisanmu sama source material. Yang kamu lewat itu peta lubang pemahaman. Tambah kartu flashcards baru untuk gap-nya, atau jadwalkan re-read di area itu.</div>
</div>
</div>`;
  cp.scrollTop=0;

  const ta=document.getElementById('blurt-text');
  ta.addEventListener('input',()=>{
    BlurtState.text=ta.value;
    const wc=ta.value.trim().split(/\s+/).filter(Boolean).length;
    document.getElementById('blurt-wc').textContent=`${wc} kata`;
  });
  // Trigger initial word count
  const wc=ta.value.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById('blurt-wc').textContent=`${wc} kata`;

  document.getElementById('blurt-topic').addEventListener('input',e=>{BlurtState.topic=e.target.value});
  document.getElementById('blurt-dur').addEventListener('change',e=>{
    BlurtState.duration=parseInt(e.target.value);
    BlurtState.timeLeft=BlurtState.duration;
    BlurtState.running=false;
    if(BlurtState._t){clearInterval(BlurtState._t);BlurtState._t=null}
    const tm=document.getElementById('blurt-timer');
    const m=Math.floor(BlurtState.timeLeft/60),s=BlurtState.timeLeft%60;
    tm.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    tm.classList.add('idle');
    document.getElementById('blurt-toggle').textContent='▶ Start';
  });

  document.getElementById('blurt-toggle').addEventListener('click',()=>{
    BlurtState.running=!BlurtState.running;
    const btn=document.getElementById('blurt-toggle');
    const tm=document.getElementById('blurt-timer');
    if(BlurtState.running){
      btn.textContent='⏸ Pause';
      tm.classList.remove('idle');
      const t=setInterval(()=>{
        BlurtState.timeLeft--;
        if(BlurtState.timeLeft<=0){
          BlurtState.running=false;BlurtState.timeLeft=0;
          clearInterval(t);BlurtState._t=null;
          tm.textContent='00:00';
          btn.textContent='▶ Start';
          try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=660;g.gain.setValueAtTime(0.18,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8);o.start();o.stop(ctx.currentTime+0.8)}catch(e){}
          return;
        }
        const m=Math.floor(BlurtState.timeLeft/60),s=BlurtState.timeLeft%60;
        tm.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      },1000);
      toolTimers.push(t);BlurtState._t=t;
    } else {
      btn.textContent='▶ Start';
      tm.classList.add('idle');
      if(BlurtState._t){clearInterval(BlurtState._t);BlurtState._t=null}
    }
  });

  document.getElementById('blurt-reset').addEventListener('click',()=>{
    BlurtState.running=false;BlurtState.timeLeft=BlurtState.duration;BlurtState.text='';
    if(BlurtState._t){clearInterval(BlurtState._t);BlurtState._t=null}
    document.getElementById('blurt-text').value='';
    document.getElementById('blurt-wc').textContent='0 kata';
    const tm=document.getElementById('blurt-timer');
    const m=Math.floor(BlurtState.timeLeft/60),s=BlurtState.timeLeft%60;
    tm.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    tm.classList.add('idle');
    document.getElementById('blurt-toggle').textContent='▶ Start';
  });
}

/* ═══ TOOL 4: FEYNMAN WALKER ═══ */
const FEYN_STEPS=[
  {short:'Pilih',title:'Pilih konsep',prompt:"Konsep apa yang mau kamu test pemahamannya? Spesifik. Bukan 'fisika', tapi 'momentum conservation' atau 'time value of money'."},
  {short:'Jelasin',title:'Jelasin ke anak 12 tahun',prompt:"Tulis penjelasan pake bahasa yang anak SMP bisa pahami. Tanpa jargon. Tanpa singkatan teknis. Kalau perlu jargon, mungkin kamu belum bisa simplify."},
  {short:'Gap',title:'Identifikasi gap',prompt:"Baca penjelasanmu balik. Di mana kamu reach for jargon karena nggak bisa simplify? Di mana stuck? Tulis 2-3 bullet poin spesifik tentang lubang pemahamanmu."},
  {short:'Review',title:'Simplify dan re-explain',prompt:"Balik ke source material untuk gap yang kamu identifikasi. Lalu tulis ulang penjelasanmu, kali ini lebih simple lagi. Pake analogi atau contoh kalo perlu."}
];
const FeynState={concept:'',step:0,answers:['','','',''],sessions:[]};
function feynLoad(){
  try{const s=localStorage.getItem('learning-feyn');if(s){const o=JSON.parse(s);if(o.sessions)FeynState.sessions=o.sessions}}
  catch(e){}
}
function feynSave(){localStorage.setItem('learning-feyn',JSON.stringify({sessions:FeynState.sessions}))}

function renderFeyn(){
  feynLoad();
  const st=FeynState.step;
  const stepInfo=FEYN_STEPS[st];

  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">Feynman Walker</div>
<div class="tool-sub">4-step structured Feynman technique. Kalo bisa jelasin tanpa jargon, kamu beneran ngerti. Implementasi self-explanation + elaborative interrogation + retrieval practice (Dunlosky et al., 2013).</div>

<div class="feyn-steps">
${FEYN_STEPS.map((s,i)=>`<div class="feyn-step-pill ${i===st?'on':(i<st?'done':'')}"><span class="feyn-step-num">${i+1}</span>${s.short}</div>`).join('')}
</div>

<div class="sec-label">Step ${st+1} — ${stepInfo.title}</div>
<div class="feyn-prompt">${stepInfo.prompt}</div>

${st===0?`<input type="text" class="blurt-topbar" style="width:100%;padding:12px 14px;background:var(--card);border:1px solid var(--border);color:var(--text);font-family:var(--font);font-size:14px;border-radius:var(--radius-sm);outline:none;margin-bottom:12px" id="feyn-concept" placeholder="Contoh: Spacing effect, Black-Scholes pricing, Photosynthesis Calvin cycle..." value="${FeynState.concept}">`:''}

<textarea class="feyn-textarea" id="feyn-text" placeholder="${st===0?'Atau tulis konsep dan konteks di sini...':'Tulis jawaban di sini...'}">${FeynState.answers[st]}</textarea>

<div class="feyn-nav">
<button class="p-btn" id="feyn-prev" ${st===0?'disabled style="opacity:0.4;cursor:not-allowed"':''}>← Step sebelum</button>
${st<3?`<button class="p-btn on" id="feyn-next">Step lanjut →</button>`:`<button class="p-btn on" id="feyn-save">💾 Simpan & Reset</button>`}
</div>

${FeynState.sessions.length>0?`<div class="sec" style="margin-top:30px">
<div class="sec-label">Sesi Sebelumnya (${FeynState.sessions.length})</div>
<ul class="sec-list">
${FeynState.sessions.slice(-5).reverse().map((s,i)=>`<li><strong>${s.concept||'(tanpa judul)'}</strong> · ${new Date(s.date).toLocaleDateString('id-ID')}</li>`).join('')}
</ul>
</div>`:''}
</div>`;
  cp.scrollTop=0;

  const ta=document.getElementById('feyn-text');
  ta.addEventListener('input',()=>{FeynState.answers[st]=ta.value});
  const conceptIn=document.getElementById('feyn-concept');
  if(conceptIn)conceptIn.addEventListener('input',e=>{FeynState.concept=e.target.value});

  document.getElementById('feyn-prev').addEventListener('click',()=>{
    if(FeynState.step>0){FeynState.step--;renderFeyn()}
  });
  const nextBtn=document.getElementById('feyn-next');
  if(nextBtn)nextBtn.addEventListener('click',()=>{FeynState.step++;renderFeyn()});
  const saveBtn=document.getElementById('feyn-save');
  if(saveBtn)saveBtn.addEventListener('click',()=>{
    FeynState.sessions.push({date:Date.now(),concept:FeynState.concept,answers:[...FeynState.answers]});
    feynSave();
    FeynState.concept='';FeynState.step=0;FeynState.answers=['','','',''];
    renderFeyn();
  });
}

/* ═══ TOOL 5: HABIT TRACKER (3-Pillar) ═══ */
const PILLARS=[
  {key:'body',icon:'💪',title:'Body',sub:'1 jam: olahraga, lift, cardio, atau yoga'},
  {key:'consume',icon:'📚',title:'Consume',sub:'1 jam: baca, dengar podcast, kursus, diskusi'},
  {key:'create',icon:'✍️',title:'Create',sub:'1 jam: nulis, gambar, kode, musik, refleksi'},
];
function habitLoad(){
  try{const s=localStorage.getItem('learning-habit');return s?JSON.parse(s):{}}
  catch(e){return{}}
}
function habitSave(data){localStorage.setItem('learning-habit',JSON.stringify(data))}
function habitKey(d){const dt=d||new Date();return dt.toISOString().slice(0,10)}

function renderHabit(){
  const data=habitLoad();
  const today=habitKey();
  const todayData=data[today]||{body:false,consume:false,create:false};

  // Calculate streak — consecutive days with at least 1 pillar
  let streak=0;
  const d=new Date();
  while(true){
    const k=habitKey(d);
    const v=data[k];
    if(!v)break;
    const count=(v.body?1:0)+(v.consume?1:0)+(v.create?1:0);
    if(count===0)break;
    streak++;
    d.setDate(d.getDate()-1);
  }

  // Full-streak (all 3 pillars) streak
  let fullStreak=0;
  const d2=new Date();
  while(true){
    const k=habitKey(d2);
    const v=data[k];
    if(!v)break;
    if(!(v.body && v.consume && v.create))break;
    fullStreak++;
    d2.setDate(d2.getDate()-1);
  }

  // Total days with at least 1
  const totalDays=Object.values(data).filter(v=>(v.body?1:0)+(v.consume?1:0)+(v.create?1:0)>0).length;

  // 14-day heatmap (oldest left, today right)
  const cells=[];
  for(let i=13;i>=0;i--){
    const dd=new Date();dd.setDate(dd.getDate()-i);
    const k=habitKey(dd);
    const v=data[k]||{};
    const count=(v.body?1:0)+(v.consume?1:0)+(v.create?1:0);
    cells.push({date:k,count,isToday:i===0,label:dd.toLocaleDateString('id-ID',{day:'numeric',month:'short'})});
  }

  cp.innerHTML=`<div class="tool-wrap">
<div class="tool-title">3-Pillar Habit Tracker</div>
<div class="tool-sub">Track tiga jam non-negotiable harian. Implementasi implementation intentions (Gollwitzer, 1999) + identity-based habit (self-perception theory, Bem 1972). Angka 3 jam itu rule of thumb, bukan magic. Yang penting konsistensinya.</div>

<div class="habit-streak">
<div class="habit-stat"><div class="habit-stat-num">${streak}</div><div class="habit-stat-label">Streak Hari</div></div>
<div class="habit-stat"><div class="habit-stat-num">${fullStreak}</div><div class="habit-stat-label">Full Streak</div></div>
<div class="habit-stat"><div class="habit-stat-num">${totalDays}</div><div class="habit-stat-label">Total Hari</div></div>
</div>

<div class="sub-label">Hari Ini</div>
<div class="habit-pillars">
${PILLARS.map(p=>`<div class="habit-pillar${todayData[p.key]?' done':''}" data-pillar="${p.key}">
<div class="habit-pillar-icon">${p.icon}</div>
<div class="habit-pillar-text">
<div class="habit-pillar-title">${p.title}</div>
<div class="habit-pillar-sub">${p.sub}</div>
</div>
<div class="habit-check">${todayData[p.key]?'✓':''}</div>
</div>`).join('')}
</div>

<div class="sub-label">14 Hari Terakhir</div>
<div class="habit-grid">
${cells.map(c=>`<div class="habit-cell ${c.count>=3?'l3':c.count===2?'l2':c.count===1?'l1':''}${c.isToday?' today':''}" title="${c.label}: ${c.count}/3"></div>`).join('')}
</div>
<div class="habit-legend">
0 <span class="habit-legend-cell" style="background:var(--bg);border:1px solid var(--border)"></span>
<span class="habit-legend-cell" style="background:var(--amber-ghost)"></span>
<span class="habit-legend-cell" style="background:var(--amber-dim)"></span>
<span class="habit-legend-cell" style="background:var(--amber)"></span> 3
</div>

<button class="habit-reset" id="habit-reset">Reset semua data</button>
</div>`;
  cp.scrollTop=0;

  document.querySelectorAll('.habit-pillar').forEach(el=>{
    el.addEventListener('click',()=>{
      const key=el.getAttribute('data-pillar');
      const data=habitLoad();
      if(!data[today])data[today]={body:false,consume:false,create:false};
      data[today][key]=!data[today][key];
      habitSave(data);
      renderHabit();
    });
  });

  document.getElementById('habit-reset').addEventListener('click',()=>{
    if(confirm('Hapus semua data habit? Streak, history, semua. Gak bisa di-undo.')){
      localStorage.removeItem('learning-habit');
      renderHabit();
    }
  });
}

/* ═══ INIT ═══ */
selectedId='root';applyNodeColors();
setViewMode(viewMode);
