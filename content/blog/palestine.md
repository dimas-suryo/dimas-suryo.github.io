---
title: "Doing the Calculus on Peace"
date: 2025-04-04
draft: false
summary: "An attempt to settle Israel-Palestine by elimination: treat the ethno-state and the two-state solution as systems, find where each one breaks, and see what survives. What survives is one democratic secular state."
---

{{< figure src="/images/blog/palestine/image1.jpeg" alt="Posters: The Palestinian Museum Digital Archive" caption="Posters: The Palestinian Museum Digital Archive" >}}

_Epistemic status: fairly confident in the structure of the argument, much less confident in the numbers I feed into it. Also, no, I didn't actually use calculus. 😢_

The short version, for people who won't read four thousand words about this (a reasonable choice): an ethno-state has to hold a population that is already about half non-Jewish, which takes repression that must keep rising forever, and a system like that has no steady state. The two-state solution needs more than 700,000 illegal settlers, plus fifty-seven years of shared roads, water, and power lines, to be pulled apart peacefully, which nobody has ever done. If those two options fall, the only architecture left standing is a single democratic, secular state.

## I.

I'm not sure where to start with this. Flip it.

Every argument about Israel-Palestine I've watched ends in the same place: both sides shouting, nobody moving, everyone exhausted. My guess, and I hold it loosely, is that the argument starts from the wrong premises, which are usually morality and religion. Morality matters, but in this particular debate it has one fatal property: moral claims can't be falsified. You can't change someone's moral conviction with a table of numbers, and so the debate never ends. As far as I can tell, it was never set up to end.

So, as a thought experiment, I want to treat it as a maths problem instead.

Take the land between the Jordan River and the Mediterranean as a system. It has variables, constraints, and feedback loops. "Who has the most right to be there" is a real question, but I'm going to set it aside and ask a narrower one: which system architecture is most likely to settle into a stable equilibrium without risking ruin (the fat-tailed, can't-come-back-from-it kind of outcome Taleb keeps warning about)?

Here is the thesis I'll defend. Both existing models, the ethno-state (Zionism) and the two-state solution, fail logically and empirically, and the failure has become much harder to dispute since Israeli governments started legitimizing settler annexation of Palestinian land. Eliminate both, and one model is left: a single democratic, secular state.

I'm going to argue this without leaning on morality at all, which means I owe both rival positions their strongest versions first.

The strongest Zionist argument skips "God gave us this land" (easy to refute) and goes like this: after the Holocaust, a people that had been hunted and killed across most of Western civilization for two thousand years needs a physical place it can defend militarily. Think of it as existential insurance. I think that's a reasonably valid argument, and I respect it.

The two-state side deserves the same treatment. Its best argument says that two communities with overlapping historical traumas can only build healthy political identities if each first gets sovereign space of its own. Integrate them too early, with no foundation of trust, and you get Yugoslavia instead of South Africa.

I grant both arguments in full. What I want to show is that even if you accept the strongest version of each, the conclusion comes out the same.

{{< figure src="/images/blog/palestine/image2.jpeg" alt="Mapping how Israel's land grabs are reshaping the occupied West Bank" caption="<a href=&quot;https://www.aljazeera.com/news/2025/3/30/mapping-how-israels-land-grabs-are-reshaping-the-occupied-west-bank&quot;>Mapping how Israel's land grabs are reshaping the occupied West Bank</a> (Al Jazeera, 2025)" >}}

## II.

Start with the ethno-state. My claim is that Zionism, as a state project on land with this demography, destroys itself.

Whitehead and Russell needed a few hundred pages of _Principia Mathematica_ before they could prove that 1 + 1 = 2. They never doubted the result. They wanted it to follow necessarily from basic axioms, leaving no room for "but my feelings tell me otherwise". I want to do something similar on a much smaller scale: take premises that are already on the table and show that a conclusion which looks controversial follows from them.

{{< figure src="/images/blog/palestine/image3.jpeg" alt="The Organic Chemistry Tutor" caption="Courtesy of The Organic Chemistry Tutor" >}}

### The thermodynamics argument

Let's start from first principles. Systems thinking borrows an idea, loosely, from thermodynamics: a system that fights its own tendency to drift needs a steady and growing input of energy, or it eventually falls apart. Applied to politics this is an analogy, and I'll treat it as one. It earns its place because the maths underneath it turns out to be real, as we'll see in a moment.

An ethno-state is, by definition, a system that tries to hold a particular demographic composition inside a given territory. The trouble is that demographics move: populations grow, shrink, migrate, and age. Right now the population between the Jordan and the Mediterranean is roughly 50/50, about 7.2 million Israeli Jews and 7.4 million Palestinian Arabs.

To keep a Jewish ethno-state with that composition, the system needs one of two things. The first is permanent repression: mobility controls, legalized discrimination, restrictions on political rights. The second is forcibly changing the demographic composition, which international law calls ethnic cleansing.

The first option creates what systems dynamics calls a reinforcing feedback loop. Repression provokes resistance, resistance provokes escalation, escalation provokes harsher repression, and so on around the circle. The loop has no equilibrium point; it keeps escalating until one of the variables breaks. The second option is a war crime, and in practice it triggers an international response that speeds up the collapse anyway.

So, through a systems lens, the ethno-state can't reach a steady state. I'm trying hard not to make a moral claim here: the problem is an architecture that's incompatible with demographic reality, and it would be a problem even if everyone inside it were a saint. This is consistent with Nassim Taleb's reading that the Israeli state, as currently configured, isn't antifragile.

Now the maths. Define

_DA(t)_ = Arab population at time _t_

_DJ(t)_ = Jewish population at time _t_

The demographic data show that the Arab population grows faster than the Jewish one:

_dDA/dt > dDJ/dt_

Next comes a modelling assumption. I think it's the natural one, but it is an assumption: the level of suppression needed to hold the ethno-state, _σ(t)_, is proportional to the ratio between the two populations.

_σ(t) ∝ DA(t)/DJ(t)_

Since _DA(t)/DJ(t)_ keeps increasing with _t_,

_dσ/dt > 0 ∀t_

The required repression has no ceiling. A system that needs unbounded input to survive isn't sustainable, and that conclusion comes from the demographic data plus one plain assumption, with no political prediction involved.

The feedback loop from a few paragraphs ago can be written as a tiny system of differential equations:

_d(Repression)/dt = α · Resistance, d(Resistance)/dt = β · Repression_

where _α, β > 0_. The matrix of this system has two eigenvalues, _+√(αβ)_ and _−√(αβ)_. The negative one belongs to a direction in which one of the two quantities would have to be negative, which is impossible for real repression and real resistance. So from any actual starting point the positive eigenvalue takes over, and both variables grow exponentially. The only fixed point is zero repression with zero resistance, and it's a saddle: unstable, so the slightest push sets the loop running.

Go back now to "existential insurance", the strongest Zionist argument from Section I. The legitimate need behind it, a defensible home, is exactly what an ethno-state caught in a runaway loop fails to deliver. A state with a 50/50 population and ever-rising repression becomes harder to defend over time. Real existential insurance needs a stable system, and under this analysis stability can only come from hard constitutional guarantees that protect both communities. Repression with _dσ/dt > 0_ has no upper bound, so it can't be the thing that provides it.

### The consistency problem

There's also a logical problem that gets missed a lot, and I think it deserves some time.

The main Zionist argument says that the Jewish people, as a group that has suffered long persecution, are entitled to self-determination on their ancestral land. I don't want to invalidate the experience that argument starts from. But a principle like this has to pass Kant's universalizability test: can you apply it to everyone without producing a contradiction?

As far as I can tell, it can't. The Palestinian Arab population, present in the same territory for centuries, has a structurally identical claim. Granting self-determination to one group while denying it to another group in the same structural position is a logical contradiction.

In formal logic, with these definitions,

_P(x)_ = "group x has experienced long persecution"

_H(x)_ = "group x has a historical claim to the territory"

_S(x)_ = "group x has a right to self-determination on the territory"

the Zionist premise, which Zionists assert themselves, is

*Pr*𝓏 _. P(Jews) ∧ H(Jews) → S(Jews)_

If the principle is valid, it has to survive being universalized:

_Universalised. ∀x [P(x) ∧ H(x) → S(x)]_

Now plug in the empirical data:

_P(Palestinians)_, empirically true, 1948 Nakba and 57 years of occupation.

_H(Palestinians)_, empirically true, continuous presence for centuries, millennia even.

By modus ponens,

_∀x [P(x) ∧ H(x) → S(x)], P(Pal) ∧ H(Pal) ⊢ S(Palestinians)_

But Zionism also asserts

*Pr*𝓏 _. ¬S(Palestinians)_

and there's the contradiction:

_S(Palestinians) ∧ ¬S(Palestinians) ⊢ ⊥_

⊥ is logic notation for a contradiction, and a principle that produces one is inconsistent. None of this depends on how much empathy you feel for either side. It's what happens to Zionism once you treat it as a universal principle and apply it evenly.

The usual reply is that the historical situations are different and the claims aren't apples to apples. I don't think that rescues the principle. What the reply actually does is redefine _P_ and _H_, adding conditions until only Jews qualify. That's an ad hoc modification, extra assumptions added to protect a conclusion you already wanted, and catching exactly that move is what the universalizability test is for. A principle that only works for one case is an exception wearing a principle's clothes.

_Quod erat demonstrandum._

## III.

{{< figure src="/images/blog/palestine/image4.png" alt="One Democratic State Campaign" caption="One Democratic State Campaign, Palestinian-led campaign against the Zionist Israeli government." >}}

### Two states: many assumptions, thin probability

The strongest version of the two-state case: "Even if the infrastructure is entangled, separation can happen in stages. Look at Czechoslovakia, which split into the Czech Republic and Slovakia in 1993 without bloodshed." The precedent is real, and people invoke it often.

I think the Velvet Divorce worked because of two conditions that are missing here. Both sides actively wanted to separate, and neither side had 700,000 illegal settlers already embedded inside the other's territory. Remove those two conditions and the analogy falls apart.

The deeper problem is the number of things that have to go right. Occam's Razor says that between two hypotheses that explain the same facts, you should prefer the one that needs fewer assumptions, since every extra assumption is one more place to be wrong. The two-state solution needs all of the following to hold at once:

- A₁. The more than 700,000 illegal Israeli settlers in the West Bank can be relocated, or can accept Palestinian citizenship, peacefully.

- A₂. The water systems, road network, and electric grid that have been entangled for 57 years can be logistically disentangled.

- A₃. Gaza (under Hamas) and the West Bank (under Fatah) can function as one coherent state entity.

- A₄. Two separate economies can stand on their own without sabotaging each other during the transition.

- A₅. There is enough political will on both sides to execute all of the above simultaneously.

Be generous and give each assumption a 70% chance of working out, which is already optimistic. If the five were independent, the chance that all of them hold would be

**P(two-state succeeds) = 0.7⁵ = 0.168 ≈ 17%**

That number comes with a caveat that cuts against my own case. The assumptions are positively correlated (a government with enough political will for A₅ is also more likely to manage A₁), and positive correlation pushes the joint probability up, so 17% is, if anything, too pessimistic. I don't want to lean on the multiplication at all. The stronger argument is structural, and it needs no probabilities.

Borrowing Taleb's framing, every assumption on that list is a single point of failure. Picture a chain with five critical links: it takes only one broken link for the chain to fail, and A₁ alone is enough. More than 700,000 illegal Israeli settlers already have roads, water, electricity, and internet wired into the Israeli system. At this point it's an infrastructure problem more than a question of political will, and I don't know of any case in modern history where a settlement this large and this entangled has been peacefully unwound.

Formally, let _S_ be the event "two-state succeeds". Then

_S ≡ A₁ ∧ A₂ ∧ A₃ ∧ A₄ ∧ A₅_

This is a conjunction of necessary conditions, so

_¬Aᵢ ⊢ ¬S for any i ∈ {1,2,3,4,5}_

The failure of any single _Aᵢ_ is enough to sink the whole plan, which is a much stricter condition than probability multiplication. You don't need each probability; you only need to show that one condition fails. For A₁, relocating or integrating 700,000 embedded settlers has, by every historical base rate I'm aware of, never been done in a comparable setting. So

_∴ ¬A₁_

_∴ ¬S._

That's a base rate plus a syllogism. You can dispute the base rate (and if you know a counterexample, I want to hear it), but there's no ideology hiding in either step.

What about a confederation, two sovereign states with shared institutions and open borders? It gets proposed as a fourth option, and I think it collapses into one of the other two. If the shared institutions are deep enough to work, what you have is one state with extra layers of bureaucracy; if they're shallow enough to preserve full sovereignty, you're back to two states with all the same failure modes. As far as I can see, a confederation is an unstable equilibrium that drifts toward one of the endpoints, so the disjunction stays exhaustive.

## IV.

{{< figure src="/images/blog/palestine/image5.png" >}}

This is the part I'm most nervous about. You might worry that I sound like someone who got too excited about game theory and forgot that real people are losing their families on the ground, someone with no skin in the game. I know. I feel sad about it, and I'm doing what I can. I think structural analysis matters because empathy alone keeps failing to end this, and it helps to understand why.

I don't think people on either side refuse peace. I think the system gives them no room for it, and the system is what has to change.

Scott Alexander has a name for this kind of system in "Meditations on Moloch": Moloch, the god of situations where everyone follows their incentives into an outcome nobody wants. Game theorists call it a multipolar trap.

The situation can be modelled, fairly accurately I think, as an iterated prisoner's dilemma, one of the most useful frameworks in game theory. The setup: two players, two choices (cooperate or defect), and a payoff matrix that looks roughly like this.

{{< figure src="/images/blog/palestine/image6.png" alt="Payoff Matrix Table" caption="Payoff Matrix Table (writer's)" >}}

The numbers are utility, and higher is better. The best outcome for both sides is (3, 3), where both cooperate and both win. But look at the structure. Whatever B does, A does better by defecting: 5 instead of 3 if B cooperates, 1 instead of 0 if B defects. Defection is a dominant strategy, and because the logic is symmetric, the Nash equilibrium sits at (1, 1), where both sides keep defecting and both keep losing. Neither side has to be stupid or evil for this to happen. Defecting is simply the rational response to the incentives as they stand.

Reduced to its skeleton, I think this is fairly close to where Israel and Palestine sit today. Violence and repression are the dominant strategy because under the current game, unilateral cooperation means existential vulnerability, and that holds whether or not either side "wants peace".

{{< figure src="/images/blog/palestine/image7.png" alt="Meditations on Moloch" caption="from Meditations on Moloch by Slate Star Codex (Scott Alexander)" >}}

### How one state changes the game

You don't get out of a dominant-strategy equilibrium by persuading the players to be nicer. You get out by changing the payoff matrix, and that's what a single state does. Once both groups live inside one legal and constitutional entity, the incentives shift in at least three places.

Economic sabotage against the other group becomes sabotage against yourself, because the other group is now inside your tax base, your supply chains, and your labour market.

Political extremism becomes electorally irrational. To win a parliamentary majority, every party has to win votes across ethnic lines, so the system forces moderation through self-interest, with no moral persuasion required.

Terrorism loses its calculus, because the target and the perpetrator now sit inside the same legal and economic system, and the blowback lands on both of them.

In incentive design this is called aligning preferences: you structure the system so that individual interests line up with collective ones, the way companies give directors call options so their interests track the share price. I'd call the result Mutual Assured Construction. It's Mutual Assured Destruction run in reverse, where "if you collapse, I collapse, so we don't fight" becomes "if you rise, I rise, so we have a reason to cooperate".

## V.

{{< figure src="/images/blog/palestine/image8.jpeg" alt="Bayes Theorem" caption="Bayes Theorem visualized" >}}

Bayesian reasoning, at its most basic, goes like this: you hold a prior belief, you see some data, and you update according to how likely that data would be if the belief were true.

Take the prior "an ethno-state can be sustained in the long run" and the data: a 50/50 population, with the Palestinian Arab growth rate consistently higher. Under that data, every decade that passes requires more intense repression to keep the ethno-state intact, and the trend only goes one way; there's no natural reversal point short of extreme intervention. After updating, the probability that an ethno-state can be sustained in the long run without apartheid or ethnic cleansing comes out very low, close to zero.

{{< figure src="/images/blog/palestine/image9.jpeg" alt="Israeli settlers from Yitzhar" caption="Israeli settlers from the illegal Jewish-only Israeli settlement of Yitzhar, accompanied by IDF, throw stones at Palestinian olive harvesters in Huwwara, October 7, 2020. (Photo: Activestills / Heather Sharona Weiss)" >}}

The facts on the ground point the same way. The 700,000-plus Israeli settlers in the West Bank are an infrastructure fact as much as a political figure: roads, water, the electric grid, and the internet in the West Bank have all been folded into the Israeli system. Physically, a de facto single state has existed for decades. What's missing is the de jure version, meaning formal legal and constitutional recognition. Seen this way, the two-state solution is a proposal to reverse a reality that has already set, and the odds of reversing infrastructure this complex in the current political climate are, even on generous assumptions, close to zero.

{{< figure src="/images/blog/palestine/image10.jpeg" alt="Good Friday Agreement" caption="The Belfast Agreement, or Good Friday Agreement, is a landmark 1998 peace deal" >}}

History gives us a base rate too. The two cases I find most relevant:

South Africa (1994). The transition from an apartheid ethno-state to a democratic single state showed that constitutional integration can end an existential conflict. The outcome is far from perfect: inequality is still massive, crime is high, and several indicators suggest a fragile state. But the conflict ended.

Northern Ireland and the Good Friday Agreement (1998). A conflict between Catholic nationalists and Protestant unionists that had run for centuries was settled by constitutional power-sharing, a legally guaranteed distribution of power, without drawing a new border through anyone's town.

Two cases don't make a dataset, but they point the same way: identity conflicts have ended through institutional integration more often than through partition. I'd treat that as a strong prior while admitting it's no guarantee.

## VI.

{{< figure src="/images/blog/palestine/image11.png" alt="Boundary Conditions" caption="Types of Boundary Conditions are from Wolfram Math" >}}

One state is no silver bullet. If you've taken chemistry, you know a reaction only runs under certain conditions, and this one has hard constraints: violate them and the system collapses into another version of the same conflict.

{{< figure src="/images/blog/palestine/image12.jpeg" alt="Yugoslavia" caption="Superpower country, Yugoslavia, to a non-existing one" >}}

I count three boundary conditions that have to hold if this isn't going to become Yugoslavia 2.0.

1. A super-rigid secular constitution. Religion and ethnicity have to be completely decoupled from political rights. I mean a state that is constitutionally blind to ethnic and religious identity when it comes to civil, political, and property rights, which is a much stronger requirement than a state that "tolerates religion". This is non-negotiable. Without it, whichever group holds the demographic majority dominates the other, and we're back to a zero-sum game.

2. An integrated monopoly on violence. Joint security forces, with a mixed-composition military and police, ideally under third-party international oversight for the first one or two decades, or at minimum a commissioner-style oversight board. A power vacuum during the transition is the most dangerous condition of all, because the most extreme actors on both sides will rush to fill it.

3. Historical claims translated into economic language. If the Palestinian right of return is read as mass physical relocation, it creates a new zero-sum game identical to the one we're trying to escape. The way out is to convert it into economic terms: property reparations and documented financial compensation, in place of a fresh round of displacement that would start the next cycle. That turns an identity conflict into a finite transaction that can actually be settled.

The obvious objection is Lebanon, and it's a fair one.

{{< figure src="/images/blog/palestine/image13.jpeg" alt="Lebanon Civil War" caption="Lebanon Civil War circa 1975–1990, photographed by © Raymond Depardon / Magnum Photos" >}}

On paper, Lebanon looks a lot like what I'm proposing: several communities, one state, power-sharing. The result was fifteen years of civil war, repeated state collapse, and a very fragile present. I think Lebanon is evidence for the first boundary condition, though, because its confessional system writes sectarian identity straight into the constitution. Parliamentary seats are divided by religion and the top executive posts by sect, permanently and rigidly. That makes it a single state whose architecture amplifies communal identity as the basis of power, which is the opposite of what I'm arguing for. Lebanon shows what happens when condition one is violated, and I'd file it as support for the argument.

## VII.

{{< figure src="/images/blog/palestine/image14.jpeg" alt="Salahaddin Road, Gaza" caption="UN officials wait to inspect a wounded man shot by Israeli forces while trying to return to the north of the city through Salahaddin Road during a four-day humanitarian pause on November 25, 2023, Gaza City, Gaza." >}}

Here is the part of the argument I'm least sure about. In an iterated prisoner's dilemma, the transition period is when both sides have the strongest incentive to defect: after the old game ends and before the new system locks in and changes the payoffs. Constitutional guarantees don't feel real yet, joint security forces haven't built authority, and economic integration hasn't produced enough mutual dependence. That window is the most dangerous one.

I won't pretend I have a technical blueprint. But the game theory above implies one requirement: the transition needs an external enforcement mechanism, a commitment device that makes defection too costly while the window is open. That could be a UN mandate, an international guarantor, or a similar structure with a specific, time-limited mandate. Its only job would be to raise the price of defecting until the new payoffs take hold.

That's an argument about how to get there, and it's the problem the second boundary condition is written for. I'll admit openly that implementation is the weakest point of the whole case. But a weak implementation plan doesn't make another option better, especially when the other options have already been shown to be structurally infeasible.

## VIII.

{{< figure src="/images/blog/palestine/image15.jpeg" alt="xkcd Car Size" caption="<a href=&quot;https://xkcd.com/3167/&quot;>xkcd: Car Size</a>" >}}

Both sides tend to call the one-state idea utopian, and the Israeli and Western side often adds that it's "anti-Zionist". I think that framing misses what the argument is doing. To restate it: this is a process of elimination, and morality doesn't do any of the work.

On the a priori side, the ethno-state fails the universalizability test and has no steady state, the two-state solution fails on a conjunction of assumptions it can't meet, and the state as currently driven by Zionism isn't antifragile and carries significant ruin risk. On the a posteriori side, there's a 50/50 demographic split, more than 700,000 settlers wired into the infrastructure, and the base rates from South Africa and Northern Ireland. Everything points the same way.

If two options have been eliminated, logically and empirically, what's left is the third. It has plenty of problems (Sections VI and VII are basically a list of them), but it's the only one that isn't structurally doomed from the start.

Maybe this is how peace actually works. Nobody has to become kind; the system has to make violence irrational and cooperation the only sensible move. The maths doesn't need anyone to love anyone. It only needs destroying the other side to mean destroying yourself.

For completeness, here's the whole argument as a disjunctive syllogism.

_(Exhaustive disjunction). E ∨ T ∨ O_

where _E_ = ethno-state, _T_ = two-state, _O_ = One-State Democratic Secular.

From Section II,

_¬E. Proven. Cannot reach steady state. Generates ⊥ via universalisability._

From Section III,

_¬T. Proven. ¬A₁ ⊢ ¬S. Infrastructure is not reversible._

By disjunctive syllogism,

_E ∨ T ∨ O, ¬E, ¬T ⊢ O_

This is a deductively valid inference, with no probability or induction required. If you accept the exhaustive disjunction and both negations, _O_ follows necessarily.

Notice what the argument never needed: class analysis, the colonial-imperialist narrative, theology, or a moralizing shouting match. A One-State Democratic-Secular Palestine is the option that, analyzed this way, doesn't collapse under the weight of its own assumptions.

If you want to reject the conclusion (and I'm open to that, because I could well be wrong), here's where to push:

1. Show where my axiom is wrong.

2. Show that the disjunction isn't exhaustive. Show another option I haven't considered.

3. Show that _¬E_ or _¬T_ can be falsified. Show where my logic breaks.

4. Show a historical precedent in which an ethno-state with 50/50 demographics has been sustained in the long run without apartheid or ethnic cleansing.

I'm writing this as someone trying to think clearly about a subject that mostly gets discussed at the top of people's lungs. If you can show me a fundamental flaw, I'll happily revise my position. That's how thinking should work, no?
