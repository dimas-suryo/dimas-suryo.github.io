/* ═══ THEME ═══ */
const themeBtn = document.getElementById("theme-toggle");
let isDark = true;
if (localStorage.getItem("guitar-theory-theme") === "light") {
  document.body.classList.add("light");
  themeBtn.textContent = "🌙";
  isDark = false;
}
themeBtn.addEventListener("click", () => {
  isDark = !isDark;
  document.body.classList.toggle("light", !isDark);
  themeBtn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("guitar-theory-theme", isDark ? "dark" : "light");
  applyNodeColors();
});

/* ═══ RESIZER ═══ */
const resizer = document.getElementById("resizer"),
  mapPanel = document.getElementById("map-panel"),
  layout = document.querySelector(".layout");
let isResizing = false;
const mobileQ = window.matchMedia("(max-width:860px)");
resizer.addEventListener("mousedown", initR);
resizer.addEventListener("touchstart", initR, { passive: false });
function initR(e) {
  if (mobileQ.matches) return;
  isResizing = true;
  resizer.classList.add("active");
  document.body.classList.add("no-select");
  document.addEventListener("mousemove", doR);
  document.addEventListener("mouseup", stopR);
  document.addEventListener("touchmove", doR, { passive: false });
  document.addEventListener("touchend", stopR);
  e.preventDefault();
}
function doR(e) {
  if (!isResizing) return;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const r = layout.getBoundingClientRect();
  let w = Math.max(220, Math.min(r.width - 300, cx - r.left));
  mapPanel.style.width = w + "px";
  W = mapPanel.clientWidth;
  H = mapPanel.clientHeight;
  calcPos(W, H);
  ng.attr("transform", (d) => `translate(${d.x},${d.y})`);
  lsel.attr("d", linkPath);
}
function stopR() {
  isResizing = false;
  resizer.classList.remove("active");
  document.body.classList.remove("no-select");
  document.removeEventListener("mousemove", doR);
  document.removeEventListener("mouseup", stopR);
  document.removeEventListener("touchmove", doR);
  document.removeEventListener("touchend", stopR);
}

/* ═══ MUSIC DATA ═══ */
const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];
const NOTE_IDS = [
  "C",
  "Cs",
  "D",
  "Ds",
  "E",
  "F",
  "Fs",
  "G",
  "Gs",
  "A",
  "As",
  "B",
];
const STRINGS = [
  { name: "e¹", openIdx: 4 },
  { name: "B", openIdx: 11 },
  { name: "G", openIdx: 7 },
  { name: "D", openIdx: 2 },
  { name: "A", openIdx: 9 },
  { name: "E₆", openIdx: 4 },
];
const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15]);
const ALL_NOTES = [
  { id: "C", sh: "C", fl: "C", nat: true, freq: 261.63 },
  { id: "Cs", sh: "C♯", fl: "D♭", nat: false, freq: 277.18 },
  { id: "D", sh: "D", fl: "D", nat: true, freq: 293.66 },
  { id: "Ds", sh: "D♯", fl: "E♭", nat: false, freq: 311.13 },
  { id: "E", sh: "E", fl: "E", nat: true, freq: 329.63 },
  { id: "F", sh: "F", fl: "F", nat: true, freq: 349.23 },
  { id: "Fs", sh: "F♯", fl: "G♭", nat: false, freq: 369.99 },
  { id: "G", sh: "G", fl: "G", nat: true, freq: 392.0 },
  { id: "Gs", sh: "G♯", fl: "A♭", nat: false, freq: 415.3 },
  { id: "A", sh: "A", fl: "A", nat: true, freq: 440.0 },
  { id: "As", sh: "A♯", fl: "B♭", nat: false, freq: 466.16 },
  { id: "B", sh: "B", fl: "B", nat: true, freq: 493.88 },
];
const INTERVAL_LIST = [
  { st: 0, name: "Perfect Unison", sh: "P1" },
  { st: 1, name: "Minor 2nd", sh: "m2" },
  { st: 2, name: "Major 2nd", sh: "M2" },
  { st: 3, name: "Minor 3rd", sh: "m3" },
  { st: 4, name: "Major 3rd", sh: "M3" },
  { st: 5, name: "Perfect 4th", sh: "P4" },
  { st: 6, name: "Tritone", sh: "TT" },
  { st: 7, name: "Perfect 5th", sh: "P5" },
  { st: 8, name: "Minor 6th", sh: "m6" },
  { st: 9, name: "Major 6th", sh: "M6" },
  { st: 10, name: "Minor 7th", sh: "m7" },
  { st: 11, name: "Major 7th", sh: "M7" },
  { st: 12, name: "Perfect Octave", sh: "P8" },
];
const SCALE_TYPES = {
  major: {
    name: "Major (Ionian)",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degrees: ["1", "2", "3", "4", "5", "6", "7"],
  },
  "natural-minor": {
    name: "Natural Minor (Aeolian)",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
  },
  "harmonic-minor": {
    name: "Harmonic Minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "7"],
  },
  "melodic-minor": {
    name: "Melodic Minor (Asc)",
    intervals: [0, 2, 3, 5, 7, 9, 11],
    degrees: ["1", "2", "♭3", "4", "5", "6", "7"],
  },
  "major-pent": {
    name: "Major Pentatonic",
    intervals: [0, 2, 4, 7, 9],
    degrees: ["1", "2", "3", "5", "6"],
  },
  "minor-pent": {
    name: "Minor Pentatonic",
    intervals: [0, 3, 5, 7, 10],
    degrees: ["1", "♭3", "4", "5", "♭7"],
  },
  blues: {
    name: "Blues Scale",
    intervals: [0, 3, 5, 6, 7, 10],
    degrees: ["1", "♭3", "4", "♭5", "5", "♭7"],
  },
  dorian: {
    name: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    degrees: ["1", "2", "♭3", "4", "5", "6", "♭7"],
  },
  phrygian: {
    name: "Phrygian",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    degrees: ["1", "♭2", "♭3", "4", "5", "♭6", "♭7"],
  },
  lydian: {
    name: "Lydian",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    degrees: ["1", "2", "3", "♯4", "5", "6", "7"],
  },
  mixolydian: {
    name: "Mixolydian",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    degrees: ["1", "2", "3", "4", "5", "6", "♭7"],
  },
  locrian: {
    name: "Locrian",
    intervals: [0, 1, 3, 5, 6, 8, 10],
    degrees: ["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"],
  },
  "phrygian-dom": {
    name: "Phrygian Dominant",
    intervals: [0, 1, 4, 5, 7, 8, 10],
    degrees: ["1", "♭2", "3", "4", "5", "♭6", "♭7"],
  },
  "whole-tone": {
    name: "Whole Tone",
    intervals: [0, 2, 4, 6, 8, 10],
    degrees: ["1", "2", "3", "♯4", "♯5", "♭7"],
  },
};
const CHORD_TYPES = {
  major: {
    name: "Major",
    tones: [0, 4, 7],
    labels: ["R", "3", "5"],
    colors: ["root", "third", "fifth"],
  },
  minor: {
    name: "Minor",
    tones: [0, 3, 7],
    labels: ["R", "♭3", "5"],
    colors: ["root", "third", "fifth"],
  },
  dim: {
    name: "Diminished",
    tones: [0, 3, 6],
    labels: ["R", "♭3", "♭5"],
    colors: ["root", "third", "fifth"],
  },
  aug: {
    name: "Augmented",
    tones: [0, 4, 8],
    labels: ["R", "3", "♯5"],
    colors: ["root", "third", "fifth"],
  },
  maj7: {
    name: "Major 7th",
    tones: [0, 4, 7, 11],
    labels: ["R", "3", "5", "7"],
    colors: ["root", "third", "fifth", "seventh"],
  },
  dom7: {
    name: "Dominant 7th",
    tones: [0, 4, 7, 10],
    labels: ["R", "3", "5", "♭7"],
    colors: ["root", "third", "fifth", "seventh"],
  },
  min7: {
    name: "Minor 7th",
    tones: [0, 3, 7, 10],
    labels: ["R", "♭3", "5", "♭7"],
    colors: ["root", "third", "fifth", "seventh"],
  },
  hdim7: {
    name: "Half-Diminished",
    tones: [0, 3, 6, 10],
    labels: ["R", "♭3", "♭5", "♭7"],
    colors: ["root", "third", "fifth", "seventh"],
  },
  dim7: {
    name: "Diminished 7th",
    tones: [0, 3, 6, 9],
    labels: ["R", "♭3", "♭5", "♭♭7"],
    colors: ["root", "third", "fifth", "seventh"],
  },
  sus4: {
    name: "Sus4",
    tones: [0, 5, 7],
    labels: ["R", "4", "5"],
    colors: ["root", "other", "fifth"],
  },
  sus2: {
    name: "Sus2",
    tones: [0, 2, 7],
    labels: ["R", "2", "5"],
    colors: ["root", "other", "fifth"],
  },
  dom9: {
    name: "Dominant 9th",
    tones: [0, 4, 7, 10, 2],
    labels: ["R", "3", "5", "♭7", "9"],
    colors: ["root", "third", "fifth", "seventh", "other"],
  },
  add9: {
    name: "Add9",
    tones: [0, 4, 7, 2],
    labels: ["R", "3", "5", "9"],
    colors: ["root", "third", "fifth", "other"],
  },
  min9: {
    name: "Minor 9th",
    tones: [0, 3, 7, 10, 2],
    labels: ["R", "♭3", "5", "♭7", "9"],
    colors: ["root", "third", "fifth", "seventh", "other"],
  },
};

/* ═══ SHARED FRETBOARD RENDERER ═══ */
function renderFB(containerId, highlights, maxFret) {
  maxFret = maxFret || 15;
  const el = document.getElementById(containerId);
  if (!el) return;
  // highlights = [{stringIdx:0-5, fret:0-15, label:'R', colorClass:'root'|'third'|'fifth'|'seventh'|'other'}]
  const hmap = {};
  highlights.forEach((h) => {
    hmap[`${h.stringIdx}-${h.fret}`] = h;
  });
  let html = "<table><thead><tr><th></th>";
  for (let f = 0; f <= maxFret; f++)
    html += `<th${FRET_MARKERS.has(f) ? ' class="fb-fret-marker"' : ""}>${f}</th>`;
  html += "</tr></thead><tbody>";
  STRINGS.forEach((s, si) => {
    html += `<tr><td class="fb-str-label">${s.name}</td>`;
    for (let f = 0; f <= maxFret; f++) {
      const key = `${si}-${f}`;
      const h = hmap[key];
      if (h)
        html += `<td><span class="fb-dot ${h.colorClass}">${h.label}</span></td>`;
      else html += `<td></td>`;
    }
    html += "</tr>";
  });
  html += "</tbody></table>";
  el.innerHTML = html;
}

function buildLegend(items) {
  return (
    '<div class="fb-legend">' +
    items
      .map(
        (i) =>
          `<div class="fb-legend-item"><div class="fb-legend-dot ${i.cls}"></div>${i.name}</div>`,
      )
      .join("") +
    "</div>"
  );
}

/* ═══ CONTENT DATABASE ═══*/
const C = {
  root: {
    title: "What You Should Also Know About Guitar",
    sub: "A guitarist's notes on the stuff someone should've told you when you first picked up the instrument. Nobody told me.",
    intro:
      "I played guitar for years before I sat down with theory in any serious way. The regret is always the same, I waited too long because I thought theory would make me stiff. It's the opposite. Theory is what gave me freedom on the fretboard. This page is the map of everything I wish I'd had when I started. Click any node that looks interesting, or flip Essay Mode in the header to read it straight through.",
    secs: [
      {
        l: "Why Bother With Theory?",
        t: "Theory isn't a cage. Think of it as the <strong>language for explaining</strong> what's already happening in a song, why this part sounds nice, why that other part gives you chills. Once you have the vocabulary, talking to other musicians stops being awkward, and dissecting tunes you love stops being guesswork.",
      },
      {
        l: "Learning Flow",
        li: [
          "1. <strong>Sound & Acoustics</strong> : sound as physics",
          "2. <strong>Notes & Tuning</strong> : the system of pitches and frequencies",
          "3. <strong>Intervals</strong> : the DNA of chords and scales",
          "4. <strong>Scales</strong> : the color palette of music",
          "5. <strong>Scale Math</strong> : the math behind why scales work",
          "6. <strong>Chord Construction</strong> : triads, 7ths, extensions",
          "7. <strong>Diatonic Harmony</strong> : chord families and harmonic function",
          "8. <strong>Modes</strong> : 7 colors from 1 parent scale",
          "9. <strong>Advanced Harmony</strong> : cadences, modulation",
          "10. <strong>Rhythm & Meter</strong> : the structure of time",
          "11. <strong>Guitar Essentials + sub-topics</strong>",
          "12. <strong>Ear Training, Practice & Mindset</strong>",
        ],
      },
      {
        l: "Three Pillars of Musicianship",
        li: [
          "<strong>Ear Training</strong> : hear, recognize, reproduce",
          "<strong>Fretboard Knowledge</strong> : know every note without thinking",
          "<strong>Rhythmic Fluency</strong> : the right note at the right time",
        ],
      },
    ],
    practice: [
      { drill: "Pick one node per week, complete every drill in it, then move on. Six months covers the whole map.", why: "Depth compounds. Breadth at the intermediate level just produces fluent ignorance." },
      { drill: "Record yourself playing four staples (open chords, a barre progression, a pentatonic improv, one full song) once a month.", why: "Memory lies about progress. A/B recordings are the only honest mirror." },
      { drill: "Before learning a new lick, sing the line out loud first, then find it on the fretboard.", why: "Ear-to-hand is the bottleneck for every intermediate guitarist, not finger speed." },
    ],
    tk: "Theory is a GPS, not a prison. Its job is to explain the 'why' behind music you already feel. That way you don't get lost every time you try to make something new.",
    refs: [
      "Aldwell, E., Schachter, C. (2018). Harmony and Voice Leading, 5th ed. Cengage.",
      "Levine, M. (1995). The Jazz Theory Book. Sher Music Co.",
    ],
  },

  sound: {
    title: "Sound & Acoustics",
    sub: "Sound as physics: waves, frequencies, and how the ear actually deals with all of it.",
    intro:
      "This is the section everyone skips because it feels too 'science-y'. Don't. Once you actually get why a fifth sounds stable and why a tritone makes everything tense, every chord theory after this stops being memorization and starts being obvious.",
    secs: [
      {
        l: "What Is Sound?",
        t: "Sound is a <strong>longitudinal mechanical wave</strong>: vibrations traveling through air at roughly 343 m/s, alternating regions of compression and rarefaction.",
      },
      {
        l: "4 Properties of Sound",
        tbl: {
          h: ["Property", "Physical", "Perceptual", "Unit"],
          r: [
            ["Frequency", "Cycles/sec", "Pitch", "Hz"],
            ["Amplitude", "Pressure variation", "Loudness", "dB"],
            ["Timbre", "Overtone makeup", "Tone color", ""],
            ["Duration", "Length of vibration", "Note length", "s"],
          ],
        },
      },
      {
        l: "Harmonic Series",
        t: "A single string doesn't vibrate at one frequency. It vibrates at 1/2, 1/3, 1/4 of its length all at once, and that's what produces the <strong>overtones</strong>. Every instrument has its own harmonic recipe, that's the reason a guitar string and a piano playing the same note sound nothing alike.",
      },
      {
        l: "Consonance & Dissonance",
        t: "Simple frequency ratios sound consonant (octave 2:1, fifth 3:2). Complicated ratios sound dissonant. Both are <strong>expressive tools</strong>, pick the one that fits the moment. Dissonance isn't a mistake.",
      },
    ],
    tk: "All of music theory eventually traces back to mathematical relationships between frequencies. That's it.",
    refs: [
      "Rossing, T. D. (2002). The Science of Sound, 3rd ed. Addison Wesley.",
      "Helmholtz, H. von (1885/1954). On the Sensations of Tone. Dover.",
    ],
  },

  notes: {
    title: "Notes & Tuning Systems",
    sub: "12 notes, A = 440 Hz, and a temperament debate that's been running for centuries.",
    intro:
      "The first time I really got why we have 12 notes, not 7, not 13, I felt slightly cheated by every prior music teacher. It's not arbitrary; it's a compromise the whole Western tradition agreed to. Once you know the compromise, the weird gaps in the system stop being weird.",
    secs: [
      {
        l: "12-Note Chromatic System",
        t: "Western music slices the octave into <strong>12 equally spaced notes</strong> (12-TET). Seven are 'natural': C D E F G A B. The gaps from E to F and B to C are already just a single semitone, no sharp in between.",
      },
      {
        l: "12-TET Math",
        t: "Each semitone rises by a ratio of <strong>¹²√2 ≈ 1.05946</strong>. Start at A4 = 440 Hz, A♯4 lands at 466.16 Hz, and after 12 semitones you hit 880 Hz, exactly one octave up.",
      },
      {
        l: "Standard Guitar Tuning",
        tbl: {
          h: ["String", "Note", "Hz"],
          r: [
            ["6", "E2", "82.41"],
            ["5", "A2", "110.00"],
            ["4", "D3", "146.83"],
            ["3", "G3", "196.00"],
            ["2", "B3", "246.94"],
            ["1", "E4", "329.63"],
          ],
        },
      },
      {
        l: "Alternate Tunings",
        li: [
          "<strong>Drop D</strong> (D A D G B E) : one-finger power chords",
          "<strong>Open G</strong> (D G D G B D) : Keith Richards, blues slide",
          "<strong>DADGAD</strong> : Celtic / folk, Jimmy Page",
          "<strong>Open D</strong> (D A D F♯ A D) : slide, fingerstyle",
        ],
      },
    ],
    practice: [
      { drill: "Run the Note Picker on strings 6 and 5 for ten minutes a day at BPM 60 then 80, for a full week.", why: "Until those two strings are reflex, every CAGED and barre conversation later costs extra brain cycles." },
      { drill: "Pick a favorite song, write the note name of every chord root, and verify each with a tuner.", why: "Abstract pitches stick when they're glued to music you actually play." },
      { drill: "Octave drill: pick a random note, find it on all six strings, repeat with five different notes per session.", why: "Octave navigation is how players cover 12 frets in one motion instead of crawling fret by fret." },
    ],
    tk: "12-TET is a compromise. We give up genuinely pure intervals in exchange for the freedom to play in any of the 12 keys without retuning every time we change keys.",
    refs: [
      "Isacoff, S. (2001). Temperament. Vintage.",
      "Duffin, R. W. (2007). How Equal Temperament Ruined Harmony. Norton.",
    ],
  },

  intervals: {
    title: "Intervals",
    sub: "The distance between two notes. The smallest unit everything in music is built out of.",
    intro:
      "I played for two years before I realized chords are literally just stacked intervals. That one insight cut what I had to memorize by half. The thirteen distances below are worth way more time than they look.",
    secs: [
      {
        l: "13 Intervals in 1 Octave",
        tbl: {
          h: ["ST", "Name", "Symbol", "Ratio", "Character"],
          r: [
            ["0", "Perfect Unison", "P1", "1:1", "Identical"],
            ["1", "Minor 2nd", "m2", "16:15", "Tense"],
            ["2", "Major 2nd", "M2", "9:8", "Open"],
            ["3", "Minor 3rd", "m3", "6:5", "Sad"],
            ["4", "Major 3rd", "M3", "5:4", "Bright"],
            ["5", "Perfect 4th", "P4", "4:3", "Strong"],
            ["6", "Tritone", "TT", "45:32", "Dissonant"],
            ["7", "Perfect 5th", "P5", "3:2", "Stable"],
            ["8", "Minor 6th", "m6", "8:5", "Mysterious"],
            ["9", "Major 6th", "M6", "5:3", "Warm"],
            ["10", "Minor 7th", "m7", "9:5", "Bluesy"],
            ["11", "Major 7th", "M7", "15:8", "Dreamy"],
            ["12", "Octave", "P8", "2:1", "Identical+"],
          ],
        },
      },
      {
        l: "Classification",
        li: [
          "<strong>Perfect</strong> (P1, P4, P5, P8) : no major/minor form",
          "<strong>Major / Minor</strong> (2nd, 3rd, 6th, 7th) : differ by 1 semitone",
          "<strong>Augmented</strong> : +1/2 step from a perfect or major",
          "<strong>Diminished</strong> : -1/2 step from a perfect or minor",
        ],
      },
      {
        l: "Inversion",
        t: "Interval names plus their inversions always sum to 9, and the semitones always sum to 12. Example: M3 (4 semitones) flipped is m6 (8 semitones). Major always flips to minor.",
      },
    ],
    practice: [
      { drill: "Run the Interval Trainer in Identify mode, All Intervals, five minutes daily.", why: "Chords and scales are stacked intervals. Without recognition, everything else is rote memorization." },
      { drill: "From a single root (say C), play AND sing every interval up to the octave.", why: "Hand alone makes intervals abstract. Voice plus hand makes them permanent." },
      { drill: "Pick four bars of a melody you love and write out the interval between each consecutive note.", why: "Theory dies in a week without a real-world anchor." },
    ],
    tk: "Internalize these 13 intervals, on paper and in your ear. The rest of theory is just ways to combine them, so the time you spend here pays you back everywhere else.",
    refs: [
      "Kostka, S. & Payne, D. (2012). Tonal Harmony, 7th ed. McGraw-Hill.",
    ],
  },

  scales: {
    title: "Scales",
    sub: "A bag of notes arranged in order. The color palette that decides a song's character.",
    intro:
      "If you've only memorized the minor pentatonic box and been stuck there for years, this is the section that frees you. A scale is a formula of distances between notes, not a finger position. Once the spacing clicks, you can drop it into any key on the spot.",
    secs: [
      {
        l: "Major Scale",
        t: "The pattern: <strong>W-W-H-W-W-W-H</strong>. The most fundamental scale of them all. Every other tonal idea is defined relative to it.",
      },
      {
        l: "Natural Minor",
        t: "The pattern: <strong>W-H-W-W-H-W-W</strong>. Compared to major, the 3rd, 6th, and 7th are all lowered (♭3, ♭6, ♭7), which is what makes it sound darker.",
      },
      {
        l: "Harmonic Minor",
        t: "Natural minor with the 7th raised. Two consequences: a distinctive Augmented 2nd gap appears, and the V chord turns into a Dominant 7. The second one is what makes the resolution feel so strong, that classical / flamenco sound.",
      },
      {
        l: "Pentatonic",
        tbl: {
          h: ["Scale", "Formula", "Character"],
          r: [
            ["Major Pent", "1 2 3 5 6", "Bright, melodic"],
            ["Minor Pent", "1 ♭3 4 5 ♭7", "Bluesy, raw"],
          ],
        },
      },
      {
        l: "Blues Scale",
        t: "Minor pentatonic plus a ♭5, the 'blue note': 1 ♭3 4 ♭5 5 ♭7. That single extra note is what turns everything bluesy.",
      },
    ],
    practice: [
      { drill: "Drill the Major scale in all 5 positions, key of C, 60 to 120 BPM ascending and descending, one week per position.", why: "Position fluency is what lets melody travel sideways instead of staying stuck in one box." },
      { drill: "Same five-position drill for the Minor Pentatonic, key of Am.", why: "Ninety percent of your improvisation will live inside these shapes. Make them automatic." },
      { drill: "Pick one fresh scale (Dorian or Mixolydian), drill it in two positions, and name its signature note out loud (natural 6 for Dorian, b7 for Mixolydian).", why: "Variety prevents pentatonic stagnation, but only if you can name what makes the new scale different." },
    ],
    tk: "Major scale is the reference point for all theory. Minor pentatonic is the everyday improv scale. Both need to live under your fingers.",
    refs: ["Persichetti, V. (1961). Twentieth-Century Harmony. Norton."],
  },

  math: {
    title: "Mathematics of Scale",
    sub: "The logic and symmetry hiding behind how scales are actually constructed.",
    secs: [
      {
        l: "Tetrachord",
        t: "A major scale is really <strong>two identical tetrachords</strong> (each W-W-H), bridged by a Whole Step in the middle.",
      },
      {
        l: "Visualization",
        cd: "Tetrachord 1     Bridge     Tetrachord 2\n W _ W _ H         W         W _ W _ H\n 1   2   3   4         5   6   7   8\n\nC Major: C_D_E_F  <W>  G_A_B_C",
      },
      {
        l: "Circle of Fifths",
        t: "The second tetrachord of one key turns into the first tetrachord of the next key, and each step adds one sharp. Each new key sits a Perfect 5th higher. That's where the name comes from.",
      },
    ],
    tk: "Tetrachords plus the Circle of Fifths are the mathematical foundation of all tonal harmony.",
    refs: ["Benson, D. (2006). Music: A Mathematical Offering. Cambridge UP."],
  },

  chords: {
    title: "Chord Construction",
    sub: "Chords are stacked intervals, not memorized finger positions.",
    intro:
      "When someone showed me that a major chord is just 'major third on top of minor third' and a minor is the reverse, my whole approach to chords flipped. I stopped seeing dots on a fretboard diagram and started seeing distances.",
    secs: [
      {
        l: "4 Triads",
        tbl: {
          h: ["Type", "Formula", "Stack"],
          r: [
            ["Major", "1 3 5", "M3+m3"],
            ["Minor", "1 ♭3 5", "m3+M3"],
            ["Dim", "1 ♭3 ♭5", "m3+m3"],
            ["Aug", "1 3 ♯5", "M3+M3"],
          ],
        },
      },
      {
        l: "5 Kinds of 7th Chords",
        tbl: {
          h: ["Type", "Formula", "Symbol"],
          r: [
            ["Maj7", "1 3 5 7", "Cmaj7"],
            ["Dom7", "1 3 5 ♭7", "C7"],
            ["Min7", "1 ♭3 5 ♭7", "Cm7"],
            ["Half-Dim", "1 ♭3 ♭5 ♭7", "Cø"],
            ["Dim7", "1 ♭3 ♭5 ♭♭7", "C°7"],
          ],
        },
      },
      {
        l: "Extensions",
        t: "A 9th is just the 2nd raised an octave; an 11th is the 4th; a 13th is the 6th. They add color without changing the chord's underlying role.",
      },
      {
        l: "Suspended",
        t: "Sus4 (1 4 5) and Sus2 (1 2 5) swap the 3rd for either a 4 or a 2. The 3rd is what decides major versus minor, so sus chords sound ambiguous, neither, just hanging.",
      },
    ],
    practice: [
      { drill: "Play Major triads on three string sets (1-2-3, 2-3-4, 3-4-5), nine voicings total. Verify each shape with the Chord Tone Highlighter.", why: "Triads on inner strings are the gateway away from cowboy chords and into real comping." },
      { drill: "Drill the four common 7th chord shapes (Maj7, Dom7, m7, m7b5) in two voicings each.", why: "Almost every modern pop and jazz tune you'll touch uses a 7th somewhere." },
      { drill: "Take a favorite progression and reharmonize one chord with an extension (9, 11, or 13). Play the original then the extended version back to back.", why: "Extensions are how Mayer and Asato sound 'modern' instead of 'open-mic'." },
    ],
    tk: "A chord is a stack of intervals. The thing that makes a Dominant 7 special: there's a tritone inside it, and that tritone is what pulls the chord toward resolution.",
    refs: [
      "Levine, M. (1995). The Jazz Theory Book. Sher Music.",
      "Piston, W. (1987). Harmony, 5th ed. Norton.",
    ],
  },

  family: {
    title: "Diatonic Harmony",
    sub: "The 7 chords built into every key, and how they function together.",
    secs: [
      {
        l: "7 Diatonic Chords (C Major)",
        tbl: {
          h: ["Deg", "Roman", "Chord", "7th", "Mode"],
          r: [
            ["1", "I", "C", "Cmaj7", "Ionian"],
            ["2", "ii", "Dm", "Dm7", "Dorian"],
            ["3", "iii", "Em", "Em7", "Phrygian"],
            ["4", "IV", "F", "Fmaj7", "Lydian"],
            ["5", "V", "G", "G7", "Mixolydian"],
            ["6", "vi", "Am", "Am7", "Aeolian"],
            ["7", "vii°", "Bdim", "Bø7", "Locrian"],
          ],
        },
      },
      {
        l: "3 Harmonic Functions",
        tbl: {
          h: ["Function", "Chord", "Role"],
          r: [
            ["Tonic", "I, iii, vi", "Stability"],
            ["Subdominant", "ii, IV", "Movement"],
            ["Dominant", "V, vii°", "Tension"],
          ],
        },
      },
      {
        l: "Popular Progressions",
        tbl: {
          h: ["Progression", "Example"],
          r: [
            ["I V vi IV", "Don't Stop Believin'"],
            ["ii V I", "Jazz standard"],
            ["vi IV I V", "Modern pop"],
            ["i ♭VII ♭VI V", "Andalusian"],
          ],
        },
      },
    ],
    practice: [
      { drill: "Play all 7 diatonic 7th chords in C ascending (Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5) and say the Roman numeral out loud as you go.", why: "Most progressions you hear collapse to a Roman numeral pattern. Naming them is half the battle." },
      { drill: "Pick three favorite songs and label the Roman numeral progression of each.", why: "Pattern recognition turns 'I don't know this song' into 'oh, it's just I-V-vi-IV again'." },
      { drill: "Compose your own four-chord progression using I-V-vi-IV or ii-V-I, then play it in three different keys.", why: "Function transcends key. If a pattern only works in C, you haven't really learned it yet." },
    ],
    tk: "Roman numerals work universally in any key. A good progression is really just a play with tension and its release.",
    refs: ["Aldwell & Schachter (2018). Harmony and Voice Leading. Cengage."],
  },

  modes: {
    title: "The 7 Modes",
    sub: "One parent scale, 7 starting points, 7 distinct emotional colors.",
    intro:
      "Modes were the thing that made me feel like a 'real' theory student once they clicked. The trick is realizing they aren't seven separate scales to memorize, they're seven different chairs at the same dinner table.",
    secs: [
      {
        l: "7 Modes",
        tbl: {
          h: ["#", "Mode", "Formula", "Tell", "Character"],
          r: [
            ["1", "Ionian", "1 2 3 4 5 6 7", "std", "Bright"],
            ["2", "Dorian", "1 2 ♭3 4 5 6 ♭7", "nat 6", "Hopeful minor"],
            ["3", "Phrygian", "1 ♭2 ♭3 4 5 ♭6 ♭7", "♭2", "Dark, exotic"],
            ["4", "Lydian", "1 2 3 ♯4 5 6 7", "♯4", "Dreamy"],
            ["5", "Mixolydian", "1 2 3 4 5 6 ♭7", "♭7", "Bluesy"],
            ["6", "Aeolian", "1 2 ♭3 4 5 ♭6 ♭7", "std", "Melancholic"],
            ["7", "Locrian", "1 ♭2 ♭3 4 ♭5 ♭6 ♭7", "♭5", "Unstable"],
          ],
        },
      },
      {
        l: "Bright to Dark",
        cd: "Bright <                          > Dark\nLydian > Ionian > Mixolydian > Dorian > Aeolian > Phrygian > Locrian",
      },
      {
        l: "Chord-Scale Theory",
        t: "Each diatonic chord has its own best-fit mode, e.g., Dm7 in the key of C wants D Dorian over it.",
      },
    ],
    practice: [
      { drill: "Drill A Dorian against an Am vamp, highlighting the natural 6 (F#). Repeat with G Mixolydian over G7 and C Lydian over Cmaj7#11.", why: "A mode is one note different from its parent scale. Don't overcomplicate it." },
      { drill: "Improvise two minutes per mode over a backing vamp built for that mode.", why: "Modes only click in the right harmonic context. Outside the vamp they collapse back into the parent scale." },
      { drill: "Play Am to Dm (natural minor) then Am to D7 (Dorian). Listen for the shift before you analyze it.", why: "Ear-based mode discrimination beats every textbook definition." },
    ],
    tk: "Lydian is the brightest, Locrian is the darkest. Chord-Scale Theory is the bridge between each chord and the mode that fits over it.",
    refs: ["Russell, G. (2001). Lydian Chromatic Concept. Concept Publishing."],
  },

  harmony: {
    title: "Advanced Harmony",
    sub: "Cadences, secondary dominants, modulation.",
    secs: [
      {
        l: "4 Cadences",
        tbl: {
          h: ["Cadence", "Motion", "Feel"],
          r: [
            ["Perfect Authentic", "V → I", "Final"],
            ["Plagal", "IV → I", "Amen"],
            ["Half", "? → V", "Hanging"],
            ["Deceptive", "V → vi", "Surprise"],
          ],
        },
      },
      {
        l: "Secondary Dominants",
        t: "A surprise Dom7 chord that points to a diatonic chord other than I, written V/x. In C: A7 is V/ii, D7 is V/V. Like borrowing dominant pull for a moment then giving it back.",
      },
      {
        l: "Tritone Substitution",
        t: "Any Dom7 can be swapped for another Dom7 a tritone away. G7 ↔ D♭7. Works because both chords share the exact same tritone inside.",
      },
      {
        l: "Modulation",
        li: [
          "<strong>Direct</strong> : just jump to the new key",
          "<strong>Pivot Chord</strong> : use a chord that lives in both keys as a bridge",
          "<strong>Common Tone</strong> : keep one note constant across the switch",
          "<strong>Chromatic</strong> : creep there a semitone at a time",
        ],
      },
    ],
    practice: [
      { drill: "Drill all four cadences (PAC, Plagal, Half, Deceptive) in the key of C, played back to back, and listen for the difference.", why: "Cadences are punctuation. Without them, every progression sounds like one long run-on sentence." },
      { drill: "Insert one secondary dominant into a familiar progression (e.g., C, D7, G in C major).", why: "One small substitution and a simple progression suddenly sounds sophisticated." },
      { drill: "Try a tritone sub: replace G7 with Db7 in a ii-V-I, and play both versions.", why: "This is the gateway drug to jazz reharmonization, with almost no theory cost." },
    ],
    tk: "Cadences are the punctuation marks of harmony. Everything in this section is fundamentally play with the listener's expectations.",
    refs: ["Piston, W. (1987). Harmony, 5th ed. Norton."],
  },

  rhythm: {
    title: "Rhythm & Meter",
    sub: "Rhythm is about WHEN a note plays. Just as important as WHICH note.",
    intro:
      "For the longest time I treated rhythm as 'just the metronome thing'. Then I recorded myself and realized half my solos were technically clean but rhythmically wobbly. Pitch is what people notice. Time is what people feel.",
    secs: [
      {
        l: "Time Signatures",
        tbl: {
          h: ["Sig", "Meaning", "Example"],
          r: [
            ["4/4", "4 quarters / bar", "90%+ of pop & rock"],
            ["3/4", "3 quarters / bar", "Waltz"],
            ["6/8", "6 eighths (2×3)", "Nothing Else Matters"],
            ["5/4", "5 beats / bar", "Take Five"],
          ],
        },
      },
      {
        l: "Note Values",
        cd: "Whole=4 beats  Half=2  Quarter=1\nEighth=1/2  Sixteenth=1/4  Triplet=3 in 2",
      },
      {
        l: "Syncopation",
        t: "The emphasis lands on the offbeats instead of the strong beats. This is the core of groove in funk, reggae, and jazz.",
      },
    ],
    practice: [
      { drill: "16th-note all-down strums on a muted chord, 60 to 90 BPM, ten minutes a day.", why: "16th-note groove is the base layer of funk, R&B, and modern pop. There's no shortcut around it." },
      { drill: "Add ghost notes on the off-beats and accents on beats 1 and 3 to that same 16th pattern.", why: "Dynamics separate alive grooves from robot grooves. Velocity is half the rhythm." },
      { drill: "Pick one funk track (Cory Wong, Nile Rodgers, anything tight) and transcribe eight bars of its strum pattern.", why: "Real-world reference outperforms abstract metronome drills every single time." },
    ],
    tk: "Time signature is how the beats are grouped; syncopation is what gives them groove. None of it matters if your time is wobbly, though. Metronome first, syncopation later.",
    refs: ["London, J. (2012). Hearing in Time. Oxford UP."],
  },

  guitar: {
    title: "Guitar Essentials",
    sub: "The non-negotiables every guitarist has to nail down.",
    intro:
      "This is the most physical section. Everything theoretical above finally meets the fretboard here. If you can play but you don't know what notes you're actually pressing, this is your starting point.",
    secs: [
      {
        l: "Tuning: E A D G B E",
        t: "The intervals between strings: P4-P4-P4-M3-P4. The G-to-B is the oddball, just a Major 3rd, and that one anomaly is why some patterns need to shift one fret when they cross that string.",
      },
      {
        l: "Essential Skills",
        li: [
          "Open Chords: C A G E D Am Em Dm",
          "Barre: E-shape, A-shape",
          "Power Chords: 1 + 5",
          "Minor Pentatonic Shape 1",
          "Hammer-on, Pull-off, Slide, Bend, Vibrato",
        ],
      },
    ],
    practice: [
      { drill: "Alternate-pick single-string 8th notes on the low E, 80 to 120 BPM, ten minutes daily for a week.", why: "Right-hand consistency is the bottleneck most intermediate players don't admit to." },
      { drill: "Drill barre chord transitions through the CAGED shapes (C-A-G-E-D), root C, at 60 BPM.", why: "CAGED transition fluency unlocks every position on the neck from a single root." },
      { drill: "Hybrid picking basic: pick plus middle plus ring across a C-Am-F-G arpeggio.", why: "Hybrid picking opens R&B, country, and pop vocabulary that's literally impossible with a flatpick alone." },
    ],
    tk: "Every fret is one semitone. Lock in open chords, barre chords, and one pentatonic shape before worrying about anything else.",
    refs: ["Leavitt, W. (1966). A Modern Method for Guitar. Berklee Press."],
  },

  caged: {
    title: "CAGED System",
    sub: "5 chord shapes that together cover the entire fretboard.",
    secs: [
      {
        l: "Concept",
        t: "Five open chord shapes (C-A-G-E-D) get barred up the neck to cover the whole fretboard. The order keeps cycling: C, A, G, E, D, back to C, on and on.",
      },
      {
        l: "Root Navigation",
        cd: "Str 6: E F F# G G# A A# B C C# D D# E\nFret:  0 1 2  3 4  5 6  7 8 9  10 11 12\n\nStr 5: A A# B C C# D D# E F F# G G# A\nFret:  0 1  2 3 4  5 6  7 8 9  10 11 12",
      },
    ],
    practice: [
      { drill: "Play C major in all 5 CAGED shapes without skipping any, at 60 BPM, ascending and descending the neck.", why: "Memorize the order once and you can navigate the whole neck from any root." },
      { drill: "Repeat the same drill for A major and G major.", why: "Patterns transpose. A key change should never mean starting from zero." },
      { drill: "Connect each CAGED shape via its root: play the root, slide to the next shape's root, continue along the string.", why: "The root is the bridge. Without it, the five shapes feel like five disconnected memorized boxes." },
    ],
    tk: "Memorize root positions on strings 6 and 5 first. That's the launchpad for every CAGED shape. Once the root is visible, the shape your hand already knows takes care of the rest.",
    refs: ["Kolb, T. (2006). The CAGED System. Hal Leonard."],
  },

  fretboard: {
    title: "Fretboard Mapping",
    sub: "Getting to know every note on the fretboard until you don't have to think.",
    secs: [
      {
        l: "Natural Notes per String",
        cd: "e1: E F   G   A   B C   D   E\nB : B C   D   E F   G   A   B\nG : G   A   B C   D   E F   G\nD : D   E F   G   A   B C   D\nA : A   B C   D   E F   G   A\nE6: E F   G   A   B C   D   E\n    0 1 2 3 4 5 6 7 8 9 10 11 12",
      },
      {
        l: "Shortcuts",
        li: [
          "String 1 = String 6 (both are E)",
          "Fret 12 = Open (one octave higher)",
          "Octave: 6 → 4 = +2 strings, +2 frets",
        ],
      },
    ],
    practice: [
      { drill: "Note Picker, All 12 notes, all strings, BPM 60 to 100, ten minutes daily.", why: "Without fretboard fluency, 'playing a song' is really 'pressing memorized positions'." },
      { drill: "Octave drill: pick a note on string 6, find its octaves on strings 4, 3, 2, and 1.", why: "Octave shapes are how pros leap across the neck without thinking." },
      { drill: "Write the note name for every chord root in a song you play often, then verify each with a tuner.", why: "Abstract notes become permanent the moment they're attached to music you actually keep playing." },
    ],
    tk: "Memorize the natural notes first (C D E F G A B). Sharps and flats are just one fret off from the natural. Five minutes a day for a year and you'll know it cold.",
    refs: ["Gambale, F. (1997). Fretboard Knowledge. Manhattan Music."],
  },

  techniques: {
    title: "Lead Techniques",
    sub: "The techniques that make a guitar sound like it's actually talking.",
    secs: [
      {
        l: "Essential",
        tbl: {
          h: ["Technique", "Effect"],
          r: [
            ["Hammer-On", "Smooth legato"],
            ["Pull-Off", "Descending legato"],
            ["Slide", "Glissando"],
            ["Bend", "Vocal quality"],
            ["Vibrato", "Living sustain"],
            ["Palm Mute", "Chunky, tight"],
            ["Tapping", "Wide intervals"],
          ],
        },
      },
      {
        l: "Bend & Vibrato",
        t: "These two are what separate guitarists more than anything else. A bend has to land dead on pitch, slightly off and the audience hears it instantly. Vibrato has to be rhythmically consistent, wobbly vibrato sounds like someone who just learned to bend yesterday.",
      },
    ],
    practice: [
      { drill: "Bend half-step, full-step, and 1.5-step on string 3 fret 7, verify each pitch with a tuner, 10 reps per bend.", why: "Bend pitch is pitch. There is no 'almost in tune' in lead playing." },
      { drill: "Vibrato to a metronome at 80 BPM, four cycles per beat.", why: "Consistent vibrato is your signature. Wobbly vibrato is the giveaway tell of a beginner." },
      { drill: "Hammer-on and pull-off drills inside the A minor pentatonic position 1, for four weeks.", why: "Legato is what makes a melodic line flow instead of sounding like Morse code." },
    ],
    tk: "Lead technique is about control and expression. Speed is a side effect of well-developed control, not the goal.",
    refs: ["Denyer, R. (1992). The Guitar Handbook. Knopf."],
  },

  ear: {
    title: "Ear Training",
    sub: "Your ears are your most important instrument.",
    intro:
      "I avoided ear training for years because it felt boring compared to learning new licks. Then I tried transcribing one solo without looking at tabs. Took me a whole afternoon for forty seconds of music. And my fretboard sense improved more in that one session than the previous month of practice.",
    secs: [
      {
        l: "4 Areas",
        tbl: {
          h: ["Area", "Method"],
          r: [
            ["Interval Recognition", "Reference songs, apps"],
            ["Chord Quality", "Play random, guess"],
            ["Scale / Mode ID", "Backing track"],
            ["Melodic Dictation", "Reproduce a phrase"],
          ],
        },
      },
      {
        l: "Daily Practice",
        li: [
          "Sing intervals before you play them on the guitar",
          "Transcribe solos by ear (not tabs)",
          "Apps: Functional Ear Trainer, EarMaster",
        ],
      },
    ],
    practice: [
      { drill: "Interval Trainer in Identify mode, All Intervals, five minutes daily, every day.", why: "Interval recognition is the foundation. Without it, every other ear skill collapses." },
      { drill: "Sing then play: pick a four-note melody from YouTube or an app, sing it back, then find it on the guitar.", why: "The ear-to-hand bridge is the most important skill almost nobody practices." },
      { drill: "Transcribe four bars of a solo by ear every week with no tab open.", why: "Output is what counts. Ear theory without transcription practice is wasted reading." },
    ],
    tk: "Relative pitch can be trained, this isn't a talent thing. The single biggest payoff: transcribing solos by ear without looking at tabs. It's brutal at first. That's the point.",
    refs: ["Karpinski, G. S. (2000). Aural Skills Acquisition. Oxford UP."],
  },

  practice: {
    title: "Practice & Mindset",
    sub: "30 minutes of focused practice beats 3 hours of noodling.",
    intro:
      "I used to brag about doing 4-hour sessions. What I actually was doing for 3 of those 4 hours was muscle-memorizing the same five licks I already knew. The breakthrough came when I started timing actual deliberate work versus comfortable noodling. Honest answer: 20-30 minutes was the max I could really focus, and that was enough.",
    secs: [
      {
        l: "Deliberate Practice",
        t: "Ericsson's research is clear: the thing that determines expertise is <strong>deliberate practice</strong>. Structured, focused work that deliberately pushes you out of your comfort zone. Raw hours aren't enough, every session needs a target.",
      },
      {
        l: "Session Structure",
        tbl: {
          h: ["Segment", "Duration"],
          r: [
            ["Warm Up", "5-10 min"],
            ["Technique", "10-15 min"],
            ["Theory", "10-15 min"],
            ["Repertoire", "10-15 min"],
            ["Cool Down", "5 min"],
          ],
        },
      },
      {
        l: "Mindset",
        li: [
          "<strong>Consistency > Intensity</strong> : 20 min / day beats 3 hours / week",
          "<strong>Slow is Fast</strong> : accuracy builds correct muscle memory",
          "<strong>Record Yourself</strong> : the most honest feedback you'll get",
          "<strong>Everything is Connected</strong> : chord = scale = mode = interval",
        ],
      },
    ],
    practice: [
      { drill: "Keep a practice diary. Write three personal weak spots and one hypothesis for each one's cause.", why: "Without awareness, drilling is just rolling dice on what improves." },
      { drill: "Record yourself playing four takes (open-chord rhythm, barre chord, pentatonic improv, full song). Save as baseline. Re-record six weeks later.", why: "A/B comparison is the only objective progress signal. Memory lies in your favor by default." },
      { drill: "Set up a 60-minute daily session split into five segments (warm-up, technique, theory, repertoire, improv). Stick to the structure even on bad days.", why: "Consistency compounds. Intensity decays. Pick the one that compounds." },
    ],
    tk: "Consistency beats intensity. Plateaus are normal, usually a sign your brain is reorganizing what you already know, not a sign you've hit a ceiling.",
    refs: [
      "Ericsson, K. A. et al. (1993). The Role of Deliberate Practice. Psych Review, 100(3).",
    ],
  },
};

/* ═══ NOTE PICKER STATE ═══ */
const PS = {
  enabled: new Set(["C", "D", "E", "F", "G", "A", "B"]),
  count: 1,
  bpm: 60,
  running: false,
  current: [],
};
let tmr = null;
function clearTmr() {
  if (tmr) {
    clearInterval(tmr);
    tmr = null;
  }
}
function getCustomPresets() {
  try {
    return JSON.parse(localStorage.getItem("gtp") || "[]");
  } catch {
    return [];
  }
}
function saveCustomPresets(a) {
  localStorage.setItem("gtp", JSON.stringify(a));
}
function pickRandom() {
  const pool = ALL_NOTES.filter((n) => PS.enabled.has(n.id));
  if (!pool.length) return;
  const cnt = Math.min(PS.count, pool.length),
    av = [...pool];
  PS.current = [];
  for (let i = 0; i < cnt; i++) {
    const x = Math.floor(Math.random() * av.length);
    PS.current.push(av.splice(x, 1)[0]);
  }
  updND();
  pulseBeat();
}
function updND() {
  const el = document.getElementById("nd");
  if (!el) return;
  if (!PS.current.length) {
    el.innerHTML = '<span class="note-empty">SELECT NOTES BELOW</span>';
    return;
  }
  el.innerHTML = PS.current
    .map(
      (n) =>
        `<div class="note-card"><div class="note-name">${n.sh}</div>${n.nat ? "" : `<div class="note-alt">${n.sh} / ${n.fl}</div>`}<div class="note-freq">${n.freq} Hz</div></div>`,
    )
    .join("");
  updPickerFB();
}
function updPickerFB() {
  const fb = document.getElementById("picker-fb");
  if (!fb || !PS.current.length) {
    if (fb) fb.innerHTML = "";
    return;
  }
  const t = PS.current.map((n) => n.sh);
  let h = "<table><thead><tr><th></th>";
  for (let f = 0; f <= 15; f++) h += `<th>${f}</th>`;
  h += "</tr></thead><tbody>";
  STRINGS.forEach((s) => {
    h += `<tr><td class="string-label">${s.name}</td>`;
    for (let f = 0; f <= 15; f++) {
      const nn = NOTE_NAMES[(s.openIdx + f) % 12];
      const hit = t.includes(nn);
      h += `<td class="${hit ? "hit" : ""}">${hit ? nn : "·"}</td>`;
    }
    h += "</tr>";
  });
  h += "</tbody></table>";
  fb.innerHTML = h;
}
function pulseBeat() {
  const el = document.getElementById("nd");
  if (el) {
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 120);
  }
  const bf = document.getElementById("bf");
  if (!bf) return;
  const ms = Math.round(60000 / PS.bpm);
  bf.style.transition = "none";
  bf.style.width = "0%";
  requestAnimationFrame(() => {
    bf.style.transition = `width ${ms}ms linear`;
    bf.style.width = "100%";
  });
}
function startTmr() {
  PS.running = true;
  updTBtn();
  pickRandom();
  tmr = setInterval(pickRandom, Math.round(60000 / PS.bpm));
}
function stopTmr() {
  PS.running = false;
  clearTmr();
  updTBtn();
  const bf = document.getElementById("bf");
  if (bf) {
    bf.style.transition = "none";
    bf.style.width = "0%";
  }
}
function updTBtn() {
  const b = document.getElementById("tbtn");
  if (!b) return;
  b.textContent = PS.running ? "⏹ Stop" : "▶ Start";
  b.classList.toggle("go", PS.running);
}
function updBpmLbl() {
  const el = document.getElementById("bv");
  if (!el) return;
  el.textContent = `${PS.bpm} BPM · ${(60 / PS.bpm).toFixed(2)}s`;
}
function setCount(n) {
  PS.count = n;
  document
    .querySelectorAll(".count-row .p-btn")
    .forEach((b, i) => b.classList.toggle("on", i === n - 1));
  if (PS.current.length) pickRandom();
}
function toggleNote(id) {
  if (PS.enabled.has(id)) PS.enabled.delete(id);
  else PS.enabled.add(id);
  const b = document.querySelector(`.note-btn[data-id="${id}"]`);
  if (b) b.classList.toggle("on", PS.enabled.has(id));
}
function setPreset(t) {
  PS.enabled.clear();
  if (t === "nat")
    ALL_NOTES.filter((n) => n.nat).forEach((n) => PS.enabled.add(n.id));
  else if (t === "all") ALL_NOTES.forEach((n) => PS.enabled.add(n.id));
  else if (t === "pent")
    ["C", "D", "E", "G", "A"].forEach((id) => PS.enabled.add(id));
  document
    .querySelectorAll(".note-btn")
    .forEach((b) => b.classList.toggle("on", PS.enabled.has(b.dataset.id)));
}
function loadCP(i) {
  const p = getCustomPresets();
  if (!p[i]) return;
  PS.enabled.clear();
  p[i].notes.forEach((id) => PS.enabled.add(id));
  document
    .querySelectorAll(".note-btn")
    .forEach((b) => b.classList.toggle("on", PS.enabled.has(b.dataset.id)));
}
function delCP(i) {
  const p = getCustomPresets();
  p.splice(i, 1);
  saveCustomPresets(p);
  renderCPs();
}
function showAddPM() {
  const c = document.getElementById("pm-container");
  if (!c || !PS.enabled.size) {
    if (!PS.enabled.size) alert("Pick at least 1 note.");
    return;
  }
  c.innerHTML = `<div class="preset-modal"><input type="text" id="pm-input" placeholder="Preset name..." maxlength="30"><button class="pm-save" onclick="savePM()">Save</button><button class="pm-cancel" onclick="document.getElementById('pm-container').innerHTML=''">Cancel</button></div>`;
  setTimeout(() => {
    const inp = document.getElementById("pm-input");
    if (inp) inp.focus();
  }, 50);
}
function savePM() {
  const inp = document.getElementById("pm-input");
  const name = (inp ? inp.value : "").trim();
  if (!name) return alert("Enter a name.");
  const p = getCustomPresets();
  p.push({ name, notes: [...PS.enabled] });
  saveCustomPresets(p);
  document.getElementById("pm-container").innerHTML = "";
  renderCPs();
}
function renderCPs() {
  const c = document.getElementById("cp-list");
  if (!c) return;
  const p = getCustomPresets();
  c.innerHTML = p
    .map(
      (x, i) =>
        `<button class="custom-preset-chip" onclick="loadCP(${i})" title="${x.notes.join(", ")}">${x.name} <span class="chip-del" onclick="event.stopPropagation();delCP(${i})">×</span></button>`,
    )
    .join("");
}
function onBpmChange(v) {
  PS.bpm = +v;
  updBpmLbl();
  if (PS.running) {
    stopTmr();
    startTmr();
  }
}

/* ═══ INTERVAL TRAINER ═══ */
const IT = {
  mode: "identify",
  score: 0,
  total: 0,
  streak: 0,
  root: 0,
  target: 0,
  answer: 0,
  answered: false,
  difficulty: "all",
};
function itNewQ() {
  IT.answered = false;
  const maxST = IT.difficulty === "easy" ? 7 : 12;
  IT.root = Math.floor(Math.random() * 12);
  IT.answer = Math.floor(Math.random() * (maxST + 1));
  IT.target = (IT.root + IT.answer) % 12;
  const disp = document.getElementById("it-display");
  if (!disp) return;
  if (IT.mode === "identify") {
    disp.innerHTML = `<span class="quiz-note">${NOTE_NAMES[IT.root]}</span><span class="quiz-arrow">→</span><span class="quiz-note">${NOTE_NAMES[IT.target]}</span>`;
    renderITChoicesInterval();
  } else {
    const iv = INTERVAL_LIST[IT.answer];
    disp.innerHTML = `<span class="quiz-note">${NOTE_NAMES[IT.root]}</span><span class="quiz-arrow">+</span><span class="quiz-interval-show">${iv.sh}</span><span class="quiz-arrow">= ?</span>`;
    renderITChoicesNote();
  }
  disp.className = "quiz-display";
}
function renderITChoicesInterval() {
  const el = document.getElementById("it-choices");
  if (!el) return;
  const maxST = IT.difficulty === "easy" ? 7 : 12;
  const options = INTERVAL_LIST.filter((x) => x.st <= maxST);
  el.innerHTML = options
    .map(
      (iv) =>
        `<button class="quiz-btn" onclick="itCheck(${iv.st})">${iv.sh} <span style="font-size:9px;opacity:.6;display:block">${iv.name}</span></button>`,
    )
    .join("");
}
function renderITChoicesNote() {
  const el = document.getElementById("it-choices");
  if (!el) return;
  el.innerHTML = NOTE_NAMES.map(
    (n, i) => `<button class="quiz-btn" onclick="itCheck(${i})">${n}</button>`,
  ).join("");
}
function itCheck(val) {
  if (IT.answered) return;
  IT.answered = true;
  IT.total++;
  const disp = document.getElementById("it-display");
  let correct;
  if (IT.mode === "identify") {
    correct = val === IT.answer;
  } else {
    correct = val === IT.target;
  }
  if (correct) {
    IT.score++;
    IT.streak++;
    disp.classList.add("correct");
  } else {
    IT.streak = 0;
    disp.classList.add("wrong");
  }
  // highlight buttons
  const btns = document.querySelectorAll("#it-choices .quiz-btn");
  btns.forEach((b) => {
    b.setAttribute("disabled", "true");
  });
  if (IT.mode === "identify") {
    btns.forEach((b) => {
      const sv = parseInt(b.getAttribute("onclick").match(/\d+/)[0]);
      if (sv === IT.answer) b.classList.add("correct-answer");
      else if (sv === val && !correct) b.classList.add("wrong-answer");
    });
  } else {
    btns.forEach((b) => {
      const sv = parseInt(b.getAttribute("onclick").match(/\d+/)[0]);
      if (sv === IT.target) b.classList.add("correct-answer");
      else if (sv === val && !correct) b.classList.add("wrong-answer");
    });
  }
  updITScore();
  setTimeout(itNewQ, correct ? 800 : 1500);
}
function updITScore() {
  const el = document.getElementById("it-score");
  if (!el) return;
  const pct = IT.total ? Math.round((IT.score / IT.total) * 100) : 0;
  el.innerHTML = `<span class="score-label">Score:</span> <span class="score-val">${IT.score}/${IT.total}</span> <span class="score-label">(${pct}%)</span> <span class="score-label" style="margin-left:auto">Streak:</span> <span class="streak">${IT.streak}</span>`;
}
function itSetMode(m) {
  IT.mode = m;
  IT.score = 0;
  IT.total = 0;
  IT.streak = 0;
  document
    .querySelectorAll("#it-mode-row .p-btn")
    .forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
  itNewQ();
  updITScore();
}
function itSetDiff(d) {
  IT.difficulty = d;
  IT.score = 0;
  IT.total = 0;
  IT.streak = 0;
  document
    .querySelectorAll("#it-diff-row .p-btn")
    .forEach((b) => b.classList.toggle("on", b.dataset.diff === d));
  itNewQ();
  updITScore();
}

/* ═══ SCALE VISUALIZER ═══ */
const SV = { root: 0, scale: "major", position: "all" };
function svUpdate() {
  const sc = SCALE_TYPES[SV.scale];
  if (!sc) return;
  const highlights = [];
  const posRange = SV.position === "all" ? [0, 15] : svPosRange(SV.position);
  STRINGS.forEach((s, si) => {
    for (let f = posRange[0]; f <= posRange[1]; f++) {
      const noteIdx = (s.openIdx + f) % 12;
      const rel = (noteIdx - SV.root + 12) % 12;
      const degIdx = sc.intervals.indexOf(rel);
      if (degIdx !== -1) {
        const label = sc.degrees[degIdx];
        const cls =
          degIdx === 0
            ? "root"
            : label.includes("3")
              ? "third"
              : label.includes("5")
                ? "fifth"
                : label.includes("7")
                  ? "seventh"
                  : "other";
        highlights.push({ stringIdx: si, fret: f, label, colorClass: cls });
      }
    }
  });
  renderFB("sv-fb", highlights);
  const info = document.getElementById("sv-info");
  if (info) {
    info.innerHTML = `<strong>${NOTE_NAMES[SV.root]} ${sc.name}</strong> : ${sc.degrees.map((d, i) => NOTE_NAMES[(SV.root + sc.intervals[i]) % 12] + " (" + d + ")").join(" · ")}`;
  }
}
function svPosRange(pos) {
  // 5 CAGED positions based on root on string 6
  const rootFret6 = (SV.root - 4 + 12) % 12; // E=0, so root fret on str 6
  const offsets = [
    [0, 3],
    [2, 6],
    [4, 8],
    [7, 10],
    [9, 12],
  ];
  const p = parseInt(pos) - 1;
  const o = offsets[p] || [0, 3];
  let start = rootFret6 + o[0],
    end = rootFret6 + o[1];
  if (start > 15) start -= 12;
  if (end > 15) end = 15;
  if (start < 0) start = 0;
  return [start, end];
}
function svSetRoot(v) {
  SV.root = parseInt(v);
  svUpdate();
}
function svSetScale(v) {
  SV.scale = v;
  svUpdate();
}
function svSetPos(v) {
  SV.position = v;
  document
    .querySelectorAll("#sv-pos-row .p-btn")
    .forEach((b) => b.classList.toggle("on", b.dataset.pos === v));
  svUpdate();
}

/* ═══ CHORD TONE HIGHLIGHTER ═══ */
const CH = { root: 0, chord: "major" };
function chUpdate() {
  const ct = CHORD_TYPES[CH.chord];
  if (!ct) return;
  const highlights = [];
  STRINGS.forEach((s, si) => {
    for (let f = 0; f <= 15; f++) {
      const noteIdx = (s.openIdx + f) % 12;
      const rel = (noteIdx - CH.root + 12) % 12;
      const toneIdx = ct.tones.indexOf(rel);
      if (toneIdx !== -1) {
        highlights.push({
          stringIdx: si,
          fret: f,
          label: ct.labels[toneIdx],
          colorClass: ct.colors[toneIdx],
        });
      }
    }
  });
  renderFB("ch-fb", highlights);
  const info = document.getElementById("ch-info");
  if (info) {
    info.innerHTML = `<strong>${NOTE_NAMES[CH.root]} ${ct.name}</strong> : ${ct.tones.map((t, i) => NOTE_NAMES[(CH.root + t) % 12] + " (" + ct.labels[i] + ")").join(" · ")}`;
  }
}
function chSetRoot(v) {
  CH.root = parseInt(v);
  chUpdate();
}
function chSetChord(v) {
  CH.chord = v;
  chUpdate();
}

/* ═══ RENDER ═══ */
const cp = document.getElementById("cp");

/* Build the inner HTML for one prose node. Shared by map-mode render() and essay mode. */
function relatedChipsHTML(id) {
  if (id === "root" || !adj[id]) return "";
  /* Filter out root (always connected, not informative) and any id we don't
     have content for. Sort by L1 first, then L2, then alphabetically by title. */
  const rel = [...adj[id]].filter((x) => x !== "root" && C[x]);
  if (!rel.length) return "";
  rel.sort((a, b) => {
    const la = (nmap[a] || {}).lv || 9,
      lb = (nmap[b] || {}).lv || 9;
    if (la !== lb) return la - lb;
    return (C[a].title || "").localeCompare(C[b].title || "");
  });
  const chips = rel
    .map((rid) => {
      const t = (C[rid].title || "").replace(/\n/g, " ");
      return `<button class="related-chip" onclick="selectNode('${rid}')" title="Jump to ${t}">${t}</button>`;
    })
    .join("");
  return `<div class="related-block"><span class="related-label">Connected with</span>${chips}</div>`;
}

function buildNodeHTML(id, opts) {
  opts = opts || {};
  const d = C[id];
  if (!d) return "";
  let h = `<div class="content-title">${d.title}</div><div class="content-sub">${d.sub}</div>`;
  if (!opts.noAnim) h += relatedChipsHTML(id);
  if (d.intro) h += `<p class="content-intro">${d.intro}</p>`;
  d.secs.forEach((s, i) => {
    h += `<div class="sec"${opts.noAnim ? "" : ` style="animation-delay:${i * 0.04}s"`}><div class="sec-label">${s.l}</div>`;
    if (s.t) h += `<p class="sec-text">${s.t}</p>`;
    if (s.li)
      h += `<ul class="sec-list">${s.li.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    if (s.tbl) {
      h += `<div class="table-wrap"><table class="sec-table"><thead><tr>${s.tbl.h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${s.tbl.r.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    if (s.cd) h += `<pre class="sec-code">${s.cd}</pre>`;
    h += `</div>`;
  });
  let extraDelay = 0;
  if (d.practice && d.practice.length) {
    const pDelay = d.secs.length * 0.04;
    h += `<div class="practice"${opts.noAnim ? "" : ` style="animation-delay:${pDelay}s"`}><div class="practice-label">Recommended Practice</div><ul class="practice-list">${d.practice.map((p) => `<li class="practice-drill">${p.drill}<span class="practice-why">${p.why}</span></li>`).join("")}</ul></div>`;
    extraDelay = 1;
  }
  if (d.tk)
    h += `<div class="takeaway"${opts.noAnim ? "" : ` style="animation-delay:${(d.secs.length + extraDelay) * 0.04}s"`}><div class="takeaway-label">Key Takeaway</div><p class="takeaway-text">${d.tk}</p></div>`;
  if (d.refs)
    h += `<div class="ref-block"${opts.noAnim ? "" : ` style="animation-delay:${(d.secs.length + extraDelay + 1) * 0.04}s"`}><div class="ref-label">References</div><ul class="ref-list">${d.refs.map((r) => `<li>${r}</li>`).join("")}</ul></div>`;
  return h;
}

function render(id) {
  clearTmr();
  PS.running = false;
  if (id === "picker") {
    renderPicker();
    return;
  }
  if (id === "intrainer") {
    renderIntervalTrainer();
    return;
  }
  if (id === "scaleviz") {
    renderScaleViz();
    return;
  }
  if (id === "chordhl") {
    renderChordHL();
    return;
  }
  if (id === "chordlib") {
    renderChordLib();
    return;
  }
  if (id === "tools") {
    renderToolsLanding();
    return;
  }
  const d = C[id];
  if (!d) return;
  cp.innerHTML = `<div class="content-inner">${buildNodeHTML(id)}</div>`;
  cp.scrollTop = 0;
}

/* ═══ ESSAY MODE ═══ */
/* Linear reading order: root first, then L1 prose in sequence, with guitar's
   children inserted right after the guitar node. */
const ESSAY_ORDER = [
  "root",
  "sound",
  "notes",
  "intervals",
  "scales",
  "math",
  "chords",
  "family",
  "modes",
  "harmony",
  "rhythm",
  "guitar",
  "caged",
  "fretboard",
  "techniques",
  "ear",
  "practice",
];
let viewMode =
  localStorage.getItem("guitar-view-mode") === "essay" ? "essay" : "map";

function renderEssay() {
  clearTmr();
  PS.running = false;
  let h = '<div class="essay-doc">';
  ESSAY_ORDER.forEach((id, idx) => {
    if (!C[id]) return;
    const isChild = ["caged", "fretboard", "techniques"].includes(id);
    h += `<article class="essay-section${isChild ? " essay-child" : ""}" id="essay-${id}">${buildNodeHTML(id, { noAnim: true })}</article>`;
    if (idx < ESSAY_ORDER.length - 1) h += '<div class="essay-divider"></div>';
  });
  // Note: interactive tools have no prose equivalent, they live in Mind Map mode only.
  h += `<div class="essay-divider"></div><article class="essay-section"><div class="content-title">Interactive Tools</div><p class="content-intro">Note Picker, Interval Trainer, Scale Visualizer, and Chord Tone Highlighter are interactive, so they only live in Mind Map mode. <button class="essay-inline-link" onclick="setViewMode('map');selectNode('tools')">Open Practice Tools in Mind Map →</button></p></article>`;
  h += "</div>";
  cp.innerHTML = h;
  cp.scrollTop = 0;
}

function setViewMode(m) {
  viewMode = m;
  localStorage.setItem("guitar-view-mode", m);
  document.body.classList.toggle("essay-mode", m === "essay");
  const b = document.getElementById("view-toggle");
  if (b) {
    b.textContent = m === "essay" ? "🗺 Mind Map" : "📄 Essay";
    b.title =
      m === "essay"
        ? "Switch back to the mind map"
        : "Read straight through as an essay";
  }
  if (m === "essay") renderEssay();
  else render(selectedId || "root");
}

function renderToolsLanding() {
  cp.innerHTML = `<div class="tool-wrap">
    <div class="tool-title">Practice Tools</div>
    <div class="tool-sub">Five interactive tools for building real guitarist skill: fretboard mapping, interval recognition, scale visualization, chord tone awareness, and a voicing library with inversion playback. Click a sub-node in the mind map to open one.</div>
    <div class="sec"><div class="sec-label">Available Tools</div>
    <ul class="sec-list">
      <li><strong>Note Picker</strong> : random note generator for drilling fretboard memory</li>
      <li><strong>Interval Trainer</strong> : interactive quiz for recognizing the gap between two notes</li>
      <li><strong>Scale Visualizer</strong> : see any scale pattern across the fretboard, filter by CAGED position</li>
      <li><strong>Chord Tone Highlighter</strong> : see chord tones (Root, 3rd, 5th, 7th) across the whole fretboard, colored</li>
      <li><strong>Chord Voicing Library</strong> : browse triad, drop-2 7th, and shell voicings across every inversion, with audio playback</li>
    </ul></div>
  </div>`;
  cp.scrollTop = 0;
}

function renderPicker() {
  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Note Picker</div>
<div class="tool-sub">Random note generator for drilling fretboard mapping.</div>
<div id="nd" class="note-display"><span class="note-empty">SELECT NOTES BELOW</span></div>
<div class="beat-bar"><div id="bf" class="beat-fill"></div></div>
<div id="picker-fb" class="fretboard-mini"></div>
<div class="ctrl-row">
  <button class="p-btn" onclick="pickRandom()">↻ Random</button>
  <button class="p-btn t-btn" id="tbtn" onclick="PS.running?stopTmr():startTmr()">▶ Start</button>
  <div class="bpm-row"><span class="bpm-label">BPM</span><input type="range" min="20" max="240" value="${PS.bpm}" oninput="onBpmChange(this.value)"><span class="bpm-value" id="bv">${PS.bpm} BPM</span></div>
</div>
<div class="sub-label">Notes per beat</div>
<div class="count-row">${[1, 2, 3, 4].map((n) => `<button class="p-btn${PS.count === n ? " on" : ""}" onclick="setCount(${n})">${n}</button>`).join("")}</div>
<div class="sub-label">Active notes</div>
<div class="notes-grid">${ALL_NOTES.map((n) => `<button class="note-btn${n.nat ? " nat" : ""} ${PS.enabled.has(n.id) ? "on" : ""}" data-id="${n.id}" onclick="toggleNote('${n.id}')">${n.nat ? n.sh : `${n.sh}<br><span style="font-size:9px;opacity:.5">${n.fl}</span>`}</button>`).join("")}</div>
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
  cp.scrollTop = 0;
  if (PS.current.length) updND();
  updTBtn();
  updBpmLbl();
  renderCPs();
}

function renderIntervalTrainer() {
  IT.score = 0;
  IT.total = 0;
  IT.streak = 0;
  const rootOpts = NOTE_NAMES.map(
    (n, i) => `<option value="${i}">${n}</option>`,
  ).join("");
  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Interval Trainer</div>
<div class="tool-sub">Train your ability to recognize intervals. Identify mode: see two notes, name the interval. Build mode: see a root + an interval, name the target note.</div>
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
  cp.scrollTop = 0;
  itNewQ();
  updITScore();
}

function renderScaleViz() {
  const rootOpts = NOTE_NAMES.map(
    (n, i) =>
      `<option value="${i}"${SV.root === i ? " selected" : ""}>${n}</option>`,
  ).join("");
  const scaleOpts = Object.entries(SCALE_TYPES)
    .map(
      ([k, v]) =>
        `<option value="${k}"${SV.scale === k ? " selected" : ""}>${v.name}</option>`,
    )
    .join("");
  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Scale Visualizer</div>
<div class="tool-sub">Pick a root note and scale type to see the pattern across the whole fretboard. Filter by CAGED position.</div>
<div class="tool-row">
  <div><div class="sub-label">Root Note</div><select class="tool-select" onchange="svSetRoot(this.value)">${rootOpts}</select></div>
  <div><div class="sub-label">Scale Type</div><select class="tool-select" onchange="svSetScale(this.value)">${scaleOpts}</select></div>
</div>
<div class="sub-label">Position</div>
<div class="tool-row" id="sv-pos-row">
  <button class="p-btn on" data-pos="all" onclick="svSetPos('all')">All</button>
  ${[1, 2, 3, 4, 5].map((p) => `<button class="p-btn" data-pos="${p}" onclick="svSetPos('${p}')">Pos ${p}</button>`).join("")}
</div>
${buildLegend([
  { cls: "root", name: "Root (1)" },
  { cls: "third", name: "3rd" },
  { cls: "fifth", name: "5th" },
  { cls: "seventh", name: "7th" },
  { cls: "other", name: "Other" },
])}
<div class="fb-board" id="sv-fb"></div>
<div class="tool-info" id="sv-info"></div>
</div>`;
  cp.scrollTop = 0;
  svUpdate();
}

function renderChordHL() {
  const rootOpts = NOTE_NAMES.map(
    (n, i) =>
      `<option value="${i}"${CH.root === i ? " selected" : ""}>${n}</option>`,
  ).join("");
  const chordOpts = Object.entries(CHORD_TYPES)
    .map(
      ([k, v]) =>
        `<option value="${k}"${CH.chord === k ? " selected" : ""}>${v.name}</option>`,
    )
    .join("");
  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Chord Tone Highlighter</div>
<div class="tool-sub">See where each chord tone (Root, 3rd, 5th, 7th) sits across the whole fretboard. Helps you understand why chord shapes look the way they do.</div>
<div class="tool-row">
  <div><div class="sub-label">Root Note</div><select class="tool-select" onchange="chSetRoot(this.value)">${rootOpts}</select></div>
  <div><div class="sub-label">Chord Type</div><select class="tool-select" onchange="chSetChord(this.value)">${chordOpts}</select></div>
</div>
${buildLegend([
  { cls: "root", name: "Root (R)" },
  { cls: "third", name: "3rd" },
  { cls: "fifth", name: "5th" },
  { cls: "seventh", name: "7th" },
  { cls: "other", name: "Other (9, sus)" },
])}
<div class="fb-board" id="ch-fb"></div>
<div class="tool-info" id="ch-info"></div>
</div>`;
  cp.scrollTop = 0;
  chUpdate();
}

/* ═══ CHORD VOICING LIBRARY + INVERSION EXPLORER ═══
   Renders playable voicings across string sets: triads (3 strings),
   drop-2 7ths (4 strings), and shell 7ths (3 strings with optional skip).
   Each voicing is generated by placing pitch classes on the requested
   string set so each successive note is higher in MIDI than the previous.
   Includes a tiny Web Audio synth so the user can hear the arpeggio. */

// MIDI for each open string (stringIdx 0 = high E, 5 = low E)
const OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];

function fretForPcAbove(stringIdx, targetPc, minMidi) {
  const openMidi = OPEN_STRING_MIDI[stringIdx];
  let fret = ((targetPc - (openMidi % 12)) + 12) % 12;
  let midi = openMidi + fret;
  while (minMidi !== null && minMidi !== undefined && midi <= minMidi) {
    fret += 12;
    midi += 12;
  }
  if (fret > 17) return null;
  return { fret, midi };
}

// Place a sequence of pitch classes onto a string set so each note is
// strictly higher than the previous. Returns highlights for renderFB.
function placeVoicing(notesPc, stringSet, labels, colors) {
  const positions = [];
  let prevMidi = -1;
  for (let i = 0; i < notesPc.length; i++) {
    const found = fretForPcAbove(stringSet[i], notesPc[i], prevMidi);
    if (!found) return null;
    positions.push({
      stringIdx: stringSet[i],
      fret: found.fret,
      label: labels[i],
      colorClass: colors[i],
      midi: found.midi,
    });
    prevMidi = found.midi;
  }
  // Reject silly stretches
  const fretted = positions.map((p) => p.fret).filter((f) => f > 0);
  if (fretted.length > 1) {
    const span = Math.max(...fretted) - Math.min(...fretted);
    if (span > 6) return null;
  }
  return positions;
}

function rotateForInversion(tones, labels, colors, inv) {
  const n = tones.length;
  const rT = [], rL = [], rC = [];
  for (let i = 0; i < n; i++) {
    const idx = (inv + i) % n;
    rT.push(tones[idx]);
    rL.push(labels[idx]);
    rC.push(colors[idx]);
  }
  return { tones: rT, labels: rL, colors: rC };
}

// Drop-2: take the closed voicing (4 notes low→high), drop the
// 2nd-from-top down an octave so it becomes the new bass.
function applyDrop2(arr) {
  if (arr.length !== 4) return arr.slice();
  return [arr[2], arr[0], arr[1], arr[3]];
}

const VOICING_FAMILIES = {
  "triad-123": { name: "Triad · top 3 strings (1-2-3)", strings: [2, 1, 0], type: "triad" },
  "triad-234": { name: "Triad · mid 3 strings (2-3-4)", strings: [3, 2, 1], type: "triad" },
  "triad-345": { name: "Triad · inner 3 strings (3-4-5)", strings: [4, 3, 2], type: "triad" },
  "triad-456": { name: "Triad · low 3 strings (4-5-6)", strings: [5, 4, 3], type: "triad" },
  "drop2-1234": { name: "Drop-2 · top 4 strings (1-2-3-4)", strings: [3, 2, 1, 0], type: "drop2" },
  "drop2-2345": { name: "Drop-2 · mid 4 strings (2-3-4-5)", strings: [4, 3, 2, 1], type: "drop2" },
  "drop2-3456": { name: "Drop-2 · low 4 strings (3-4-5-6)", strings: [5, 4, 3, 2], type: "drop2" },
  "shell-6": { name: "Shell · bass on string 6", strings: [5, 3, 2], type: "shell-6" },
  "shell-5": { name: "Shell · bass on string 5", strings: [4, 3, 2], type: "shell-5" },
};

const DROP2_BASS_LABELS = ["5 in bass", "♭7/7 in bass", "Root in bass", "3rd in bass"];
const TRIAD_INV_LABELS = ["Root position", "1st inversion", "2nd inversion"];

function generateVoicings(rootPc, chordKey, famKey) {
  const fam = VOICING_FAMILIES[famKey];
  const chord = CHORD_TYPES[chordKey];
  if (!fam || !chord) return [];
  const tonesAbs = chord.tones.slice(0, 4).map((t) => (rootPc + t) % 12);
  const labels = chord.labels.slice(0, 4);
  const colors = chord.colors.slice(0, 4);
  const isSeventh = chord.tones.length === 4;
  const out = [];

  if (fam.type === "triad") {
    if (chord.tones.length < 3) return [];
    const t3 = tonesAbs.slice(0, 3);
    const l3 = labels.slice(0, 3);
    const c3 = colors.slice(0, 3);
    for (let inv = 0; inv < 3; inv++) {
      const rot = rotateForInversion(t3, l3, c3, inv);
      const pos = placeVoicing(rot.tones, fam.strings, rot.labels, rot.colors);
      if (pos) out.push({ invLabel: TRIAD_INV_LABELS[inv], positions: pos });
    }
  } else if (fam.type === "drop2") {
    if (!isSeventh) return [];
    for (let inv = 0; inv < 4; inv++) {
      const rot = rotateForInversion(tonesAbs, labels, colors, inv);
      const dT = applyDrop2(rot.tones);
      const dL = applyDrop2(rot.labels);
      const dC = applyDrop2(rot.colors);
      const pos = placeVoicing(dT, fam.strings, dL, dC);
      if (pos) out.push({ invLabel: DROP2_BASS_LABELS[inv], positions: pos });
    }
  } else if (fam.type === "shell-6" || fam.type === "shell-5") {
    if (!isSeventh) return [];
    // Shell = R + 3 + 7 (skip 5). Two common arrangements per shell family.
    const r = tonesAbs[0], third = tonesAbs[1], sev = tonesAbs[3];
    const arrangements = fam.type === "shell-6"
      ? [
          { name: "R-♭7/7-3 (E-shape)", tones: [r, sev, third], labs: [labels[0], labels[3], labels[1]], cols: [colors[0], colors[3], colors[1]] },
          { name: "R-3-♭7/7 (E-shape alt)", tones: [r, third, sev], labs: [labels[0], labels[1], labels[3]], cols: [colors[0], colors[1], colors[3]] },
        ]
      : [
          { name: "R-3-♭7/7 (A-shape)", tones: [r, third, sev], labs: [labels[0], labels[1], labels[3]], cols: [colors[0], colors[1], colors[3]] },
          { name: "R-♭7/7-3 (A-shape alt)", tones: [r, sev, third], labs: [labels[0], labels[3], labels[1]], cols: [colors[0], colors[3], colors[1]] },
        ];
    arrangements.forEach((a) => {
      const pos = placeVoicing(a.tones, fam.strings, a.labs, a.cols);
      if (pos) out.push({ invLabel: a.name, positions: pos });
    });
  }
  return out;
}

/* Web Audio plucked-string synth — single AudioContext, two oscillators
   per note (triangle + sine octave), envelope, lowpass for warmth.
   Arpeggiates low→high to mimic a strum. */
let CV_AC = null;
function cvAudioCtx() {
  if (!CV_AC) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    CV_AC = new Ctx();
  }
  return CV_AC;
}
function cvPlayNote(ac, midi, when, dur) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  o1.type = "triangle";
  o2.type = "sine";
  o1.frequency.value = freq;
  o2.frequency.value = freq * 2;
  const g = ac.createGain();
  const og = ac.createGain();
  og.gain.value = 0.35;
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 2400;
  f.Q.value = 0.7;
  o1.connect(f);
  o2.connect(og);
  og.connect(f);
  f.connect(g);
  g.connect(ac.destination);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(0.16, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o1.start(when);
  o2.start(when);
  o1.stop(when + dur + 0.05);
  o2.stop(when + dur + 0.05);
}
function cvPlayVoicing(positions) {
  const ac = cvAudioCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  const sorted = [...positions].sort((a, b) => a.midi - b.midi);
  const stagger = 0.055;
  const tail = 1.6;
  const t = ac.currentTime + 0.04;
  sorted.forEach((p, i) => cvPlayNote(ac, p.midi, t + i * stagger, tail));
}

const CV = { root: 0, chord: "maj7", fam: "drop2-1234", activeIdx: 0 };

function cvChordSymbol(rootPc, chordKey) {
  const suffix = {
    major: "", minor: "m", dim: "°", aug: "+",
    maj7: "maj7", dom7: "7", min7: "m7", hdim7: "ø", dim7: "°7",
    sus4: "sus4", sus2: "sus2",
    dom9: "9", add9: "add9", min9: "m9",
  }[chordKey] || "";
  return NOTE_NAMES[rootPc] + suffix;
}

function renderChordLib() {
  const rootOpts = NOTE_NAMES.map(
    (n, i) => `<option value="${i}"${CV.root === i ? " selected" : ""}>${n}</option>`,
  ).join("");
  const chordOpts = Object.entries(CHORD_TYPES)
    .map(([k, v]) => `<option value="${k}"${CV.chord === k ? " selected" : ""}>${v.name}</option>`)
    .join("");
  const chord = CHORD_TYPES[CV.chord];
  const isSeventh = chord && chord.tones.length === 4;

  // Filter family list to what's applicable for this chord type
  const famKeys = Object.keys(VOICING_FAMILIES).filter((k) => {
    const f = VOICING_FAMILIES[k];
    if (f.type === "triad") return true;
    return isSeventh; // drop2 + shell only for 7ths
  });
  // Auto-correct family if current one isn't applicable
  if (!famKeys.includes(CV.fam)) CV.fam = famKeys[0];

  const famTabs = famKeys
    .map((k) => `<button class="cv-tab${CV.fam === k ? " on" : ""}" onclick="cvSetFam('${k}')">${VOICING_FAMILIES[k].name}</button>`)
    .join("");

  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Chord Voicing Library</div>
<div class="tool-sub">Browse triad voicings, drop-2 seventh chord voicings, and shell voicings across every inversion. Click an inversion card to load it on the main fretboard, or hit ▶ to hear it arpeggiated low to high.</div>
<div class="tool-row">
  <div><div class="sub-label">Root</div><select class="tool-select" onchange="cvSetRoot(this.value)">${rootOpts}</select></div>
  <div><div class="sub-label">Chord Type</div><select class="tool-select" onchange="cvSetChord(this.value)">${chordOpts}</select></div>
</div>
<div class="sub-label">Voicing Family</div>
<div class="cv-fam-row">${famTabs}</div>
${buildLegend([
  { cls: "root", name: "Root (R)" },
  { cls: "third", name: "3rd" },
  { cls: "fifth", name: "5th" },
  { cls: "seventh", name: "7th" },
  { cls: "other", name: "Other" },
])}
<div class="fb-board" id="cv-fb"></div>
<div class="cv-info" id="cv-info"></div>
<div class="sub-label">Inversions / Arrangements</div>
<div class="cv-inv-row" id="cv-inv-row"></div>
</div>`;
  cp.scrollTop = 0;
  cvUpdate();
}

function cvUpdate() {
  const voicings = generateVoicings(CV.root, CV.chord, CV.fam);
  const fb = document.getElementById("cv-fb");
  const info = document.getElementById("cv-info");
  const row = document.getElementById("cv-inv-row");
  if (!voicings.length) {
    if (fb) fb.innerHTML = '<div class="cv-empty">No voicings available for this combination. Try a 7th chord, or pick a triad family.</div>';
    if (info) info.innerHTML = "";
    if (row) row.innerHTML = "";
    return;
  }
  if (CV.activeIdx >= voicings.length) CV.activeIdx = 0;

  // Render thumbnail row
  row.innerHTML = voicings
    .map((v, i) => `<button class="cv-inv-card${CV.activeIdx === i ? " on" : ""}" onclick="cvSetInv(${i})"><div class="cv-inv-label">${v.invLabel}</div><div class="cv-inv-mini" id="cv-mini-${i}"></div></button>`)
    .join("");
  voicings.forEach((v, i) => renderFBMini("cv-mini-" + i, v.positions));

  // Main fretboard
  const active = voicings[CV.activeIdx];
  renderFB("cv-fb", active.positions, 15);

  // Info panel: chord symbol, note breakdown, fret range, play button
  const noteList = active.positions
    .map((p) => `<span class="cv-note ${p.colorClass}">${p.label} = ${NOTE_NAMES[p.midi % 12]}</span>`)
    .join("");
  const frets = active.positions.map((p) => p.fret);
  const minF = Math.min(...frets), maxF = Math.max(...frets);
  const fretInfo = minF === maxF
    ? (minF === 0 ? "all open strings" : `fret ${minF}`)
    : `frets ${minF}-${maxF}`;
  info.innerHTML = `<div class="cv-info-head"><span class="cv-chord-sym">${cvChordSymbol(CV.root, CV.chord)}</span> <span class="cv-inv-tag">${active.invLabel}</span><button class="cv-play-btn" onclick="cvPlayActive()">▶ Play</button></div>
<div class="cv-info-notes">${noteList}</div>
<div class="cv-info-frets">${fretInfo}</div>`;
}

function renderFBMini(containerId, positions) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const frets = positions.map((p) => p.fret);
  const minF = Math.max(0, Math.min(...frets) - 1);
  const maxF = Math.min(17, Math.max(...frets) + 1);
  const hmap = {};
  positions.forEach((p) => { hmap[`${p.stringIdx}-${p.fret}`] = p; });
  let html = '<table class="cv-mini-tbl"><tbody>';
  for (let si = 0; si < 6; si++) {
    html += "<tr>";
    for (let f = minF; f <= maxF; f++) {
      const h = hmap[`${si}-${f}`];
      html += h
        ? `<td><span class="cv-mini-dot ${h.colorClass}">${h.label}</span></td>`
        : "<td></td>";
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  if (minF > 0) html += `<div class="cv-mini-fret">fr ${minF}</div>`;
  el.innerHTML = html;
}

function cvSetRoot(v) { CV.root = +v; CV.activeIdx = 0; renderChordLib(); }
function cvSetChord(v) { CV.chord = v; CV.activeIdx = 0; renderChordLib(); }
function cvSetFam(k) { CV.fam = k; CV.activeIdx = 0; renderChordLib(); }
function cvSetInv(i) { CV.activeIdx = i; cvUpdate(); }
function cvPlayActive() {
  const voicings = generateVoicings(CV.root, CV.chord, CV.fam);
  if (voicings[CV.activeIdx]) cvPlayVoicing(voicings[CV.activeIdx].positions);
}

/* ═══ MIND MAP ═══
   GRINDE Grouping by category:
   found  = Foundation (violet): physics + the 12-note system
   blocks = Building Blocks (blue): intervals, scales, scale math
   harm   = Harmony (emerald): chords, diatonic family, modes, advanced
   perf   = Performance (amber): rhythm, the fretboard, techniques
   mast   = Mastery (pink): ear training, practice mindset
   sp     = tool node (extra outlined style)
*/
const NODES = [
  {
    id: "root",
    lab: "Music Theory\nfor Guitar",
    emoji: "🎼",
    cat: "root",
    lv: 0,
    sp: false,
  },
  // Foundation (violet)
  {
    id: "sound",
    lab: "Sound &\nAcoustics",
    emoji: "🔊",
    cat: "found",
    lv: 1,
    sp: false,
  },
  {
    id: "notes",
    lab: "Notes &\nTuning",
    emoji: "🎶",
    cat: "found",
    lv: 1,
    sp: false,
  },
  // Building Blocks (blue)
  {
    id: "intervals",
    lab: "Intervals",
    emoji: "📐",
    cat: "blocks",
    lv: 1,
    sp: false,
  },
  { id: "scales", lab: "Scales", emoji: "🎚️", cat: "blocks", lv: 1, sp: false },
  {
    id: "math",
    lab: "Scale\nMath",
    emoji: "🧮",
    cat: "blocks",
    lv: 1,
    sp: false,
  },
  // Harmony (emerald)
  {
    id: "chords",
    lab: "Chord\nConstruction",
    emoji: "🎹",
    cat: "harm",
    lv: 1,
    sp: false,
  },
  {
    id: "family",
    lab: "Diatonic\nHarmony",
    emoji: "🏛️",
    cat: "harm",
    lv: 1,
    sp: false,
  },
  {
    id: "modes",
    lab: "The 7\nModes",
    emoji: "🌈",
    cat: "harm",
    lv: 1,
    sp: false,
  },
  {
    id: "harmony",
    lab: "Advanced\nHarmony",
    emoji: "🪄",
    cat: "harm",
    lv: 1,
    sp: false,
  },
  // Performance (amber)
  {
    id: "rhythm",
    lab: "Rhythm\n& Meter",
    emoji: "🥁",
    cat: "perf",
    lv: 1,
    sp: false,
  },
  {
    id: "guitar",
    lab: "Guitar\nEssentials",
    emoji: "🎸",
    cat: "perf",
    lv: 1,
    sp: false,
  },
  // Mastery (pink)
  {
    id: "ear",
    lab: "Ear\nTraining",
    emoji: "👂",
    cat: "mast",
    lv: 1,
    sp: false,
  },
  {
    id: "practice",
    lab: "Practice\n& Mindset",
    emoji: "🔁",
    cat: "mast",
    lv: 1,
    sp: false,
  },
  // Tools (special, emerald sp)
  {
    id: "tools",
    lab: "Practice\nTools",
    emoji: "🛠️",
    cat: "harm",
    lv: 1,
    sp: true,
  },
  // L2: guitar children (amber, perf)
  {
    id: "caged",
    lab: "CAGED\nSystem",
    emoji: "🔠",
    cat: "perf",
    lv: 2,
    sp: false,
  },
  {
    id: "fretboard",
    lab: "Fretboard\nMapping",
    emoji: "🗺️",
    cat: "perf",
    lv: 2,
    sp: false,
  },
  {
    id: "techniques",
    lab: "Lead\nTechniques",
    emoji: "✨",
    cat: "perf",
    lv: 2,
    sp: false,
  },
  // L2: tools children (special, emerald sp)
  {
    id: "picker",
    lab: "Note\nPicker",
    emoji: "🎲",
    cat: "harm",
    lv: 2,
    sp: true,
  },
  {
    id: "intrainer",
    lab: "Interval\nTrainer",
    emoji: "🎯",
    cat: "harm",
    lv: 2,
    sp: true,
  },
  {
    id: "scaleviz",
    lab: "Scale\nVisualizer",
    emoji: "🪜",
    cat: "harm",
    lv: 2,
    sp: true,
  },
  {
    id: "chordhl",
    lab: "Chord Tone\nHighlight",
    emoji: "🎨",
    cat: "harm",
    lv: 2,
    sp: true,
  },
  {
    id: "chordlib",
    lab: "Chord Voicing\nLibrary",
    emoji: "🎼",
    cat: "harm",
    lv: 2,
    sp: true,
  },
];
const LINKS = [
  // Hub spokes, root to every L1 topic
  { s: "root", t: "sound", k: "spoke" },
  { s: "root", t: "notes", k: "spoke" },
  { s: "root", t: "intervals", k: "spoke" },
  { s: "root", t: "scales", k: "spoke" },
  { s: "root", t: "math", k: "spoke" },
  { s: "root", t: "modes", k: "spoke" },
  { s: "root", t: "chords", k: "spoke" },
  { s: "root", t: "family", k: "spoke" },
  { s: "root", t: "harmony", k: "spoke" },
  { s: "root", t: "rhythm", k: "spoke" },
  { s: "root", t: "guitar", k: "spoke" },
  { s: "root", t: "ear", k: "spoke" },
  { s: "root", t: "practice", k: "spoke" },
  { s: "root", t: "tools", k: "spoke" },
  // Rim links, the music-theory learning chain (sequential)
  { s: "sound", t: "notes", k: "rim" },
  { s: "notes", t: "intervals", k: "rim" },
  { s: "intervals", t: "scales", k: "rim" },
  { s: "scales", t: "math", k: "rim" },
  { s: "scales", t: "modes", k: "rim" },
  { s: "modes", t: "chords", k: "rim" },
  { s: "chords", t: "family", k: "rim" },
  { s: "family", t: "harmony", k: "rim" },
  // Cross-links, conceptual bridges across the wheel
  { s: "intervals", t: "chords", k: "cross" }, // chords = stacked intervals
  { s: "intervals", t: "ear", k: "cross" }, // interval recognition is core ear training
  { s: "scales", t: "chords", k: "cross" }, // chord tones come from scales
  { s: "scales", t: "family", k: "cross" }, // diatonic chords come from the major scale
  { s: "chords", t: "ear", k: "cross" }, // chord-quality recognition
  { s: "modes", t: "family", k: "cross" }, // each diatonic chord has its corresponding mode
  { s: "modes", t: "harmony", k: "cross" }, // modal harmony
  { s: "rhythm", t: "practice", k: "cross" }, // rhythm needs metronome discipline
  { s: "guitar", t: "notes", k: "cross" }, // where notes live on the fretboard
  { s: "guitar", t: "chords", k: "cross" }, // chord shapes on the fretboard
  { s: "guitar", t: "scales", k: "cross" }, // scale patterns on the fretboard
  { s: "ear", t: "practice", k: "cross" }, // ear training is daily practice
  // Parent links, guitar L1 to its L2 children + their conceptual targets
  { s: "guitar", t: "caged", k: "parent" },
  { s: "guitar", t: "fretboard", k: "parent" },
  { s: "guitar", t: "techniques", k: "parent" },
  { s: "caged", t: "chords", k: "cross" }, // CAGED is chord-shape system
  { s: "caged", t: "fretboard", k: "cross" }, // CAGED helps navigate fretboard
  { s: "fretboard", t: "notes", k: "cross" }, // fretboard = notes spatially mapped
  { s: "techniques", t: "practice", k: "cross" }, // techniques live and die by practice
  // Parent links, tools L1 to its L2 children + their conceptual targets
  { s: "tools", t: "picker", k: "parent" },
  { s: "tools", t: "intrainer", k: "parent" },
  { s: "tools", t: "scaleviz", k: "parent" },
  { s: "tools", t: "chordhl", k: "parent" },
  { s: "tools", t: "chordlib", k: "parent" },
  { s: "picker", t: "notes", k: "cross" }, // note picker exercises notes
  { s: "intrainer", t: "intervals", k: "cross" }, // interval trainer
  { s: "intrainer", t: "ear", k: "cross" }, // interval trainer = ear training
  { s: "scaleviz", t: "scales", k: "cross" }, // scale visualizer
  { s: "chordhl", t: "chords", k: "cross" }, // chord-tone highlight tool
  { s: "chordlib", t: "chords", k: "cross" }, // voicing library
  { s: "chordlib", t: "caged", k: "cross" }, // voicings connect to CAGED
];
const L1 = [
  "sound",
  "notes",
  "intervals",
  "scales",
  "math",
  "modes",
  "chords",
  "family",
  "harmony",
  "rhythm",
  "guitar",
  "ear",
  "practice",
  "tools",
];
const GI = L1.indexOf("guitar"),
  TI = L1.indexOf("tools");
const nmap = {};
NODES.forEach((n) => {
  nmap[n.id] = n;
});

function calcPos(W, H) {
  const cx = W / 2,
    cy = H / 2,
    r1 = Math.min(W, H) * 0.33,
    r2 = Math.min(W, H) * 0.49,
    n = L1.length;
  nmap["root"].x = cx;
  nmap["root"].y = cy;
  L1.forEach((id, i) => {
    const a = -Math.PI / 2 + i * ((2 * Math.PI) / n);
    nmap[id].x = cx + r1 * Math.cos(a);
    nmap[id].y = cy + r1 * Math.sin(a);
  });
  // Guitar children
  const ga = -Math.PI / 2 + GI * ((2 * Math.PI) / n);
  [
    ["caged", -0.24],
    ["fretboard", 0],
    ["techniques", 0.24],
  ].forEach(([id, off]) => {
    nmap[id].x = cx + r2 * Math.cos(ga + off);
    nmap[id].y = cy + r2 * Math.sin(ga + off);
  });
  // Tools children
  const ta = -Math.PI / 2 + TI * ((2 * Math.PI) / n);
  [
    ["picker", -0.36],
    ["intrainer", -0.18],
    ["scaleviz", 0],
    ["chordhl", 0.18],
    ["chordlib", 0.36],
  ].forEach(([id, off]) => {
    nmap[id].x = cx + r2 * Math.cos(ta + off);
    nmap[id].y = cy + r2 * Math.sin(ta + off);
  });
}

const mp = document.getElementById("map-panel");
let W = mp.clientWidth,
  H = mp.clientHeight;
calcPos(W, H);

/* Adjacency map, built from LINKS once, used for hover/select highlighting
   and for the "Connected with" chips in the content panel. */
const adj = {};
NODES.forEach((n) => {
  adj[n.id] = new Set();
});
LINKS.forEach((l) => {
  adj[l.s].add(l.t);
  adj[l.t].add(l.s);
});

const svg = d3.select("#mm");
const g = svg.append("g");
/* B2, translateExtent prevents user from panning the map off-screen */
const zoomB = d3
  .zoom()
  .scaleExtent([0.5, 3.5])
  .translateExtent([
    [-W * 0.6, -H * 0.6],
    [W * 1.6, H * 1.6],
  ])
  .on("zoom", (e) => g.attr("transform", e.transform));
svg.call(zoomB);

function linkPath(d) {
  const s = nmap[d.s],
    t = nmap[d.t];
  /* Hub spokes: straight radial line */
  if (d.k === "spoke") return `M${s.x},${s.y}L${t.x},${t.y}`;
  /* Everything else: quadratic Bezier curving outward (away from canvas center) */
  const cx = W / 2,
    cy = H / 2;
  const mx = (s.x + t.x) / 2,
    my = (s.y + t.y) / 2;
  let dx = mx - cx,
    dy = my - cy;
  let dlen = Math.hypot(dx, dy);
  if (dlen < 1) {
    dx = -(t.y - s.y);
    dy = t.x - s.x;
    dlen = Math.hypot(dx, dy) || 1;
  }
  const linkLen = Math.hypot(t.x - s.x, t.y - s.y);
  /* Parent links curve less (subtle) than cross-links (more dramatic) */
  const factor = d.k === "parent" ? 0.08 : 0.18;
  const curve = Math.min(linkLen * factor, d.k === "parent" ? 30 : 70);
  const px = mx + (dx / dlen) * curve,
    py = my + (dy / dlen) * curve;
  return `M${s.x},${s.y}Q${px},${py} ${t.x},${t.y}`;
}

const lsel = g
  .append("g")
  .selectAll("path")
  .data(LINKS)
  .join("path")
  .attr("d", linkPath)
  .attr("fill", "none")
  .attr("stroke-linecap", "round");

const R = { 0: 42, 1: 30, 2: 22 };
const ng = g
  .append("g")
  .selectAll("g")
  .data(NODES)
  .join("g")
  .attr("transform", (d) => `translate(${d.x},${d.y})`)
  .attr(
    "class",
    (d) =>
      "node node-lv" +
      d.lv +
      (d.cat ? " cat-" + d.cat : "") +
      (d.sp ? " sp" : ""),
  )
  .attr("cursor", "pointer")
  .on("click", (e, d) => {
    e.stopPropagation();
    selectNode(d.id);
  })
  .on("mouseenter", (e, d) => {
    hoverId = d.id;
    showTip(e, d);
    applyNodeColors();
  })
  .on("mousemove", (e) => moveTip(e))
  .on("mouseleave", () => {
    hoverId = null;
    hideTip();
    applyNodeColors();
  });

ng.append("circle")
  .attr("r", (d) => R[d.lv])
  .attr("stroke-width", (d) => (d.lv === 0 ? 2 : 1.5));
ng.each(function (d) {
  const el = d3.select(this);
  if (d.emoji) {
    el.append("text")
      .attr("class", "node-emoji")
      .attr("text-anchor", "middle")
      .attr("y", d.lv === 0 ? -10 : d.lv === 1 ? -6 : -4)
      .attr("font-size", d.lv === 0 ? 16 : d.lv === 1 ? 13 : 11)
      .attr("pointer-events", "none")
      .text(d.emoji);
  }
  const lines = d.lab.split("\n");
  const fs = d.lv === 0 ? 8 : d.lv === 1 ? 7 : 6;
  const lh = d.lv === 0 ? 9 : 8;
  const yStart = d.lv === 0 ? 6 : d.lv === 1 ? 5 : 4;
  const tx = el
    .append("text")
    .attr("class", "node-label")
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none")
    .attr("font-family", "'Poppins',sans-serif");
  lines.forEach((ln, i) => {
    tx.append("tspan")
      .attr("x", 0)
      .attr("dy", i === 0 ? yStart : lh)
      .attr("font-size", fs)
      .attr("font-weight", d.lv === 0 ? "700" : "500")
      .text(ln);
  });
});

/* M5, hover tooltip showing node title + sub */
const tipEl = document.createElement("div");
tipEl.className = "mm-tooltip";
document.body.appendChild(tipEl);
function showTip(e, d) {
  if (!C[d.id]) return;
  const t = C[d.id];
  tipEl.innerHTML = `<strong>${t.title.replace(/\n/g, " ")}</strong>${t.sub || ""}`;
  tipEl.classList.add("visible");
  moveTip(e);
}
function moveTip(e) {
  const pad = 14;
  let x = e.clientX + pad,
    y = e.clientY + pad;
  const r = tipEl.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
  if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
  tipEl.style.left = x + "px";
  tipEl.style.top = y + "px";
}
function hideTip() {
  tipEl.classList.remove("visible");
}

let selectedId = null;
let hoverId = null;
function getCS() {
  const s = getComputedStyle(document.documentElement);
  const g = (v) => s.getPropertyValue(v).trim();
  return {
    bg: g("--bg"),
    bgAlt: g("--bg-alt"),
    text: g("--text"),
    textMuted: g("--text-muted"),
    textDim: g("--text-dim"),
    border: g("--border"),
    accent: g("--accent"),
    linkColor: g("--link-color") || "#1e2d3d",
    linkActive: g("--link-active") || "#1da1f2",
  };
}

function applyNodeColors() {
  const c = getCS();
  /* Focus = whatever the user is paying attention to. Hover wins over selection
     so the user can preview without losing their current selection. Root is
     "no-focus" default because root touches every L1, dimming the whole map
     when root is selected would be ugly. */
  const focusId =
    hoverId || (selectedId && selectedId !== "root" ? selectedId : null);
  const focusSet = focusId ? new Set([focusId, ...adj[focusId]]) : null;
  const isLinkActive = (d) => focusId && (d.s === focusId || d.t === focusId);
  const isNodeInFocus = (id) => !focusSet || focusSet.has(id);

  ng.select("circle")
    .attr("fill", function (d) {
      const sel = d.id === selectedId;
      if (d.lv === 0) return sel ? c.bgAlt : c.bg;
      const nodeEl = this.parentNode;
      const cs = getComputedStyle(nodeEl);
      const fill = cs.getPropertyValue("--cat-fill").trim();
      const stroke = cs.getPropertyValue("--cat-stroke").trim();
      if (sel) return stroke;
      return fill || c.bg;
    })
    .attr("stroke", function (d) {
      const sel = d.id === selectedId;
      const neighbor = focusSet && focusSet.has(d.id) && d.id !== focusId;
      if (sel) return c.linkActive;
      if (neighbor) return c.linkActive;
      if (d.lv === 0) return c.accent;
      const nodeEl = this.parentNode;
      const cs = getComputedStyle(nodeEl);
      return cs.getPropertyValue("--cat-stroke").trim() || c.border;
    })
    .attr("stroke-width", (d) => {
      if (d.id === selectedId) return d.lv === 0 ? 2.4 : 2.2;
      if (focusSet && focusSet.has(d.id)) return 2;
      return d.lv === 0 ? 2 : 1.5;
    });

  ng.attr("opacity", (d) => (isNodeInFocus(d.id) ? 1 : 0.32));

  ng.select("text.node-label").attr("fill", function (d) {
    const sel = d.id === selectedId;
    if (d.lv === 0) return c.text;
    if (sel) return c.bg;
    const nodeEl = this.parentNode;
    const cs = getComputedStyle(nodeEl);
    return cs.getPropertyValue("--cat-text").trim() || c.textMuted;
  });

  /* Link styling by kind:
       spoke , thin, faint  (radial structural skeleton)
       rim   , medium, dashed (sequential learning chain)
       cross , medium, solid  (conceptual bridges across topics)
       parent, thin, dotted   (L1→L2 subordinate link)
  */
  const W_INACTIVE = { spoke: 0.7, rim: 1.1, cross: 1.1, parent: 0.9 };
  const W_ACTIVE = { spoke: 1.5, rim: 1.9, cross: 1.9, parent: 1.7 };
  const O_INACTIVE = { spoke: 0.3, rim: 0.55, cross: 0.55, parent: 0.45 };
  const DASH = { rim: "5,4", parent: "2,3" };
  lsel
    .attr("stroke", (d) => (isLinkActive(d) ? c.linkActive : c.linkColor))
    .attr("stroke-width", (d) =>
      isLinkActive(d) ? W_ACTIVE[d.k] : W_INACTIVE[d.k],
    )
    .attr("stroke-opacity", (d) => {
      if (isLinkActive(d)) return 0.95;
      if (focusId) return 0.1;
      return O_INACTIVE[d.k];
    })
    .attr("stroke-dasharray", (d) => DASH[d.k] || null);
}
function selectNode(id) {
  clearTmr();
  PS.running = false;
  selectedId = id;
  applyNodeColors();
  if (viewMode === "map") render(id);
}

/* ═══ NODE DRAG + POSITION PERSISTENCE (Obsidian-style) ═══
   Drag any node to rearrange. Positions persist in localStorage and rescale
   sensibly when the map panel is resized. The Reset button restores the
   default radial layout. */
const POS_KEY = "guitar-node-positions";
function saveNodePositions() {
  const obj = { _w: W, _h: H, nodes: {} };
  NODES.forEach((n) => {
    obj.nodes[n.id] = { x: n.x, y: n.y };
  });
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(obj));
  } catch (e) {}
}
function loadNodePositions() {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    if (!obj || !obj.nodes) return false;
    const sx = obj._w ? W / obj._w : 1,
      sy = obj._h ? H / obj._h : 1;
    let touched = false;
    NODES.forEach((n) => {
      const s = obj.nodes[n.id];
      if (s) {
        n.x = s.x * sx;
        n.y = s.y * sy;
        touched = true;
      }
    });
    return touched;
  } catch (e) {
    return false;
  }
}
function resetNodePositions() {
  try {
    localStorage.removeItem(POS_KEY);
  } catch (e) {}
  calcPos(W, H);
  ng.attr("transform", (d) => `translate(${d.x},${d.y})`);
  lsel.attr("d", linkPath);
}

const nodeDrag = d3
  .drag()
  // 5px slop so finger micro-jitter on a real click doesn't get treated as a
  // drag (which would suppress the subsequent click event and force the user
  // to click twice). Only true drags of >5px move the node.
  .clickDistance(5)
  .on("start", function (e, d) {
    d3.select(this).raise();
    document.body.classList.add("no-select");
    if (e.sourceEvent) e.sourceEvent.stopPropagation();
  })
  .on("drag", function (e, d) {
    d.x = e.x;
    d.y = e.y;
    d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
    lsel.attr("d", linkPath);
  })
  .on("end", function () {
    document.body.classList.remove("no-select");
    saveNodePositions();
  });
ng.call(nodeDrag);
loadNodePositions();
ng.attr("transform", (d) => `translate(${d.x},${d.y})`);
lsel.attr("d", linkPath);

new ResizeObserver(() => {
  W = mp.clientWidth;
  H = mp.clientHeight;
  calcPos(W, H);
  loadNodePositions();
  ng.attr("transform", (d) => `translate(${d.x},${d.y})`);
  lsel.attr("d", linkPath);
}).observe(mp);

/* ═══ MAP LEGEND ═══ */
(function buildLegend() {
  const legend = document.getElementById("map-legend");
  if (!legend) return;
  const items = [
    { label: "Foundation", color: "var(--violet)" },
    { label: "Building Blocks", color: "var(--accent)" },
    { label: "Harmony", color: "var(--emerald)" },
    { label: "Performance", color: "var(--amber)" },
    { label: "Mastery", color: "var(--pink)" },
  ];
  items.forEach((i) => {
    const chip = document.createElement("span");
    chip.className = "legend-chip";
    chip.innerHTML = `<span class="legend-dot" style="background:${i.color}"></span>${i.label}`;
    legend.appendChild(chip);
  });
})();

/* ═══ RESET LAYOUT BUTTON ═══ */
(function initResetLayout() {
  const btn = document.createElement("button");
  btn.id = "reset-layout";
  btn.className = "view-toggle";
  btn.title = "Snap nodes back to their default circle";
  btn.innerHTML = "↺ Reset";
  const hdr = document.querySelector("header");
  const themeT = document.getElementById("theme-toggle");
  hdr.insertBefore(btn, themeT);
  btn.addEventListener("click", resetNodePositions);
})();

/* ═══ VIEW TOGGLE (Mind Map ⟷ Essay) ═══ */
(function initViewToggle() {
  const btn = document.createElement("button");
  btn.id = "view-toggle";
  btn.className = "view-toggle";
  const hdr = document.querySelector("header");
  const themeT = document.getElementById("theme-toggle");
  hdr.insertBefore(btn, themeT);
  btn.addEventListener("click", () =>
    setViewMode(viewMode === "essay" ? "map" : "essay"),
  );
})();

/* B3, Esc key returns focus to root (but not when user is typing in an input) */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const ae = document.activeElement;
  if (
    ae &&
    (ae.tagName === "INPUT" ||
      ae.tagName === "TEXTAREA" ||
      ae.tagName === "SELECT" ||
      ae.isContentEditable)
  )
    return;
  if (selectedId && selectedId !== "root") selectNode("root");
});

selectedId = "root";
applyNodeColors();
setViewMode(viewMode);
