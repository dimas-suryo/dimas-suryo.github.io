/* ═══ MAIN THEME ═══ */
const themeBtn = document.getElementById("theme-toggle");
let isDark = true;
if (localStorage.getItem("learning-theme") === "light") {
  document.body.classList.add("light");
  themeBtn.textContent = "🌙";
  isDark = false;
}
themeBtn.addEventListener("click", () => {
  isDark = !isDark;
  document.body.classList.toggle("light", !isDark);
  themeBtn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("learning-theme", isDark ? "dark" : "light");
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

/* ═══ CONTENT DATABASE ═══*/
const C = {
  root: {
    title: "What You Should Also Know About Learning and Studying",
    sub: "Notes on how to actually learn, backed by research, not the latest TikTok study-with-me aesthetic, it was inspired by them to be frank.",
    intro:
      "I graduated high school with decent ranks, but if you'd asked me anything from 11th grade material the day after the ceremony, I would've drawn a complete blank. That was the first lesson nobody put in the syllabus: studying isn't the same thing as learning. This page is the map of everything I wish someone had taught me earlier, with peer-reviewed sources behind every claim. Click any node that catches your eye, or flip Essay Mode in the header to read it straight through.",
    secs: [
      {
        l: "Why This Map Exists",
        t: "Learning is a trainable skill, not a born talent. Most people are never shown the techniques, so they end up assuming that sitting in the library for hours equals learning. Fifty years of memory research says otherwise. What determines retention isn't the hours you stare at a page, it's how often you pull the information back <em>out</em> of your head (Roediger & Karpicke, 2006).",
      },
      {
        l: "Reading Order",
        li: [
          "1. <strong>Studying vs Learning</strong> : the meta-frame",
          "2. <strong>Time Architecture</strong> : pomodoro, and the case against the 10,000-hour claim",
          "3. <strong>Focus & Attention</strong> : single-task vs multi-task",
          "4. <strong>Active Recall</strong> : the testing effect",
          "5. <strong>Spaced Repetition</strong> : the forgetting curve",
          "6. <strong>Pareto & Deliberate Practice</strong> : prioritization and weak spots",
          "7. <strong>Mindset & Difficulty</strong> : growth mindset, with caveats",
          "8. <strong>Goals & Identity</strong> : implementation intentions",
          "9. <strong>Reading Method</strong> : active, marginalia, review",
          "10. <strong>Mind Mapping (GRINDE)</strong> : the mixed evidence",
          "11. <strong>Social Layer</strong> : peer learning and mentors",
          "12. <strong>Body & Sleep</strong> : the physical substrate",
          "13. <strong>Practice Tools</strong> : the actual implementations",
        ],
      },
      {
        l: "Three Layers of Learning",
        li: [
          "<strong>Encoding</strong> : recall, spaced repetition, mind mapping. How information gets in and stays in.",
          "<strong>Conditions</strong> : time, focus, body, social. The environment that makes encoding possible.",
          "<strong>Direction</strong> : mindset, goals, priority. What decides where the effort is aimed.",
        ],
      },
    ],
    tk: "If you only read one thing on this page, read Active Recall. It's the most consistent finding in modern education research, and the one schools most often ignore.",
    refs: [
      "Brown, P. C., Roediger, H. L., & McDaniel, M. A. (2014). Make It Stick: The Science of Successful Learning. Harvard University Press.",
      "Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58.",
      "Roediger, H. L., & Karpicke, J. D. (2006). The power of testing memory. Perspectives on Psychological Science, 1(3), 181-210.",
    ],
  },

  meta: {
    title: "Studying vs Learning",
    sub: "Four hours in the library isn't four hours of learning. The gap isn't subtle.",
    intro:
      "Four hours reading a linguistics book in my favorite café, feeling like I had it down cold. Asked for a summary the next day, total blank. That experience was the first lesson never put on any syllabus.",
    secs: [
      {
        l: "What's the Difference?",
        t: "Studying is input. You sit down, read, highlight, watch a lecturer. Learning is encoding that sticks. Karpicke and Roediger (2008) ran a brutal experiment on college students with two simple conditions. One group re-read the material four times. The other group read it once, then tested themselves three times. The re-readers felt more confident. A month later, the self-testers remembered 80% of the material. The re-readers? Just 36%.",
      },
      {
        l: "Illusion of Competence",
        t: "Why does sitting longer fool us? Because familiarity <em>feels</em> like knowledge. Read the same paragraph five times and you start to recognize its shape, the brain mistakes that recognition for understanding. Robert Bjork (1994) called this the <em>illusion of competence</em>, and he pointed straight at highlighting and re-reading as the main culprits. The cheapest test: if you can't close the book and explain it back, you haven't learned it yet.",
      },
      {
        l: "Metacognition Gap",
        t: "Worse still, the people who are most overconfident tend to be the worst at gauging their own understanding (Kruger & Dunning, 1999). They have no internal calibration. The fix isn't more reading. The fix is testing yourself more often, earlier, and in smaller doses. Getting a 5-question quiz wrong is much cheaper than getting the final wrong.",
      },
      {
        l: "Desirable Difficulty",
        t: "Bjork has another important phrase: <em>desirable difficulty</em>. Study methods that feel slow and effortful in the moment tend to be the ones with the best long-term payoff. The easy ones are a trap. If a session feels suspiciously easy, that's a signal you might be in familiarity mode, not encoding mode.",
      },
    ],
    tk: "The fairest test of learning: can you close the book and explain its contents back? Until you can, you're still studying.",
    refs: [
      "Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. Science, 319(5865), 966-968.",
      "Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In Metacognition: Knowing about knowing (pp. 185-205). MIT Press.",
      "Kruger, J., & Dunning, D. (1999). Unskilled and unaware of it. Journal of Personality and Social Psychology, 77(6), 1121-1134.",
      "Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way.",
    ],
  },

  time: {
    title: "Time Architecture",
    sub: "Pomodoro isn't magic. But any structured time beats no structure at all.",
    intro:
      "The first time I tried pomodoro, I was religious about 25/5. Eventually it hit me that the number 25 is arbitrary. What actually matters is just one thing: a scheduled break before concentration collapses.",
    secs: [
      {
        l: "Vigilance Decrement",
        t: "The brain can't sustain constant focus. Ariga and Lleras (2011) demonstrated the <em>vigilance decrement</em>: performance on attention tasks drops significantly after roughly 20-30 minutes. But a brief rest break <em>restores</em> performance to baseline. That's the actual empirical basis for pomodoro, not the 25/5 numbers themselves, but the principle of breaks scheduled <em>before</em> the decrement kicks in.",
      },
      {
        l: "The 1:2 Ratio Myth",
        t: "Some pop notes recommend a 1:2 study:practice ratio. I went looking for the source, nothing in the literature supports it. What the literature does back: ratios that you stick to consistently. Cirillo (1992) came up with 25/5 from his own college routine, not from a randomized trial. Pomodoro Inc. itself has said many times that the numbers are a rule of thumb, not a finding.",
      },
      {
        l: "The 10,000 and 20-Hour Myths",
        t: "The '10,000 hours to expert' claim is Gladwell's misreading of Ericsson, Krampe, and Tesch-Römer (1993). The original Ericsson paper never claimed a magic number. Macnamara, Hambrick, and Oswald (2014) ran a meta-analysis of 88 studies: deliberate practice explains 26% of performance variance in games, 21% in music, 18% in sports, and only 4% in academic education. Domain matters enormously. Josh Kaufman's '20 hours to learn a skill' has even less peer-reviewed grounding.",
      },
      {
        l: "3 Hours a Day, With a Caveat",
        t: "Pop notes often recommend three non-negotiable hours a day: morning body, afternoon consume, evening create. As a habit scaffold it makes sense, it aligns with implementation intentions (Gollwitzer, 1999): specific schedules are three times more likely to be followed than vague intentions. But the number three is arbitrary. What matters is consistency, not total hours. The tracker on this page uses this frame because it's easy to make routine, not because three is somehow magic.",
      },
    ],
    tk: "Pomodoro works because it fights vigilance decrement, not because 25/5 is magic. The 10,000-hour and 20-hour claims are pop science. What actually works: consistent structure + scheduled breaks + a specific daily schedule.",
    refs: [
      "Ariga, A., & Lleras, A. (2011). Brief and rare mental 'breaks' keep you focused. Cognition, 118(3), 439-443.",
      "Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice in the acquisition of expert performance. Psychological Review, 100(3), 363-406.",
      "Macnamara, B. N., Hambrick, D. Z., & Oswald, F. L. (2014). Deliberate practice and performance in music, games, sports, education, and professions: A meta-analysis. Psychological Science, 25(8), 1608-1618.",
      "Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493-503.",
    ],
  },

  focus: {
    title: "Focus & Attention",
    sub: "That phone next to your laptop is a cognitive tax you're paying without realizing it.",
    intro:
      "I used to think I could study fine with WhatsApp notifications on. These days, if my phone is in another room, I finish faster and remember more. It's not placebo.",
    secs: [
      {
        l: "Switching Cost Is Real",
        t: "Mark, Gudith, and Klocke (2008) followed office workers around: every time they got interrupted, it took an average of 23 minutes and 15 seconds to get back to the original task. Rosen and colleagues (2013) found students focused for only 6 minutes on average before checking a device. Multi-task is an illusion. What the brain actually does is task-switch, and every switch has a cost.",
      },
      {
        l: "Brain Drain",
        t: "Ward, Duke, Gneezy, and Bos (2017) tested something more subtle. Three groups of students took cognitive capacity tests. Group A: phone on the desk, face down. Group B: phone in the bag. Group C: phone in another room. Phones were powered <em>off</em>. The pattern was monotonic: the farther away the phone, the higher the working memory score. They called it the <em>brain drain effect</em>. Just having a phone in your field of vision burns cognitive resources.",
      },
      {
        l: "Supertasker Is a Myth",
        t: "Ophir, Nass, and Wagner (2009) in PNAS compared heavy media multitaskers to light ones: the heavy multitaskers did worse on every test, including task-switching itself. Strayer and Watson (2012) estimate only about 2.5% of the population actually qualifies as a 'supertasker'. Simple stat: odds are you're not one. Default assumption: you're not.",
      },
      {
        l: "What to Actually Do",
        li: [
          "<strong>Phone in another room</strong>, not on the desk, not in the bag",
          "<strong>Single-task hard work</strong>; dual-task only on light stuff (audiobook while walking)",
          "<strong>Pre-focus ritual</strong> : 2 minutes of breathing, tidy the desk, set a timer. Cue the brain that focus mode is starting",
          "<strong>Low-cue environment</strong> : a clean desk cuts down visual distraction",
        ],
      },
    ],
    tk: "Single-tasking isn't a virtue, it's the only mode the brain can run optimally. Treat multi-tasking as a default-worse skill, unless you're in that 2.5% supertasker minority.",
    refs: [
      "Mark, G., Gudith, D., & Klocke, U. (2008). The cost of interrupted work: More speed and stress. Proceedings of CHI 2008, 107-110.",
      "Ward, A. F., Duke, K., Gneezy, A., & Bos, M. W. (2017). Brain drain: The mere presence of one's own smartphone reduces available cognitive capacity. Journal of the Association for Consumer Research, 2(2), 140-154.",
      "Ophir, E., Nass, C., & Wagner, A. D. (2009). Cognitive control in media multitaskers. PNAS, 106(37), 15583-15587.",
      "Strayer, D. L., & Watson, J. M. (2012). Supertaskers and the multitasking brain. Scientific American Mind, 23(1), 22-29.",
    ],
  },

  recall: {
    title: "Active Recall",
    sub: "If you only adopt one technique from this whole page, this is it.",
    intro:
      "The first time someone walked me through active recall, my reaction was 'wait, that's it?'. Then my GPA the following semester went up 0.4 without me adding any extra study hours. I got defensive on behalf of every hour I'd wasted re-reading.",
    secs: [
      {
        l: "The Testing Effect",
        t: "Roediger and Karpicke (2006) named it the <em>testing effect</em>. Tests don't only measure knowledge, taking a test is itself a learning event. Every time you pull information out of memory, the neural connection strengthens. The effect is large and replicable. Adesope, Trevisan, and Sundararajan (2017) ran a meta-analysis of 118 studies comparing testing vs re-study. Median effect size: d = 0.61. In education research, that's huge.",
      },
      {
        l: "Retrieval Practice Beats Concept Mapping",
        t: "This is the finding that stings a little. Karpicke and Blunt (2011) in Science compared four conditions: re-study, retrieval practice, initial concept mapping, and elaborative concept mapping. A month later, the retrieval-practice group beat the concept mappers on both retention and inference. But students' predictions went the other way, the ones doing concept maps thought they'd remember the most. Illusion of competence again.",
      },
      {
        l: "What It Actually Looks Like",
        li: [
          "<strong>Flashcards</strong> : question-answer cards, drilled on a schedule. Classic because it works.",
          "<strong>Blurt</strong> : after a sub-chapter, close the book and write everything you remember on a blank page for 5-10 minutes. Then compare against the material.",
          "<strong>Practice problems</strong> : try them before checking the solution, even if you're sure you'll fail. Failed retrieval still strengthens encoding (Kornell, Hays, & Bjork, 2009).",
          "<strong>Self-explanation</strong> : while reading, force yourself to answer 'why is this true?' at every step.",
        ],
      },
      {
        l: "Feynman as Deepest Recall",
        t: "The Feynman technique is retrieval practice pushed to the extreme: not just pulling info out, but forcing yourself to explain it in the simplest possible words. That mercilessly exposes any gap in your understanding. Click the Feynman Method node for more, or jump straight into Feynman Walker in the tools.",
      },
    ],
    tk: "If you don't retrieve, you don't learn. Highlighting isn't retrieval. Re-reading isn't retrieval. Testing yourself is retrieval.",
    refs: [
      "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249-255.",
      "Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying with concept mapping. Science, 331(6018), 772-775.",
      "Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. Review of Educational Research, 87(3), 659-701.",
      "Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance subsequent learning. Journal of Experimental Psychology, 35(4), 989-998.",
    ],
  },

  spaced: {
    title: "Spaced Repetition",
    sub: "Ebbinghaus proved this in 1885. We still cram like that doesn't apply to us.",
    intro:
      "The first time I used Anki to learn Japanese, it felt boring. Fifteen minutes a day, that's it. Three months in, I could read light manga without a dictionary. Spacing beats intensity.",
    secs: [
      {
        l: "Forgetting Curve",
        t: "Hermann Ebbinghaus (1885) spent years memorizing nonsense syllables and counting how many he could recall at various intervals. The result is the classic forgetting curve: the steepest drop happens in the first hour. After that, the rate of forgetting slows down. But the curve isn't the important part. The important part is what he found next: every time you review just before total forgetting, the curve flattens. Memory can be shaped.",
      },
      {
        l: "Lag Effect and Distributed Practice",
        t: "Cepeda, Pashler, Vul, Wixted, and Rohrer (2006) ran a meta-analysis of 254 spacing studies. The conclusion was crisp: the spacing effect is one of the most robust findings in all of memory research. The practical question is harder, what's the optimal gap between reviews? Their follow-up (Cepeda et al., 2008) on 1,354 people gave a rule of thumb: optimal review gap ≈ 10-30% of how long you need to remember the material. Need to remember it a week? Space reviews 1-2 days apart. Need to remember it a year? Space them 2-4 months apart.",
      },
      {
        l: "Leitner Box: The Manual Version",
        t: "Sebastian Leitner (1972) built an analog system that's still elegant decades later. Five boxes. Cards you answer correctly move up one box. Cards you miss go back to box 1. Each box has a longer review interval. Anki, SuperMemo, and every modern spaced-repetition app is just a digital re-implementation of the same principle. The tool on this page uses a simplified Leitner because what matters is grasping the principle, not the details of the SM-2 algorithm.",
      },
      {
        l: "Why Cramming Fails",
        t: "Cramming gets you a decent score on tomorrow's quiz. But Bahrick and colleagues (1993) tracked retention out to 8 years and found mass-practice retention drops off a cliff after about a week. From spaced practice? Far more durable. The relevant time scale isn't 'next week's exam'; it's 'do I still know this next year?'. Cramming is optimized for the wrong metric.",
      },
    ],
    tk: "Schedule beats intensity. Fifteen minutes every day beats three hours once a week, and that's almost always true for long-term memory.",
    refs: [
      "Ebbinghaus, H. (1885/1913). Memory: A contribution to experimental psychology. Teachers College, Columbia University.",
      "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin, 132(3), 354-380.",
      "Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. Psychological Science, 19(11), 1095-1102.",
      "Bahrick, H. P., Bahrick, L. E., Bahrick, A. S., & Bahrick, P. E. (1993). Maintenance of foreign language vocabulary and the spacing effect. Psychological Science, 4(5), 316-321.",
    ],
  },

  priority: {
    title: "Pareto & Deliberate Practice",
    sub: "Most people spend 80% of their time on the easiest 20% of the material. It should be the other way around.",
    intro:
      "I had a long habit: re-reviewing topics I already understood because it felt good. Eventually I realized that was a way of hiding from the topics I didn't understand. Your weak spots are the ones that deserve the 80%.",
    secs: [
      {
        l: "Pareto Isn't a Law, It's a Useful Pattern",
        t: "Vilfredo Pareto observed the distribution of land in 19th-century Italy: 20% of the population owned 80% of the land. That got turned into the 'Pareto principle' and then generalized to everything. Careful: there's no mathematical law forcing 80/20 onto studying. But as a heuristic for prioritization, it works. In most domains, there's a small subset of fundamental ideas that unlocks a huge amount of understanding. Identify those. Start there.",
      },
      {
        l: "Deliberate Practice, The Original Version",
        t: "Before Gladwell popularized 10,000 hours, Ericsson and colleagues (1993) were already specific about what makes practice <em>effective</em>. They coined deliberate practice with sharp criteria: an explicit goal each session, immediate feedback, focused repetition on specific elements, and, crucially, pitched to push the edge of your current ability. Casual practice (kicking a ball around with friends) isn't deliberate practice. Targeted drill on a weak technique is.",
      },
      {
        l: "Zone of Proximal Development",
        t: "Vygotsky (1978) proposed a similar idea: for any skill, there are three zones. Already mastered (too easy, zero growth), out of reach (too hard, just frustrating), and the middle zone, where the material is challenging but still solvable with effort. Learning happens fastest in the middle zone. Practically: if material feels too easy, you're just cementing what you already know. If it's too hard, you're frustrating yourself without progress.",
      },
      {
        l: "How to Find Your Weak Spots",
        li: [
          "<strong>Test yourself before reading</strong>. The questions you can't answer are a map of your weak spots.",
          "<strong>Track patterns in your errors</strong>. Not a list of wrong questions, categories. 'I keep missing integration by parts' is different from 'I made arithmetic slips'.",
          "<strong>Look for recent failures</strong>, not recent wins. Comfort hides weakness.",
          "<strong>Spend 80% of your time on the weakest 20% of areas</strong>. Not the topics you hate most, the topics the feedback says you're worst at.",
        ],
      },
    ],
    tk: "Wherever you're weakest is where the learning curve is steepest. Treat discomfort as a directional signal, not a stop signal.",
    refs: [
      "Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice. Psychological Review, 100(3), 363-406.",
      "Macnamara, B. N., Hambrick, D. Z., & Oswald, F. L. (2014). Deliberate practice and performance: A meta-analysis. Psychological Science, 25(8), 1608-1618.",
      "Vygotsky, L. S. (1978). Mind in Society: The Development of Higher Psychological Processes. Harvard University Press.",
      "Hambrick, D. Z., et al. (2018). Beyond the dichotomy between innate talent and deliberate practice. American Psychologist.",
    ],
  },

  mindset: {
    title: "Mindset & Difficulty",
    sub: "Growth mindset has empirical evidence, but the real effect is much smaller than the viral version.",
    intro:
      "I once spent a whole month reading self-help mindset books and my GPA didn't budge. What actually moved it? Switching study techniques. Mindset matters, but it can't substitute for the wrong method.",
    secs: [
      {
        l: "The Original Growth-Mindset Claim",
        t: "Carol Dweck (2006) argued that students who believe intelligence is developable (growth mindset) outperform students who believe intelligence is fixed. Central theme: praise effort, not ability. The Mindset book became a bestseller, and growth mindset got embedded in school curricula in many countries.",
      },
      {
        l: "The Meta-Analysis That Should Make You Pause",
        t: "Sisk and colleagues (2018) reviewed 273 studies (n > 365,000) in Psychological Science. Mindset's correlation with achievement: r = 0.10. Effect of mindset interventions: d = 0.08. That's a small effect, statistically significant at huge sample sizes, but practically modest. Burgoyne, Hambrick, and Macnamara (2020) confirmed: the growth-mindset effect has been overestimated in popular media. Not zero. Just nowhere near a magic bullet.",
      },
      {
        l: "What Has Stronger Evidence: Desirable Difficulty",
        t: "There's a reframe with much firmer empirical footing, not 'positive mindset makes learning better' but 'difficulty is information'. Bjork (1994, 2011) showed that tasks that feel hard in the moment usually produce the best long-term retention. The ones that feel easy are often less effective. When material feels heavy, that isn't a sign to quit. It's a sign encoding is happening.",
      },
      {
        l: "What to Take Away",
        li: [
          "<strong>Effort is information</strong>, not a sign of inadequacy",
          "<strong>Tools and techniques &gt; mindset alone</strong>. A great mindset with re-reading still loses to any mindset with active recall",
          "<strong>Struggle != bad</strong>. A mistake is one data point about the edge of your understanding",
          "<strong>Be wary of huge claims</strong>. Any self-help that promises total transformation from a mindset shift, check the effect size",
        ],
      },
    ],
    tk: "Mindset matters, but only marginally. What actually moves the needle: study techniques with empirical support. Growth mindset without active recall still loses to a fixed mindset using active recall.",
    refs: [
      "Dweck, C. S. (2006). Mindset: The New Psychology of Success. Random House.",
      "Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent and under which circumstances are growth mindsets important to academic achievement? Psychological Science, 29(4), 549-571.",
      "Burgoyne, A. P., Hambrick, D. Z., & Macnamara, B. N. (2020). How firm are the foundations of mind-set theory? Psychological Science, 31(3), 258-267.",
      "Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way.",
    ],
  },

  goals: {
    title: "Goals & Identity",
    sub: "'I want to study more' loses to 'every Monday at 8, at this desk, open chapter 3'.",
    intro:
      "For two years I had the intention to work out regularly. What finally made it happen: nailing down one specific sentence, 'every Tuesday-Thursday-Saturday at 6 am, shoes already at the door, just run'. Specificity beats willpower.",
    secs: [
      {
        l: "Goal Setting With Evidence",
        t: "Locke and Latham (2002) summarized 35 years of goal-setting research. Core finding: specific, challenging goals produce better performance than 'do your best'. But with conditions: a feedback loop, real commitment to the goal, and a task that isn't so complex the goal itself distracts from the learning curve. For studying: 'master chapter 3 to the point I can do every end-of-chapter problem' is way stronger than 'study seriously'.",
      },
      {
        l: "Implementation Intentions",
        t: "What jumps the success rate from intention to action is implementation intentions (Gollwitzer, 1999): the formula 'if situation X, then I do Y in place Z'. Gollwitzer and Sheeran's (2006) meta-analysis of 94 studies found an effect size of d = 0.65, one of the largest behavior-change interventions in psychology. Effect sizes that big are rare.",
      },
      {
        l: "Identity-Based vs Outcome-Based",
        t: "James Clear (Atomic Habits, 2018) popularized the distinction: not 'I want to graduate with a 3.8 GPA' (outcome) but 'I'm someone who studies every morning' (identity). The psychological basis is Daryl Bem's (1972) self-perception theory. We figure out who we are by watching our own behavior. The more 'person who studies' actions, the stronger the self-as-learner identity, the easier to sustain.",
      },
      {
        l: "What This Looks Like in Practice",
        li: [
          "<strong>Specific &gt; vague</strong> : 'in a month I can conjugate regular Spanish verbs' beats 'study Spanish'",
          "<strong>When, where, how</strong> : 'every weekend at 10, at the desk, open Duolingo + Anki' beats 'study when I have time'",
          "<strong>Identity statement</strong> : before a session, say 'I'm someone who studies every day'. Cheesy, but evidence-backed",
          "<strong>Habit stacking</strong> : attach a new habit to an existing one. 'After morning coffee → 10 minutes of Anki'",
        ],
      },
    ],
    tk: "'I want to study' is weak. 'Every Monday at 8 am, at the desk, open chapter 3' is strong. Specificity isn't optional, it's the mechanism.",
    refs: [
      "Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation. American Psychologist, 57(9), 705-717.",
      "Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493-503.",
      "Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69-119.",
      "Bem, D. J. (1972). Self-perception theory. Advances in Experimental Social Psychology, 6, 1-62.",
    ],
  },

  reading: {
    title: "Reading Method",
    sub: "Reading a lot doesn't automatically mean absorbing a lot. The how is what matters.",
    intro:
      "I used to count books finished per year and feel smart. Then I realized that out of 30 books a year, I couldn't articulate the main argument of about 25 of them. The reading was passive, the retrieval was zero.",
    secs: [
      {
        l: "Active vs Passive",
        t: "Adler and Van Doren (1972) in How to Read a Book lay out four levels: elementary, inspectional, analytical, syntopical. Classic, but not empirically tested. What is empirical: McNamara (2004) showed that self-explanation while reading (forcing yourself to explain each sentence) significantly improves comprehension over passive reading. The effect is especially good for complex text and lower-knowledge readers.",
      },
      {
        l: "Marginalia: Annotation That Actually Works",
        t: "Marginalia, notes in the margins, does double duty: it forces the brain to process at read time, and it gives you an anchor for later review. What doesn't work: highlighting without annotation. Dunlosky and colleagues (2013) classify highlighting as 'low utility' in their famous review. Highlighting feels productive, but it usually just creates the illusion of competence. Annotation that demands thinking (questions, reactions, links to other concepts) is far more effective.",
      },
      {
        l: "Routine for Serious Reading",
        li: [
          "<strong>Before opening</strong> : 1 minute. What question are you trying to answer?",
          "<strong>Per paragraph</strong> : if it's a dense paragraph, one sentence in the margin. Not a summary, a question or a reaction",
          "<strong>Per page or sub-chapter</strong> : close the book, blurt for 1-2 minutes. What do you remember?",
          "<strong>Per session</strong> : write a 3-5 bullet summary in Notion or a journal",
          "<strong>Per finished book</strong> : a 500-word review. Post it publicly if you can. Public commitment strengthens encoding",
        ],
      },
      {
        l: "Reading vs Re-Reading",
        t: "This surprises people: re-reading almost always loses to a single read plus recall (Callender & McDaniel, 2009). If you want a retention boost, read once and then test yourself, rather than reading twice. But read + recall + re-read only the parts you struggled with, that combination works. Re-reading a whole book is almost always less efficient for learning, though it can be aesthetically rewarding in its own right.",
      },
    ],
    tk: "Reading is retrieval, not absorption. The moment you can close the book and summarize the chapter without looking, that's when reading became effective.",
    refs: [
      "Adler, M. J., & Van Doren, C. (1972). How to Read a Book. Simon & Schuster.",
      "McNamara, D. S. (2004). SERT: Self-explanation reading training. Discourse Processes, 38(1), 1-30.",
      "Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58.",
      "Callender, A. A., & McDaniel, M. A. (2009). The limited benefits of rereading educational texts. Contemporary Educational Psychology, 34(1), 30-41.",
    ],
  },

  mindmap: {
    title: "Mind Mapping (GRINDE)",
    sub: "Mind maps have evidence for being effective, but not as strong as Buzan claimed. Knowing when they work and when they don't matters.",
    intro:
      "I was skeptical of mind maps for years because the version Tony Buzan popularized felt too much like a sales pitch. Then I tried the more academic, Cornell-flavored version and it clicked. The difference was how serious the encoding process actually was.",
    secs: [
      {
        l: "The Empirical Evidence Is Mixed",
        t: "Farrand, Hussain, and Hennessy (2002) in Medical Education compared mind maps vs standard note-taking in medical students. The result: mind maps improved recall by about 10%. Modest but positive. Nesbit and Adesope (2006) did a meta-analysis of 67 concept/knowledge-mapping studies: effect size d = 0.43 for retention, d = 0.69 for transfer to new domains. Solid result.",
      },
      {
        l: "But Here's the Important Caveat",
        t: "Karpicke and Blunt (2011), already cited under Active Recall, compared mind mapping head-to-head with retrieval practice. Retrieval practice won decisively on both retention and inference. Practical takeaway: mind mapping is useful as an early encoding step (organizing the information), but don't stop there. You still need retrieval practice to lock in retention.",
      },
      {
        l: "GRINDE: The Rules That Make a Map Effective",
        li: [
          "<strong>G</strong>rouped : related items clustered visually",
          "<strong>R</strong>eflective : the map reflects the conceptual structure, not the reading order",
          "<strong>I</strong>nterconnected : cross-links between topics, not just strict hierarchy",
          "<strong>N</strong>on-verbal : use icons, colors, symbols, not just words",
          "<strong>D</strong>irectionality : arrows show direction or causality",
          "<strong>E</strong>mphasize : important items are bigger, bolder, in standout colors",
        ],
      },
      {
        l: "Where GRINDE Came From",
        t: "GRINDE as an acronym is a pop-science framework (Justin Sung and the YouTube study community). No peer-reviewed paper validates this exact mnemonic. But its components are grounded in dual coding theory (Paivio, 1971): visual and verbal information are encoded in different systems, and combining the two strengthens retention. Use GRINDE as a practical checklist, not as a law.",
      },
      {
        l: "This Site Uses GRINDE",
        t: "The mind map on the left follows the principles. L1 nodes are grouped by color category (foundation violet, structure blue, method green, will amber, body pink). Yellow cross-links between conceptually-related topics. Emoji icons for non-verbal cues. Hover previews for directionality. Click the Tools node (green) for the practical implementations. And, new on this version, you can drag any node to wherever you want, and the layout sticks until you hit Reset.",
      },
    ],
    tk: "Mind maps are good for organizing encoding. They don't replace retrieval. Make the map once, then close it and try to redraw it from memory. That's mind mapping with retrieval practice on top.",
    refs: [
      "Farrand, P., Hussain, F., & Hennessy, E. (2002). The efficacy of the 'mind map' study technique. Medical Education, 36(5), 426-431.",
      "Nesbit, J. C., & Adesope, O. O. (2006). Learning with concept and knowledge maps: A meta-analysis. Review of Educational Research, 76(3), 413-448.",
      "Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying with concept mapping. Science, 331(6018), 772-775.",
      "Paivio, A. (1971). Imagery and Verbal Processes. Holt, Rinehart and Winston.",
    ],
  },

  social: {
    title: "Social Layer",
    sub: "Studying alone is possible. But the people around you decide whether your studying sustains.",
    intro:
      "My first year of college, I isolated myself because I thought studying alone was more efficient. My GPA was fine but brittle. Third year, I joined a regular study group, even though my solo hours dropped, my retention went up. The social layer isn't a luxury, it's a mechanism.",
    secs: [
      {
        l: "Peer Learning Has Evidence",
        t: "Topping (2005) meta-analyzed peer learning in higher education: effect of d = 0.55 on academic outcomes, and even larger on motivation and persistence. The mechanism that works: explaining things to other people is retrieval practice plus elaboration. The tutor often learns more than the tutee (Cohen, Kulik, & Kulik, 1982).",
      },
      {
        l: "Community of Practice",
        t: "Lave and Wenger (1991) introduced the concept of a <em>community of practice</em>: learning isn't just information transfer, it's gradual participation in a community that practices the skill. A young chess player becomes a chess player by talking to and playing other chess players. A programmer becomes a programmer through code review and PR discussions. The practical takeaway for a student: join a community (online or in person) in the domain you're studying. Show up, talk, ask questions, even the 'stupid' ones.",
      },
      {
        l: "Mentors: With a Caveat",
        t: "The mentorship literature is mixed. Allen and colleagues (2004) meta-analyzed and found career mentorship at d = 0.20-0.40, modest. The effect is stronger for technical learning: a direct mentor from inside the domain can dramatically shorten your learning time by pointing your attention to the patterns they had to learn the hard way. But be careful not to romanticize mentorship. A good mentor is someone who gives you honest feedback and shapes your practice, not a famous figure you follow at a distance.",
      },
      {
        l: "Practical Steps",
        li: [
          "<strong>Find one serious study partner</strong>. Not a friend who happens to be in your major.",
          "<strong>Schedule a regular weekly review</strong> together. Implementation intentions at the social level.",
          "<strong>Explain things to each other</strong>. You understand X, your partner understands Y. Swap.",
          "<strong>Pick quality online communities</strong> (technical subreddits, course-specific Discords). Avoid flame-prone ones.",
          "<strong>Look for critics, not cheerleaders</strong>. People who only validate you don't help growth.",
        ],
      },
    ],
    tk: "Solo grind has a ceiling. The right community gives you retrieval practice (teaching others), implementation intentions (a social schedule), and identity (being 'a person who studies' among people who study).",
    refs: [
      "Topping, K. J. (2005). Trends in peer learning. Educational Psychology, 25(6), 631-645.",
      "Cohen, P. A., Kulik, J. A., & Kulik, C. C. (1982). Educational outcomes of tutoring. American Educational Research Journal, 19(2), 237-248.",
      "Lave, J., & Wenger, E. (1991). Situated Learning: Legitimate Peripheral Participation. Cambridge University Press.",
      "Allen, T. D., Eby, L. T., Poteet, M. L., Lentz, E., & Lima, L. (2004). Career benefits associated with mentoring for protégés: A meta-analysis. Journal of Applied Psychology, 89(1), 127-136.",
    ],
  },

  body: {
    title: "Body & Sleep",
    sub: "A sleep-deprived brain learns like a laptop with full RAM.",
    intro:
      "I spent two years optimizing study techniques. The thing that produced the biggest single improvement in the end wasn't a technique. It was getting 7 consistent hours of sleep every night. Substrate beats method.",
    secs: [
      {
        l: "Sleep and Consolidation",
        t: "Stickgold and Walker (2013) in Nature Neuroscience describe sleep as <em>memory triage</em>: while you sleep, the brain processes and consolidates the day's memories. Walker and colleagues (2003) showed this dramatically for motor learning: piano practice at night, sleep, and the next morning you wake up 20% better without any extra practice. Without sleep, the improvement is zero. Studying without sleeping after is nearly the same as not studying.",
      },
      {
        l: "Naps and Daytime Sleep",
        t: "Tucker and colleagues (2006): a 60-90 minute nap after a study session helps consolidate both declarative memory (facts) and procedural memory (skills). A 20-minute nap has a smaller benefit but still helps alertness. Cohort studies of students: regular nappers tend to perform slightly better on memory tests than non-nappers.",
      },
      {
        l: "Exercise and Cognition",
        t: "Hillman, Erickson, and Kramer (2008) in Nature Reviews Neuroscience summarized the evidence: aerobic exercise improves executive function, attention, and memory. The mechanism includes BDNF (brain-derived neurotrophic factor), which supports hippocampal neurogenesis. Morning exercise tends to have a stronger cognitive benefit for performance that same day.",
      },
      {
        l: "Brain Plasticity Is Real, Even Late in Life",
        t: "The famous Maguire and colleagues (2000) study: London cab drivers who'd spent years memorizing the city's streets had a measurably larger posterior hippocampus than non-cabbies. Their later longitudinal work (Maguire, Woollett, & Spiers, 2006) tracked the structural changes through training. Neuroplasticity is real and stays active into old age, just slower than it was when you were young.",
      },
      {
        l: "Diet, With a Caveat",
        t: "What's strongly evidenced: low circulating glucose impairs cognition; even 2% dehydration drops cognitive performance. What's more weakly evidenced: specific 'brain foods'. The pop claim about nuts and berries vs sweets has some grounding (simple sugars spike then crash glucose), but the effect is smaller than it's often sold as. What actually matters more: consistent eating and hydration.",
      },
    ],
    tk: "Sleep enough, move regularly, eat consistently. Unglamorous, but it quietly underwrites every other study optimization. Substrate before method.",
    refs: [
      "Stickgold, R., & Walker, M. P. (2013). Sleep-dependent memory triage. Nature Neuroscience, 16(2), 139-145.",
      "Walker, M. P., Brakefield, T., Hobson, J. A., & Stickgold, R. (2003). Dissociable stages of human memory consolidation and reconsolidation. Nature, 425(6958), 616-620.",
      "Hillman, C. H., Erickson, K. I., & Kramer, A. F. (2008). Be smart, exercise your heart: exercise effects on brain and cognition. Nature Reviews Neuroscience, 9(1), 58-65.",
      "Maguire, E. A., et al. (2000). Navigation-related structural change in the hippocampi of taxi drivers. PNAS, 97(8), 4398-4403.",
    ],
  },

  tools: {
    title: "Practice Tools",
    sub: "Every technique on this page has a concrete implementation right here.",
    intro:
      "Reading about spaced repetition without ever using a flashcard app is like reading a swimming book without ever getting in the pool. These tools are deliberately simple so the focus stays on the principle, not the UI.",
    secs: [
      {
        l: "Five Tools Available",
        li: [
          "<strong>⏲️ Pomodoro Timer</strong> : structured focus with a countdown ring. Default 25/5, fully customizable.",
          "<strong>🗂️ Spaced Flashcards</strong> : the Leitner 5-box system. Add cards, drill daily.",
          "<strong>✍️ Blurt Pad</strong> : timer + textarea for retrieval practice without peeking at the material.",
          "<strong>🧩 Feynman Walker</strong> : 4-step prompt for the Feynman technique.",
          "<strong>🔥 3-Pillar Habit Tracker</strong> : track three non-negotiable daily pillars with a streak counter.",
        ],
      },
      {
        l: "How Each Tool Maps to a Concept",
        li: [
          "Pomodoro Timer implements <em>vigilance decrement</em> mitigation (Ariga & Lleras, 2011)",
          "Spaced Flashcards implement the <em>spacing effect</em> (Cepeda et al., 2006) via Leitner boxes",
          "Blurt Pad implements the <em>testing effect</em> (Roediger & Karpicke, 2006) in its purest form",
          "Feynman Walker implements <em>self-explanation</em> and <em>elaborative interrogation</em> (Dunlosky et al., 2013)",
          "Habit Tracker implements <em>implementation intentions</em> (Gollwitzer, 1999) + <em>identity-based habits</em> (self-perception theory)",
        ],
      },
      {
        l: "Privacy Note",
        t: "All tool data is stored locally in your browser (localStorage). No server, no account, no tracking. If you clear your browser data, the data goes with it. For permanent persistence, copy it out manually.",
      },
    ],
    tk: "A tool without practice is the same as a technique without adoption. Pick one, use it consistently for a week, then add the next.",
  },

  feynman: {
    title: "Feynman Method",
    sub: "If you can explain it to a middle schooler, you actually understand it. If you can't, you just memorized the jargon.",
    intro:
      "Richard Feynman once said he didn't understand a topic unless he could explain it to a freshman. That's the highest possible bar, and it explains why almost nobody actually practices it.",
    secs: [
      {
        l: "Four Steps",
        li: [
          "<strong>Step 1, Pick a concept</strong>. Be specific. Not 'physics', 'momentum conservation' or 'time value of money'",
          "<strong>Step 2, Explain it to a 12-year-old</strong>. Write, talk, or teach an imaginary student. Use simple words. No jargon.",
          "<strong>Step 3, Identify the gaps</strong>. Where did you reach for jargon because you couldn't simplify? Where did you get stuck? That's your map of holes.",
          "<strong>Step 4, Simplify and re-explain</strong>. Go back to the source material for the identified gaps, then repeat step 2 with the deeper understanding.",
        ],
      },
      {
        l: "Why It Works",
        t: "The Feynman technique is a combination of three techniques, each with strong evidence. <em>Self-explanation</em> (McNamara, 2004): forcing yourself to explain each step makes encoding deeper. <em>Elaborative interrogation</em> (Dunlosky et al., 2013): asking 'why is this true?' at every claim. <em>Retrieval practice</em> (Roediger & Karpicke, 2006): pulling information from memory, not the book. Feynman fuses all three.",
      },
      {
        l: "When to Use It",
        li: [
          "Topics that feel 'familiar but I'm not sure I get it'",
          "Before a big exam, as a final check of understanding",
          "While reading a technical paper, applied concept by concept",
          "When teaching a friend, the friend is your 12-year-old",
        ],
      },
      {
        l: "Use the Feynman Walker Tool",
        t: "The tools on this page include a Feynman Walker with a guided 4-step structure. It's saved in localStorage, so you can continue across sessions.",
      },
    ],
    tk: "If you can't explain it without jargon, you don't understand it yet. It's a brutal bar, but it's a calibrated one.",
    refs: [
      "McNamara, D. S. (2004). SERT: Self-explanation reading training. Discourse Processes, 38(1), 1-30.",
      "Dunlosky, J., et al. (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4-58.",
    ],
  },

  cornell: {
    title: "Cornell Notes",
    sub: "Not really note-taking, it's an encoding structure plus a built-in self-quiz on the same page.",
    intro:
      "Cornell notes look boring, but the layout isn't what makes them work. What makes them work is that the structure forces you to retrieve <em>after</em> listening/reading, not during.",
    secs: [
      {
        l: "Layout",
        t: "Divide the page into three regions. Right column (~70% width) for the main notes you take during the session. Left column (~25%) for cues, keywords, or questions, filled in <em>after</em> the session. The bottom 5 lines are for a 2-3 sentence summary at the end.",
      },
      {
        l: "The Workflow That Actually Works",
        li: [
          "<strong>During the session</strong> : write in the right column only. Capture main ideas, examples, terminology.",
          "<strong>5-10 minutes after the session</strong> : close the book / laptop. Look at your notes. In the left column, write keywords or questions that the right column answers.",
          "<strong>Before bed (or the next morning)</strong> : write a 2-3 sentence summary at the bottom.",
          "<strong>Review</strong> : cover the right column. Read the left column as a prompt. Try to retrieve the right column from memory. Check yourself.",
        ],
      },
      {
        l: "What Makes Cornell More Than Just a Note",
        t: "The step of filling in the left column is hidden retrieval practice, you're forcing your brain to summarize what was just delivered. The review step using the left column as a cue is the testing effect (Roediger & Karpicke, 2006). Cornell isn't about page format; it's about the encode-retrieve-review loop being built in.",
      },
      {
        l: "Caveat",
        t: "Cornell shows positive but modest effects in the literature. What produces the effect is adherence to the workflow, not the page layout. Many people fill in all three regions at the same time, which kills the retrieval component. Be disciplined about <em>when</em> each region gets filled.",
      },
    ],
    tk: "Cornell works because it forces post-session retrieval and structured review. Without the steps, it's just a note page with a wide margin.",
    refs: [
      "Pauk, W., & Owens, R. J. Q. (2010). How to Study in College (10th ed.). Wadsworth.",
      "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. Psychological Science, 17(3), 249-255.",
    ],
  },

  grinde: {
    title: "GRINDE Rules",
    sub: "Practical rules for making mind maps that aren't just decoration, maps that actually strengthen encoding.",
    intro:
      "Tony Buzan popularized mind maps, but a lot of his versions are basically cute coloring books without any conceptual structure. GRINDE is the study community's attempt to formalize the principles that make a mind map actually work.",
    secs: [
      {
        l: "The Acronym",
        li: [
          "<strong>G, Grouped</strong> : related items sit visually close. Cluster by category, not by input order.",
          "<strong>R, Reflective</strong> : the visual structure mirrors the conceptual structure. Clear hierarchy, clear parent-child relationships.",
          "<strong>I, Interconnected</strong> : cross-links between topics, not strict hierarchy. Real knowledge isn't a tree, it's a web.",
          "<strong>N, Non-verbal</strong> : use icons, symbols, colors. Dual coding (Paivio, 1971): visual + verbal information is encoded in different systems, and the combination is stronger than either alone.",
          "<strong>D, Directionality</strong> : arrows show direction, cause, or dependency. Not just neutral connectors.",
          "<strong>E, Emphasize</strong> : important items are bigger, bolder, in standout colors. The brain processes salient items faster.",
        ],
      },
      {
        l: "How This Site Uses GRINDE",
        li: [
          "<strong>Grouped</strong> : L1 nodes are color-coded by category (foundation violet, structure blue, method green, will amber, body pink)",
          "<strong>Reflective</strong> : root in the middle, L1 spokes around, L2 children outside",
          "<strong>Interconnected</strong> : yellow cross-links between conceptually-related nodes (recall ↔ feynman, spaced ↔ recall, etc.)",
          "<strong>Non-verbal</strong> : emoji icon on every node + category fill color",
          "<strong>Directionality</strong> : rim links dashed for the sequential learning chain, parent links dotted for hierarchy",
          "<strong>Emphasize</strong> : the root is larger, hovered nodes get a brighter halo, non-focused nodes fade",
          "<strong>Drag</strong> : you can also drag any node to wherever helps you think, the layout sticks until you hit Reset",
        ],
      },
      {
        l: "What the Evidence Actually Says",
        t: "GRINDE as a specific acronym has no peer-reviewed validation. But its components do: dual coding theory (Paivio, 1971), spatial organization improving retention (Robinson, 1998), color coding helping chunking. Treat GRINDE as a practical checklist, not as a law of cognition.",
      },
      {
        l: "How to Build One Yourself",
        li: [
          "Start with the topic in the middle",
          "Write 3-7 main sub-topics as branches",
          "Add a small icon next to every node",
          "Use different colors for different categories (max 5-6 colors)",
          "Think about cross-links: which topic connects to which other?",
          "When you're done, close the map and try to redraw it from memory (retrieval practice!)",
        ],
      },
    ],
    tk: "GRINDE is a practical checklist for maps that work. But once the map is done, close it and retrieve. The map is an encoding aid, not a substitute for retrieval.",
    refs: [
      "Paivio, A. (1971). Imagery and Verbal Processes. Holt, Rinehart and Winston.",
      "Robinson, D. H. (1998). Graphic organizers as aids to text learning. Reading Research and Instruction, 37(2), 85-105.",
      "Nesbit, J. C., & Adesope, O. O. (2006). Learning with concept and knowledge maps: A meta-analysis. Review of Educational Research, 76(3), 413-448.",
    ],
  },

  "t-pomo": {
    title: "Pomodoro Timer",
    sub: "Tool: structured focus sessions with scheduled breaks.",
    tool: "pomo",
  },
  "t-flash": {
    title: "Spaced Flashcards (Leitner Box)",
    sub: "Tool: 5-box spaced repetition. Add cards, drill daily.",
    tool: "flash",
  },
  "t-blurt": {
    title: "Blurt Pad",
    sub: "Tool: timed retrieval practice. Pick a topic, blurt everything you remember.",
    tool: "blurt",
  },
  "t-feyn": {
    title: "Feynman Walker",
    sub: "Tool: a 4-step structured walk-through of the Feynman technique.",
    tool: "feyn",
  },
  "t-habit": {
    title: "3-Pillar Habit Tracker",
    sub: "Tool: track 3 non-negotiable daily pillars with a streak counter.",
    tool: "habit",
  },
};

/* ═══ MIND MAP DATA ═══
   Categories: found (foundation/violet), time (blue), method (emerald),
   will (amber), body (pink). sp:true = tool node.
*/
const NODES = [
  {
    id: "root",
    lab: "Learning\nHow to Learn",
    emoji: "🧠",
    cat: "root",
    lv: 0,
    sp: false,
  },
  // Foundation (violet)
  {
    id: "meta",
    lab: "Studying vs\nLearning",
    emoji: "🔍",
    cat: "found",
    lv: 1,
    sp: false,
  },
  {
    id: "reading",
    lab: "Reading\nMethod",
    emoji: "📖",
    cat: "found",
    lv: 1,
    sp: false,
  },
  {
    id: "mindmap",
    lab: "Mind\nMapping",
    emoji: "🗺️",
    cat: "found",
    lv: 1,
    sp: false,
  },
  // Time/Structure (blue)
  {
    id: "time",
    lab: "Time\nArchitecture",
    emoji: "⏱️",
    cat: "time",
    lv: 1,
    sp: false,
  },
  {
    id: "focus",
    lab: "Focus &\nAttention",
    emoji: "🎧",
    cat: "time",
    lv: 1,
    sp: false,
  },
  // Method (emerald)
  {
    id: "recall",
    lab: "Active\nRecall",
    emoji: "♻️",
    cat: "method",
    lv: 1,
    sp: false,
  },
  {
    id: "spaced",
    lab: "Spaced\nRepetition",
    emoji: "📅",
    cat: "method",
    lv: 1,
    sp: false,
  },
  {
    id: "priority",
    lab: "Pareto &\nDeliberate",
    emoji: "🪜",
    cat: "method",
    lv: 1,
    sp: false,
  },
  // Will (amber)
  {
    id: "mindset",
    lab: "Mindset &\nDifficulty",
    emoji: "🌱",
    cat: "will",
    lv: 1,
    sp: false,
  },
  {
    id: "goals",
    lab: "Goals &\nIdentity",
    emoji: "🎯",
    cat: "will",
    lv: 1,
    sp: false,
  },
  // Substrate (pink)
  {
    id: "social",
    lab: "Social\nLayer",
    emoji: "👥",
    cat: "body",
    lv: 1,
    sp: false,
  },
  {
    id: "body",
    lab: "Body &\nSleep",
    emoji: "🛏️",
    cat: "body",
    lv: 1,
    sp: false,
  },
  // Tools (special)
  {
    id: "tools",
    lab: "Practice\nTools",
    emoji: "🔧",
    cat: "method",
    lv: 1,
    sp: true,
  },
  // L2, recall children
  {
    id: "feynman",
    lab: "Feynman\nMethod",
    emoji: "💡",
    cat: "method",
    lv: 2,
    sp: false,
  },
  {
    id: "cornell",
    lab: "Cornell\nNotes",
    emoji: "📝",
    cat: "method",
    lv: 2,
    sp: false,
  },
  // L2, mindmap child
  {
    id: "grinde",
    lab: "GRINDE\nRules",
    emoji: "🎨",
    cat: "found",
    lv: 2,
    sp: false,
  },
  // L2, tool children
  {
    id: "t-pomo",
    lab: "Pomodoro",
    emoji: "⏲️",
    cat: "method",
    lv: 2,
    sp: true,
  },
  {
    id: "t-flash",
    lab: "Flashcards",
    emoji: "🗂️",
    cat: "method",
    lv: 2,
    sp: true,
  },
  {
    id: "t-blurt",
    lab: "Blurt Pad",
    emoji: "✍️",
    cat: "method",
    lv: 2,
    sp: true,
  },
  {
    id: "t-feyn",
    lab: "Feynman\nWalker",
    emoji: "🧩",
    cat: "method",
    lv: 2,
    sp: true,
  },
  {
    id: "t-habit",
    lab: "Habit\nTracker",
    emoji: "🔥",
    cat: "method",
    lv: 2,
    sp: true,
  },
];

const LINKS = [
  // Spokes, root to every L1
  { s: "root", t: "meta", k: "spoke" },
  { s: "root", t: "time", k: "spoke" },
  { s: "root", t: "focus", k: "spoke" },
  { s: "root", t: "recall", k: "spoke" },
  { s: "root", t: "spaced", k: "spoke" },
  { s: "root", t: "priority", k: "spoke" },
  { s: "root", t: "mindset", k: "spoke" },
  { s: "root", t: "goals", k: "spoke" },
  { s: "root", t: "reading", k: "spoke" },
  { s: "root", t: "mindmap", k: "spoke" },
  { s: "root", t: "social", k: "spoke" },
  { s: "root", t: "body", k: "spoke" },
  { s: "root", t: "tools", k: "spoke" },
  // Rim, pedagogical sequential chain
  { s: "meta", t: "time", k: "rim" },
  { s: "time", t: "focus", k: "rim" },
  { s: "focus", t: "recall", k: "rim" },
  { s: "recall", t: "spaced", k: "rim" },
  { s: "spaced", t: "priority", k: "rim" },
  { s: "priority", t: "mindset", k: "rim" },
  { s: "mindset", t: "goals", k: "rim" },
  { s: "goals", t: "reading", k: "rim" },
  { s: "reading", t: "mindmap", k: "rim" },
  // Cross, conceptual bridges
  { s: "spaced", t: "recall", k: "cross" },
  { s: "mindset", t: "priority", k: "cross" },
  { s: "goals", t: "mindset", k: "cross" },
  { s: "reading", t: "recall", k: "cross" },
  { s: "reading", t: "mindmap", k: "cross" },
  { s: "mindmap", t: "recall", k: "cross" },
  { s: "body", t: "mindset", k: "cross" },
  { s: "social", t: "priority", k: "cross" },
  { s: "social", t: "recall", k: "cross" },
  // Parent, L1 to L2 children
  { s: "recall", t: "feynman", k: "parent" },
  { s: "recall", t: "cornell", k: "parent" },
  { s: "mindmap", t: "grinde", k: "parent" },
  // Tools children
  { s: "tools", t: "t-pomo", k: "parent" },
  { s: "tools", t: "t-flash", k: "parent" },
  { s: "tools", t: "t-blurt", k: "parent" },
  { s: "tools", t: "t-feyn", k: "parent" },
  { s: "tools", t: "t-habit", k: "parent" },
  // Tool concept cross-links
  { s: "t-pomo", t: "time", k: "cross" },
  { s: "t-flash", t: "spaced", k: "cross" },
  { s: "t-blurt", t: "recall", k: "cross" },
  { s: "t-feyn", t: "feynman", k: "cross" },
  { s: "t-habit", t: "goals", k: "cross" },
];

const L1 = [
  "meta",
  "reading",
  "mindmap",
  "time",
  "focus",
  "recall",
  "spaced",
  "priority",
  "tools",
  "mindset",
  "goals",
  "social",
  "body",
];
const nmap = {};
NODES.forEach((n) => {
  nmap[n.id] = n;
});

function calcPos(W, H) {
  const cx = W / 2,
    cy = H / 2,
    r1 = Math.min(W, H) * 0.32,
    r2 = Math.min(W, H) * 0.49,
    n = L1.length;
  nmap["root"].x = cx;
  nmap["root"].y = cy;
  L1.forEach((id, i) => {
    const a = -Math.PI / 2 + i * ((2 * Math.PI) / n);
    nmap[id].x = cx + r1 * Math.cos(a);
    nmap[id].y = cy + r1 * Math.sin(a);
  });
  const place = (parentId, childOffsets) => {
    const p = nmap[parentId];
    if (!p) return;
    const dx = p.x - cx,
      dy = p.y - cy;
    const pa = Math.atan2(dy, dx);
    childOffsets.forEach(([id, off]) => {
      const c = nmap[id];
      if (!c) return;
      c.x = cx + r2 * Math.cos(pa + off);
      c.y = cy + r2 * Math.sin(pa + off);
    });
  };
  place("recall", [
    ["feynman", -0.12],
    ["cornell", 0.12],
  ]);
  place("mindmap", [["grinde", 0]]);
  place("tools", [
    ["t-pomo", -0.32],
    ["t-flash", -0.16],
    ["t-blurt", 0],
    ["t-feyn", 0.16],
    ["t-habit", 0.32],
  ]);
}

const mp = document.getElementById("map-panel");
let W = mp.clientWidth,
  H = mp.clientHeight;
calcPos(W, H);

// Adjacency for hover/select highlight + "Connected with" chips
const adj = {};
NODES.forEach((n) => {
  adj[n.id] = new Set();
});
LINKS.forEach((l) => {
  adj[l.s].add(l.t);
  adj[l.t].add(l.s);
});

/* ═══ CONTENT PANEL RENDERER ═══ */
const cp = document.getElementById("cp");

function renderContent(id) {
  const n = nmap[id];
  const t = C[id];
  if (!t) return;
  if (t.tool) {
    renderTool(t.tool);
    return;
  }
  let html = `<div class="content-inner"><div class="content-title">${t.title}</div><div class="content-sub">${t.sub}</div>`;
  if (t.intro) html += `<div class="content-intro">${t.intro}</div>`;
  (t.secs || []).forEach((s) => {
    html += `<div class="sec"><div class="sec-label">${s.l}</div>`;
    if (s.t) html += `<div class="sec-text">${s.t}</div>`;
    if (s.li)
      html += `<ul class="sec-list">${s.li.map((it) => `<li>${it}</li>`).join("")}</ul>`;
    html += "</div>";
  });
  if (t.tk)
    html += `<div class="takeaway"><div class="takeaway-label">Takeaway</div><div class="takeaway-text">${t.tk}</div></div>`;
  if (t.refs && t.refs.length)
    html += `<div class="ref-block"><div class="ref-label">Sources</div><ul class="ref-list">${t.refs.map((r) => `<li>${r}</li>`).join("")}</ul></div>`;
  const related = Array.from(adj[id] || []).filter(
    (rid) => rid !== "root" && C[rid],
  );
  if (related.length) {
    html +=
      '<div class="related-block"><span class="related-label">Connected with</span>';
    related.forEach((rid) => {
      const rn = nmap[rid];
      if (!rn) return;
      html += `<button class="related-chip" data-go="${rid}">${rn.emoji || ""} ${C[rid].title}</button>`;
    });
    html += "</div>";
  }
  html += "</div>";
  cp.innerHTML = html;
  cp.scrollTop = 0;
  cp.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => selectNode(b.getAttribute("data-go"))),
  );
}

function render(id) {
  renderContent(id);
}

/* ═══ MIND MAP RENDER (D3) ═══ */
const svg = d3.select("#mm");
const gZoom = svg.append("g");
const linkG = gZoom.append("g").attr("class", "links");
const nodeG = gZoom.append("g").attr("class", "nodes");

const zoom = d3
  .zoom()
  .scaleExtent([0.4, 2.5])
  .on("zoom", (e) => gZoom.attr("transform", e.transform));
svg.call(zoom);

const R = { 0: 42, 1: 32, 2: 24 };
function linkPath(d) {
  const a = nmap[d.s],
    b = nmap[d.t];
  return `M${a.x},${a.y}L${b.x},${b.y}`;
}

const lsel = linkG
  .selectAll("path")
  .data(LINKS)
  .enter()
  .append("path")
  .attr("d", linkPath)
  .attr("fill", "none")
  .attr("class", (d) => "link link-" + d.k);

const ng = nodeG
  .selectAll("g")
  .data(NODES)
  .enter()
  .append("g")
  .attr("transform", (d) => `translate(${d.x},${d.y})`)
  .attr(
    "class",
    (d) =>
      "node node-lv" +
      d.lv +
      (d.cat ? " cat-" + d.cat : "") +
      (d.sp ? " sp" : ""),
  )
  .style("cursor", "pointer")
  .on("click", (e, d) => {
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
  clearAllToolTimers();
  selectedId = id;
  applyNodeColors();
  if (viewMode === "map") {
    render(id);
  } else {
    const tgt = document.getElementById("essay-sec-" + id);
    if (tgt) tgt.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ═══ NODE DRAG + POSITION PERSISTENCE (Obsidian-style) ═══
   Positions saved per viewport size and re-scaled if the map is resized,
   so a layout you arranged on desktop survives sensibly on mobile. */
const POS_KEY = "learning-node-positions";
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
  const legend = document.createElement("div");
  legend.className = "map-legend";
  const items = [
    { label: "Foundation", color: "var(--violet)" },
    { label: "Time/Focus", color: "var(--accent)" },
    { label: "Method", color: "var(--emerald)" },
    { label: "Mindset", color: "var(--amber)" },
    { label: "Substrate", color: "var(--pink)" },
  ];
  items.forEach((i) => {
    const chip = document.createElement("span");
    chip.className = "legend-chip";
    chip.innerHTML = `<span class="legend-dot" style="background:${i.color}"></span>${i.label}`;
    legend.appendChild(chip);
  });
  mp.appendChild(legend);
})();

/* ═══ VIEW TOGGLE (Mind Map ⟷ Essay) ═══ */
let viewMode = "map";
function setViewMode(m) {
  viewMode = m;
  if (m === "essay") {
    document.body.classList.add("essay-mode");
    renderEssay();
    const btn = document.getElementById("view-toggle");
    if (btn) btn.textContent = "🗺 Map";
  } else {
    document.body.classList.remove("essay-mode");
    if (selectedId) render(selectedId);
    else
      cp.innerHTML =
        '<div class="welcome"><div class="welcome-icon">🧠</div><div class="welcome-title">Choose a topic to start!</div><div class="welcome-sub">Notes from someone trying to learn how to learn.</div><a class="welcome-back" href="https://dimassuryo.com">← dimassuryo.com</a></div>';
    const btn = document.getElementById("view-toggle");
    if (btn) btn.textContent = "📄 Essay";
  }
}

function renderEssay() {
  // Build sequential essay following the pedagogical chain
  const order = [
    "root",
    "meta",
    "time",
    "focus",
    "recall",
    "spaced",
    "priority",
    "mindset",
    "goals",
    "reading",
    "mindmap",
    "feynman",
    "cornell",
    "grinde",
    "social",
    "body",
    "tools",
  ];
  let html = '<div class="essay-doc">';
  order.forEach((id, idx) => {
    const t = C[id];
    if (!t || t.tool) return;
    const isChild = ["feynman", "cornell", "grinde"].includes(id);
    html += `<div class="essay-section${isChild ? " essay-child" : ""}" id="essay-sec-${id}">`;
    html += `<div class="content-title">${t.title}</div>`;
    html += `<div class="content-sub">${t.sub}</div>`;
    if (t.intro) html += `<div class="content-intro">${t.intro}</div>`;
    (t.secs || []).forEach((s) => {
      html += `<div class="sec"><div class="sec-label">${s.l}</div>`;
      if (s.t) html += `<div class="sec-text">${s.t}</div>`;
      if (s.li)
        html += `<ul class="sec-list">${s.li.map((it) => `<li>${it}</li>`).join("")}</ul>`;
      html += "</div>";
    });
    if (t.tk)
      html += `<div class="takeaway"><div class="takeaway-label">Takeaway</div><div class="takeaway-text">${t.tk}</div></div>`;
    if (t.refs && t.refs.length)
      html += `<div class="ref-block"><div class="ref-label">Sources</div><ul class="ref-list">${t.refs.map((r) => `<li>${r}</li>`).join("")}</ul></div>`;
    html += "</div>";
    if (idx < order.length - 1 && !isChild)
      html += '<div class="essay-divider"></div>';
  });
  html += "</div>";
  cp.innerHTML = html;
  cp.scrollTop = 0;
}

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

(function initViewToggle() {
  const btn = document.createElement("button");
  btn.id = "view-toggle";
  btn.className = "view-toggle";
  btn.textContent = "📄 Essay";
  const hdr = document.querySelector("header");
  const themeT = document.getElementById("theme-toggle");
  hdr.insertBefore(btn, themeT);
  btn.addEventListener("click", () =>
    setViewMode(viewMode === "essay" ? "map" : "essay"),
  );
})();

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
  if (viewMode === "essay") {
    setViewMode("map");
    return;
  }
  if (selectedId && selectedId !== "root") selectNode("root");
});

/* ═══ TOOL DISPATCHER ═══ */
const toolTimers = [];
function clearAllToolTimers() {
  toolTimers.forEach((t) => clearInterval(t));
  toolTimers.length = 0;
  // Reset running flags so re-entering tool starts clean
  if (typeof PomoState !== "undefined") {
    PomoState.running = false;
    PomoState._t = null;
  }
  if (typeof BlurtState !== "undefined") {
    BlurtState.running = false;
    BlurtState._t = null;
  }
}

function renderTool(name) {
  clearAllToolTimers();
  if (name === "pomo") return renderPomo();
  if (name === "flash") return renderFlash();
  if (name === "blurt") return renderBlurt();
  if (name === "feyn") return renderFeyn();
  if (name === "habit") return renderHabit();
}

/* ═══ TOOL 1: POMODORO ═══ */
const PomoState = {
  focusMin: 25,
  breakMin: 5,
  phase: "focus",
  timeLeft: 25 * 60,
  running: false,
  sessionsToday: 0,
  today: "",
};

function pomoLoadState() {
  const today = new Date().toDateString();
  const saved = localStorage.getItem("learning-pomo");
  if (saved) {
    try {
      const o = JSON.parse(saved);
      if (o.today === today) PomoState.sessionsToday = o.sessionsToday || 0;
      if (o.focusMin) PomoState.focusMin = o.focusMin;
      if (o.breakMin) PomoState.breakMin = o.breakMin;
    } catch (e) {}
  }
  PomoState.today = today;
  PomoState.timeLeft = PomoState.focusMin * 60;
}
function pomoSaveState() {
  localStorage.setItem(
    "learning-pomo",
    JSON.stringify({
      sessionsToday: PomoState.sessionsToday,
      today: PomoState.today,
      focusMin: PomoState.focusMin,
      breakMin: PomoState.breakMin,
    }),
  );
}
function pomoBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = PomoState.phase === "focus" ? 880 : 660;
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}
function pomoFmt(s) {
  const m = Math.floor(s / 60),
    sc = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sc).padStart(2, "0")}`;
}

function renderPomo() {
  pomoLoadState();
  const totalSec =
    PomoState.phase === "focus"
      ? PomoState.focusMin * 60
      : PomoState.breakMin * 60;
  const pct = 1 - PomoState.timeLeft / totalSec;
  const circumference = 2 * Math.PI * 100;
  const dashOffset = circumference * (1 - pct);
  const isBreak = PomoState.phase === "break";
  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Pomodoro Timer</div>
<div class="tool-sub">Structured focus with scheduled breaks. Based on vigilance decrement mitigation (Ariga & Lleras, 2011). The 25/5 numbers are just defaults, what matters is the consistency, not the ratio.</div>

<div class="pomo-wrap">
<div class="pomo-ring${isBreak ? " is-break" : ""}" id="pomo-ring">
<svg viewBox="0 0 220 220">
<circle class="ring-bg" cx="110" cy="110" r="100"></circle>
<circle class="ring-fg" cx="110" cy="110" r="100"
  stroke-dasharray="${circumference}"
  stroke-dashoffset="${dashOffset}"></circle>
</svg>
<div class="pomo-display">
<div class="pomo-time" id="pomo-time">${pomoFmt(PomoState.timeLeft)}</div>
<div class="pomo-phase" id="pomo-phase">${isBreak ? "BREAK" : "FOCUS"}</div>
</div>
</div>
</div>

<div class="pomo-controls">
<button class="p-btn ${PomoState.running ? "" : "on"}" id="pomo-start">${PomoState.running ? "⏸ Pause" : "▶ Start"}</button>
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
<div><strong id="pomo-sess">${PomoState.sessionsToday}</strong> focus sessions today</div>
<div><strong id="pomo-min">${PomoState.sessionsToday * PomoState.focusMin}</strong> total focus minutes</div>
</div>
</div>`;
  cp.scrollTop = 0;

  const updRing = () => {
    const total =
      PomoState.phase === "focus"
        ? PomoState.focusMin * 60
        : PomoState.breakMin * 60;
    const pp = 1 - PomoState.timeLeft / total;
    const off = circumference * (1 - pp);
    document
      .querySelector("#pomo-ring .ring-fg")
      .setAttribute("stroke-dashoffset", off);
    document.getElementById("pomo-time").textContent = pomoFmt(
      PomoState.timeLeft,
    );
    document.getElementById("pomo-phase").textContent =
      PomoState.phase === "focus" ? "FOCUS" : "BREAK";
    document
      .getElementById("pomo-ring")
      .classList.toggle("is-break", PomoState.phase === "break");
  };

  const tick = () => {
    PomoState.timeLeft--;
    if (PomoState.timeLeft <= 0) {
      pomoBeep();
      if (PomoState.phase === "focus") {
        PomoState.sessionsToday++;
        pomoSaveState();
        document.getElementById("pomo-sess").textContent =
          PomoState.sessionsToday;
        document.getElementById("pomo-min").textContent =
          PomoState.sessionsToday * PomoState.focusMin;
        PomoState.phase = "break";
        PomoState.timeLeft = PomoState.breakMin * 60;
      } else {
        PomoState.phase = "focus";
        PomoState.timeLeft = PomoState.focusMin * 60;
      }
    }
    updRing();
  };

  document.getElementById("pomo-start").addEventListener("click", () => {
    PomoState.running = !PomoState.running;
    const btn = document.getElementById("pomo-start");
    if (PomoState.running) {
      btn.textContent = "⏸ Pause";
      btn.classList.remove("on");
      const t = setInterval(tick, 1000);
      toolTimers.push(t);
      PomoState._t = t;
    } else {
      btn.textContent = "▶ Start";
      btn.classList.add("on");
      if (PomoState._t) {
        clearInterval(PomoState._t);
        PomoState._t = null;
      }
    }
  });

  document.getElementById("pomo-reset").addEventListener("click", () => {
    PomoState.running = false;
    PomoState.phase = "focus";
    PomoState.timeLeft = PomoState.focusMin * 60;
    if (PomoState._t) {
      clearInterval(PomoState._t);
      PomoState._t = null;
    }
    document.getElementById("pomo-start").textContent = "▶ Start";
    document.getElementById("pomo-start").classList.add("on");
    updRing();
  });

  document.getElementById("pomo-skip").addEventListener("click", () => {
    if (PomoState.phase === "focus") {
      PomoState.phase = "break";
      PomoState.timeLeft = PomoState.breakMin * 60;
    } else {
      PomoState.phase = "focus";
      PomoState.timeLeft = PomoState.focusMin * 60;
    }
    updRing();
  });

  const applyDurations = () => {
    const f = parseInt(document.getElementById("pomo-focus").value) || 25;
    const b = parseInt(document.getElementById("pomo-break").value) || 5;
    PomoState.focusMin = Math.max(1, Math.min(180, f));
    PomoState.breakMin = Math.max(1, Math.min(60, b));
    PomoState.timeLeft =
      PomoState.phase === "focus"
        ? PomoState.focusMin * 60
        : PomoState.breakMin * 60;
    PomoState.running = false;
    if (PomoState._t) {
      clearInterval(PomoState._t);
      PomoState._t = null;
    }
    document.getElementById("pomo-start").textContent = "▶ Start";
    document.getElementById("pomo-start").classList.add("on");
    pomoSaveState();
    updRing();
    document.getElementById("pomo-min").textContent =
      PomoState.sessionsToday * PomoState.focusMin;
  };
  document
    .getElementById("pomo-focus")
    .addEventListener("change", applyDurations);
  document
    .getElementById("pomo-break")
    .addEventListener("change", applyDurations);

  document.querySelectorAll("[data-preset]").forEach((b) => {
    b.addEventListener("click", () => {
      const [f, br] = b.getAttribute("data-preset").split(",").map(Number);
      document.getElementById("pomo-focus").value = f;
      document.getElementById("pomo-break").value = br;
      applyDurations();
    });
  });
}

/* ═══ TOOL 2: SPACED FLASHCARDS (Leitner) ═══ */
const LEITNER_INTERVALS = [1, 2, 4, 8, 14]; // days per box (1-indexed via box-1)
const FlashState = { cards: [], idx: 0, flipped: false };
function flashLoad() {
  try {
    const s = localStorage.getItem("learning-flash");
    if (s) FlashState.cards = JSON.parse(s) || [];
  } catch (e) {
    FlashState.cards = [];
  }
}
function flashSave() {
  localStorage.setItem("learning-flash", JSON.stringify(FlashState.cards));
}
function flashIsDue(c) {
  const now = Date.now();
  return !c.nextDue || c.nextDue <= now;
}
function flashGetDue() {
  return FlashState.cards.filter(flashIsDue);
}
function flashNextDueDate(box) {
  return Date.now() + LEITNER_INTERVALS[box - 1] * 86400000;
}

function renderFlash() {
  flashLoad();
  const due = flashGetDue();
  const byBox = [0, 0, 0, 0, 0],
    dueByBox = [0, 0, 0, 0, 0];
  FlashState.cards.forEach((c) => {
    byBox[c.box - 1]++;
    if (flashIsDue(c)) dueByBox[c.box - 1]++;
  });

  let cardHtml = "";
  if (due.length === 0) {
    cardHtml = `<div class="flash-empty">${FlashState.cards.length === 0 ? "No cards yet. Add one below." : "All cards done for today. Come back tomorrow."}</div>`;
  } else {
    const c = due[FlashState.idx % due.length];
    const side = FlashState.flipped ? "back" : "front";
    const text = FlashState.flipped ? c.back : c.front;
    cardHtml = `<div class="flash-card" id="flash-card">
      <div class="flash-side-label">${side}</div>
      <div class="flash-box-label">Box ${c.box}</div>
      <button class="flash-del" id="flash-del" title="Delete this card" aria-label="Delete this card">×</button>
      <div>${text || ""}</div>
    </div>`;
  }

  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Spaced Flashcards (Leitner)</div>
<div class="tool-sub">5-box system: right answer → next box, wrong → back to box 1. Interval per box: 1d, 2d, 4d, 8d, 14d. An implementation of the spacing effect (Cepeda et al., 2006).</div>

<div class="flash-boxes">
${[1, 2, 3, 4, 5].map((b) => `<div class="flash-box${dueByBox[b - 1] > 0 ? " due" : ""}"><div class="flash-box-num">${byBox[b - 1]}</div><div class="flash-box-int">B${b} · ${LEITNER_INTERVALS[b - 1]}d</div></div>`).join("")}
</div>

<div class="sub-label">${due.length > 0 ? `${due.length} card${due.length === 1 ? "" : "s"} due` : "No cards due"}</div>
${cardHtml}

${
  due.length > 0
    ? `<div class="flash-actions">
<button class="p-btn wrong" id="flash-wrong">✗ Forgot (→ Box 1)</button>
<button class="p-btn right" id="flash-right">✓ Got it (next box)</button>
</div>`
    : ""
}

<div class="sub-label">Add a new card</div>
<div class="flash-add">
<input type="text" id="flash-front" placeholder="Question / front (e.g. 'What is the testing effect?')">
<textarea id="flash-back" placeholder="Answer / back"></textarea>
<div class="add-row">
<span class="add-hint">Total: ${FlashState.cards.length} card${FlashState.cards.length === 1 ? "" : "s"}</span>
<button class="p-btn on" id="flash-add">+ Add</button>
</div>
</div>

${FlashState.cards.length > 0 ? `<button class="habit-reset" id="flash-reset">Reset all cards</button>` : ""}
</div>`;
  cp.scrollTop = 0;

  const card = document.getElementById("flash-card");
  if (card) {
    card.addEventListener("click", () => {
      FlashState.flipped = !FlashState.flipped;
      renderFlash();
    });
  }

  const delBtn = document.getElementById("flash-del");
  if (delBtn)
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dueNow = flashGetDue();
      const c = dueNow[FlashState.idx % dueNow.length];
      if (
        confirm("Delete this card?\n\nFront: " + (c.front || "").slice(0, 60))
      ) {
        FlashState.cards = FlashState.cards.filter((x) => x.id !== c.id);
        FlashState.flipped = false;
        flashSave();
        renderFlash();
      }
    });

  const rightBtn = document.getElementById("flash-right");
  if (rightBtn)
    rightBtn.addEventListener("click", () => {
      const dueNow = flashGetDue();
      const c = dueNow[FlashState.idx % dueNow.length];
      if (c.box < 5) c.box++;
      c.lastSeen = Date.now();
      c.nextDue = flashNextDueDate(c.box);
      FlashState.flipped = false;
      flashSave();
      renderFlash();
    });

  const wrongBtn = document.getElementById("flash-wrong");
  if (wrongBtn)
    wrongBtn.addEventListener("click", () => {
      const dueNow = flashGetDue();
      const c = dueNow[FlashState.idx % dueNow.length];
      c.box = 1;
      c.lastSeen = Date.now();
      c.nextDue = flashNextDueDate(1);
      FlashState.flipped = false;
      flashSave();
      renderFlash();
    });

  document.getElementById("flash-add").addEventListener("click", () => {
    const f = document.getElementById("flash-front").value.trim();
    const b = document.getElementById("flash-back").value.trim();
    if (!f || !b) return;
    FlashState.cards.push({
      id: Date.now() + Math.random(),
      front: f,
      back: b,
      box: 1,
      lastSeen: 0,
      nextDue: 0,
    });
    flashSave();
    renderFlash();
  });

  const resetBtn = document.getElementById("flash-reset");
  if (resetBtn)
    resetBtn.addEventListener("click", () => {
      if (confirm("Delete all cards? This cannot be undone.")) {
        FlashState.cards = [];
        FlashState.idx = 0;
        FlashState.flipped = false;
        flashSave();
        renderFlash();
      }
    });
}

/* ═══ TOOL 3: BLURT PAD ═══ */
const BlurtState = {
  topic: "",
  duration: 300,
  timeLeft: 300,
  running: false,
  text: "",
};
function renderBlurt() {
  const min = Math.floor(BlurtState.timeLeft / 60),
    sec = BlurtState.timeLeft % 60;
  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Blurt Pad</div>
<div class="tool-sub">Pick a topic, set the duration, write everything you remember without looking at the material. Then compare to the source to find your gaps. The purest possible implementation of the testing effect (Roediger & Karpicke, 2006).</div>

<div class="blurt-topbar">
<input type="text" id="blurt-topic" placeholder="Topic (e.g. 'Spacing effect')" value="${BlurtState.topic}">
<select id="blurt-dur" class="p-btn">
<option value="180"${BlurtState.duration === 180 ? " selected" : ""}>3 min</option>
<option value="300"${BlurtState.duration === 300 ? " selected" : ""}>5 min</option>
<option value="600"${BlurtState.duration === 600 ? " selected" : ""}>10 min</option>
<option value="900"${BlurtState.duration === 900 ? " selected" : ""}>15 min</option>
</select>
<div class="blurt-timer${BlurtState.running ? "" : " idle"}" id="blurt-timer">${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}</div>
<button class="p-btn on" id="blurt-toggle">${BlurtState.running ? "⏸ Pause" : "▶ Start"}</button>
<button class="p-btn" id="blurt-reset">↻ Reset</button>
</div>

<textarea class="blurt-textarea" id="blurt-text" placeholder="Write everything you remember about this topic, without looking at the material. Doesn't need to be tidy. Doesn't need to be complete. What matters is effortful retrieval.">${BlurtState.text}</textarea>
<div class="blurt-wordcount" id="blurt-wc">0 words</div>

<div class="sec">
<div class="sec-label">When You're Done</div>
<div class="sec-text">Compare what you wrote to the source material. What you missed is your map of understanding-gaps. Add new flashcards for the gaps, or schedule a re-read of those areas.</div>
</div>
</div>`;
  cp.scrollTop = 0;

  const ta = document.getElementById("blurt-text");
  ta.addEventListener("input", () => {
    BlurtState.text = ta.value;
    const wc = ta.value.trim().split(/\s+/).filter(Boolean).length;
    document.getElementById("blurt-wc").textContent =
      `${wc} word${wc === 1 ? "" : "s"}`;
  });
  // Trigger initial word count
  const wc = ta.value.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById("blurt-wc").textContent = `${wc} kata`;

  document.getElementById("blurt-topic").addEventListener("input", (e) => {
    BlurtState.topic = e.target.value;
  });
  document.getElementById("blurt-dur").addEventListener("change", (e) => {
    BlurtState.duration = parseInt(e.target.value);
    BlurtState.timeLeft = BlurtState.duration;
    BlurtState.running = false;
    if (BlurtState._t) {
      clearInterval(BlurtState._t);
      BlurtState._t = null;
    }
    const tm = document.getElementById("blurt-timer");
    const m = Math.floor(BlurtState.timeLeft / 60),
      s = BlurtState.timeLeft % 60;
    tm.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    tm.classList.add("idle");
    document.getElementById("blurt-toggle").textContent = "▶ Start";
  });

  document.getElementById("blurt-toggle").addEventListener("click", () => {
    BlurtState.running = !BlurtState.running;
    const btn = document.getElementById("blurt-toggle");
    const tm = document.getElementById("blurt-timer");
    if (BlurtState.running) {
      btn.textContent = "⏸ Pause";
      tm.classList.remove("idle");
      const t = setInterval(() => {
        BlurtState.timeLeft--;
        if (BlurtState.timeLeft <= 0) {
          BlurtState.running = false;
          BlurtState.timeLeft = 0;
          clearInterval(t);
          BlurtState._t = null;
          tm.textContent = "00:00";
          btn.textContent = "▶ Start";
          try {
            const ctx = new (
              window.AudioContext || window.webkitAudioContext
            )();
            const o = ctx.createOscillator(),
              g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 660;
            g.gain.setValueAtTime(0.18, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            o.start();
            o.stop(ctx.currentTime + 0.8);
          } catch (e) {}
          return;
        }
        const m = Math.floor(BlurtState.timeLeft / 60),
          s = BlurtState.timeLeft % 60;
        tm.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }, 1000);
      toolTimers.push(t);
      BlurtState._t = t;
    } else {
      btn.textContent = "▶ Start";
      tm.classList.add("idle");
      if (BlurtState._t) {
        clearInterval(BlurtState._t);
        BlurtState._t = null;
      }
    }
  });

  document.getElementById("blurt-reset").addEventListener("click", () => {
    BlurtState.running = false;
    BlurtState.timeLeft = BlurtState.duration;
    BlurtState.text = "";
    if (BlurtState._t) {
      clearInterval(BlurtState._t);
      BlurtState._t = null;
    }
    document.getElementById("blurt-text").value = "";
    document.getElementById("blurt-wc").textContent = "0 kata";
    const tm = document.getElementById("blurt-timer");
    const m = Math.floor(BlurtState.timeLeft / 60),
      s = BlurtState.timeLeft % 60;
    tm.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    tm.classList.add("idle");
    document.getElementById("blurt-toggle").textContent = "▶ Start";
  });
}

/* ═══ TOOL 4: FEYNMAN WALKER ═══ */
const FEYN_STEPS = [
  {
    short: "Pick",
    title: "Pick a concept",
    prompt:
      "What concept do you want to test your understanding of? Be specific. Not 'physics', 'momentum conservation' or 'time value of money'.",
  },
  {
    short: "Explain",
    title: "Explain it to a 12-year-old",
    prompt:
      "Write the explanation in language a middle schooler could follow. No jargon. No technical shorthand. If you have to reach for jargon, you probably can't simplify it yet.",
  },
  {
    short: "Gap",
    title: "Identify the gaps",
    prompt:
      "Read your explanation back. Where did you reach for jargon because you couldn't simplify? Where did you get stuck? Write 2-3 specific bullet points about the holes in your understanding.",
  },
  {
    short: "Review",
    title: "Simplify and re-explain",
    prompt:
      "Go back to the source material for the gaps you identified. Then rewrite your explanation, this time simpler. Use analogies or examples if you need to.",
  },
];
const FeynState = {
  concept: "",
  step: 0,
  answers: ["", "", "", ""],
  sessions: [],
};
function feynLoad() {
  try {
    const s = localStorage.getItem("learning-feyn");
    if (s) {
      const o = JSON.parse(s);
      if (o.sessions) FeynState.sessions = o.sessions;
    }
  } catch (e) {}
}
function feynSave() {
  localStorage.setItem(
    "learning-feyn",
    JSON.stringify({ sessions: FeynState.sessions }),
  );
}

function renderFeyn() {
  feynLoad();
  const st = FeynState.step;
  const stepInfo = FEYN_STEPS[st];

  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">Feynman Walker</div>
<div class="tool-sub">A 4-step structured walk-through of the Feynman technique. If you can explain it without jargon, you actually understand it. Implements self-explanation + elaborative interrogation + retrieval practice (Dunlosky et al., 2013).</div>

<div class="feyn-steps">
${FEYN_STEPS.map((s, i) => `<div class="feyn-step-pill ${i === st ? "on" : i < st ? "done" : ""}"><span class="feyn-step-num">${i + 1}</span>${s.short}</div>`).join("")}
</div>

<div class="sec-label">Step ${st + 1}, ${stepInfo.title}</div>
<div class="feyn-prompt">${stepInfo.prompt}</div>

${st === 0 ? `<input type="text" class="blurt-topbar" style="width:100%;padding:12px 14px;background:var(--card);border:1px solid var(--border);color:var(--text);font-family:var(--font);font-size:14px;border-radius:var(--radius-sm);outline:none;margin-bottom:12px" id="feyn-concept" placeholder="e.g. Spacing effect, Black-Scholes pricing, Photosynthesis Calvin cycle..." value="${FeynState.concept}">` : ""}

<textarea class="feyn-textarea" id="feyn-text" placeholder="${st === 0 ? "Or write the concept and any context here..." : "Write your answer here..."}">${FeynState.answers[st]}</textarea>

<div class="feyn-nav">
<button class="p-btn" id="feyn-prev" ${st === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ""}>← Previous step</button>
${st < 3 ? `<button class="p-btn on" id="feyn-next">Next step →</button>` : `<button class="p-btn on" id="feyn-save">💾 Save & Reset</button>`}
</div>

${
  FeynState.sessions.length > 0
    ? `<div class="sec" style="margin-top:30px">
<div class="sec-label">Previous Sessions (${FeynState.sessions.length})</div>
<ul class="sec-list">
${FeynState.sessions
  .slice(-5)
  .reverse()
  .map(
    (s, i) =>
      `<li><strong>${s.concept || "(no title)"}</strong> · ${new Date(s.date).toLocaleDateString("en-US")}</li>`,
  )
  .join("")}
</ul>
</div>`
    : ""
}
</div>`;
  cp.scrollTop = 0;

  const ta = document.getElementById("feyn-text");
  ta.addEventListener("input", () => {
    FeynState.answers[st] = ta.value;
  });
  const conceptIn = document.getElementById("feyn-concept");
  if (conceptIn)
    conceptIn.addEventListener("input", (e) => {
      FeynState.concept = e.target.value;
    });

  document.getElementById("feyn-prev").addEventListener("click", () => {
    if (FeynState.step > 0) {
      FeynState.step--;
      renderFeyn();
    }
  });
  const nextBtn = document.getElementById("feyn-next");
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      FeynState.step++;
      renderFeyn();
    });
  const saveBtn = document.getElementById("feyn-save");
  if (saveBtn)
    saveBtn.addEventListener("click", () => {
      FeynState.sessions.push({
        date: Date.now(),
        concept: FeynState.concept,
        answers: [...FeynState.answers],
      });
      feynSave();
      FeynState.concept = "";
      FeynState.step = 0;
      FeynState.answers = ["", "", "", ""];
      renderFeyn();
    });
}

/* ═══ TOOL 5: HABIT TRACKER (3-Pillar) ═══ */
const PILLARS = [
  {
    key: "body",
    icon: "💪",
    title: "Body",
    sub: "1 hour: exercise, lifting, cardio, or yoga",
  },
  {
    key: "consume",
    icon: "📚",
    title: "Consume",
    sub: "1 hour: reading, podcasts, courses, discussion",
  },
  {
    key: "create",
    icon: "✍️",
    title: "Create",
    sub: "1 hour: writing, drawing, code, music, reflection",
  },
];
function habitLoad() {
  try {
    const s = localStorage.getItem("learning-habit");
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return {};
  }
}
function habitSave(data) {
  localStorage.setItem("learning-habit", JSON.stringify(data));
}
function habitKey(d) {
  const dt = d || new Date();
  return dt.toISOString().slice(0, 10);
}

function renderHabit() {
  const data = habitLoad();
  const today = habitKey();
  const todayData = data[today] || {
    body: false,
    consume: false,
    create: false,
  };

  // Calculate streak, consecutive days with at least 1 pillar
  let streak = 0;
  const d = new Date();
  while (true) {
    const k = habitKey(d);
    const v = data[k];
    if (!v) break;
    const count = (v.body ? 1 : 0) + (v.consume ? 1 : 0) + (v.create ? 1 : 0);
    if (count === 0) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  // Full-streak (all 3 pillars) streak
  let fullStreak = 0;
  const d2 = new Date();
  while (true) {
    const k = habitKey(d2);
    const v = data[k];
    if (!v) break;
    if (!(v.body && v.consume && v.create)) break;
    fullStreak++;
    d2.setDate(d2.getDate() - 1);
  }

  // Total days with at least 1
  const totalDays = Object.values(data).filter(
    (v) => (v.body ? 1 : 0) + (v.consume ? 1 : 0) + (v.create ? 1 : 0) > 0,
  ).length;

  // 14-day heatmap (oldest left, today right)
  const cells = [];
  for (let i = 13; i >= 0; i--) {
    const dd = new Date();
    dd.setDate(dd.getDate() - i);
    const k = habitKey(dd);
    const v = data[k] || {};
    const count = (v.body ? 1 : 0) + (v.consume ? 1 : 0) + (v.create ? 1 : 0);
    cells.push({
      date: k,
      count,
      isToday: i === 0,
      label: dd.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
    });
  }

  cp.innerHTML = `<div class="tool-wrap">
<div class="tool-title">3-Pillar Habit Tracker</div>
<div class="tool-sub">Track three non-negotiable hours a day. Implements implementation intentions (Gollwitzer, 1999) + identity-based habits (self-perception theory, Bem 1972). The number 3 hours is a rule of thumb, not magic, consistency is what matters.</div>

<div class="habit-streak">
<div class="habit-stat"><div class="habit-stat-num">${streak}</div><div class="habit-stat-label">Day Streak</div></div>
<div class="habit-stat"><div class="habit-stat-num">${fullStreak}</div><div class="habit-stat-label">Full Streak</div></div>
<div class="habit-stat"><div class="habit-stat-num">${totalDays}</div><div class="habit-stat-label">Total Days</div></div>
</div>

<div class="sub-label">Today</div>
<div class="habit-pillars">
${PILLARS.map(
  (
    p,
  ) => `<div class="habit-pillar${todayData[p.key] ? " done" : ""}" data-pillar="${p.key}">
<div class="habit-pillar-icon">${p.icon}</div>
<div class="habit-pillar-text">
<div class="habit-pillar-title">${p.title}</div>
<div class="habit-pillar-sub">${p.sub}</div>
</div>
<div class="habit-check">${todayData[p.key] ? "✓" : ""}</div>
</div>`,
).join("")}
</div>

<div class="sub-label">Last 14 Days</div>
<div class="habit-grid">
${cells.map((c) => `<div class="habit-cell ${c.count >= 3 ? "l3" : c.count === 2 ? "l2" : c.count === 1 ? "l1" : ""}${c.isToday ? " today" : ""}" title="${c.label}: ${c.count}/3"></div>`).join("")}
</div>
<div class="habit-legend">
0 <span class="habit-legend-cell" style="background:var(--bg);border:1px solid var(--border)"></span>
<span class="habit-legend-cell" style="background:var(--amber-ghost)"></span>
<span class="habit-legend-cell" style="background:var(--amber-dim)"></span>
<span class="habit-legend-cell" style="background:var(--amber)"></span> 3
</div>

<button class="habit-reset" id="habit-reset">Reset all data</button>
</div>`;
  cp.scrollTop = 0;

  document.querySelectorAll(".habit-pillar").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-pillar");
      const data = habitLoad();
      if (!data[today])
        data[today] = { body: false, consume: false, create: false };
      data[today][key] = !data[today][key];
      habitSave(data);
      renderHabit();
    });
  });

  document.getElementById("habit-reset").addEventListener("click", () => {
    if (
      confirm(
        "Delete all habit data? Streak, history, everything. Cannot be undone.",
      )
    ) {
      localStorage.removeItem("learning-habit");
      renderHabit();
    }
  });
}

/* ═══ INIT ═══ */
selectedId = "root";
applyNodeColors();
setViewMode(viewMode);
