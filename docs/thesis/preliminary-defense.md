# Preliminary defence

The talk for the preliminary defence of *The Effect of Skill Granularity on Mastery Estimation in Adaptive Learning Systems*, by Davit Tchintcharashvili, supervised by Mikheil Gigauri. The defence falls between 16 and 21 November 2026; the date, room and length allowed are not yet known. The talk is about 1000 words, which is about 8 minutes at an even pace. It covers what the preliminary draft sent on 9 November contains, the method and the simulation results, and every number is that draft's. The slides are in `preliminary-defense.pptx`, with this text in each slide's notes; both files are written by `scripts/preliminary-slides.py`.

## The talk

*Slide 1: the title, the author, the supervisor.*

Good afternoon. My name is Davit. My thesis is about learning programs, the programs where students practise mathematics. Today I will show my method and my first results.

*Slide 2: The problem: when does a student know a skill?.*

A learning program asks a student questions. After each answer it must decide: does the student know this skill now? The program can make two mistakes. It can say yes too early. Then the student moves on, but is not ready. Or it can say yes too late. Then the student loses time on easy questions. There is one more problem. What is one skill? Fractions can be one big skill. Or fractions can be sixteen small ideas. Somebody must choose. I call this choice the grain. A coarse grain means big skills. A fine grain means small skills.

*Slide 3: Research question.*

This is my research question. Does the size of a skill change how well the program decides? I look at two things. First, is the decision right? When the program says the student knows the skill, is it true? Second, is the decision stable? Does the same rule work in different situations?

*Slide 4: What other researchers did.*

Other researchers worked on this before me. Some compared the rules for deciding. Some compared big skills and small skills. But they only asked: can we predict the next answer? Nobody checked the decision itself, the decision that the student knows the skill. To check it, we must know the truth about the student. This is the new part of my thesis.

*Slide 5: Three rules for deciding.*

I compare three rules. The first is BKT, Bayesian Knowledge Tracing. It calculates the probability that the student knows the skill. When the probability is 95 percent or more, it says yes. The second is the moving average. It looks at the last answers, and new answers count more. The third is the streak rule. The student must give some right answers in a row, for example three. I also proved two statements. The first: the streak rule is a special case of the moving average. The second: BKT is correct when students learn exactly as BKT expects. So I must test BKT where students learn in a different way.

*Slide 6: Method: computer-made students.*

How can I check a decision? With real students, we never know the truth. So I made students in the computer, four hundred of them. This is called simulation. For these students, I know exactly what they know after every answer. So I can check every decision. Then I change the size of the skill. First the skill in the program is too big. Then it is the correct size. Then it is too small. I set the rules on one group of students, and I test them on a different group. Anyone can run my code and get the same numbers.

*Slide 7: Result 1: BKT is good only when students learn as it expects.*

The first result. The goal is that nine of ten decisions are right. When students can forget, BKT is the fastest. It needs about three and a half answers. The moving average needs five and a half. But when students learn slowly, step by step, BKT does not reach the goal. It becomes very sure after a few right answers, but the student is not ready. So the number from BKT is not always a real probability. In one situation we can trust it. In another situation we cannot.

*Slide 8: Result 2: a skill that is too big gives “yes” too early.*

The second result. Why does BKT fail? The reason is the size of the skill. Here, the real skill has several parts. The student learns each part separately. But the program sees only one big skill. Look at the picture. When the skill has one part, 98 percent of decisions are right. With two parts, 59 percent. With four parts, only 23 percent. All three rules fail together. The simple rules are not safer. The dashed line is BKT on each real part. It stays near 98 percent. But with eight or sixteen parts it stops deciding, because thirty questions are not enough for so many parts.

*Slide 9: Result 3: the correct size helps, but it needs enough questions.*

The third result uses a real topic, fractions. I divided fractions into sixteen small ideas. The questions come from Zeno. Zeno is the practice system that I built. One fractions question needs about six ideas together. So when the answer is wrong, we do not know which idea is missing. With thirty questions, the program finds the missing idea in 57 percent of cases, and it says yes to almost nobody. With 120 questions, it finds the missing idea in 79 percent of cases. So the correct size helps. But it needs two things: questions that show the ideas separately, and enough practice.

*Slide 10: Result 4: when the skill is too small, students wait too long.*

The fourth result is the opposite case. The students are the same and the answers are the same. But the program cuts each real part into smaller pieces. When I cut each part into four pieces, the program needs ten more answers. And with the usual 95 percent rule, it says yes to only 7 percent of students. Before, it was 94 percent. So smaller is not always better. Each small piece gets too few answers.

*Slide 11: Limits of this work.*

My work has limits. The students are made by computer, and real students can be different. I divided fractions into sixteen ideas myself, and another person could do it differently. A rule that works for one group does not always work for a new group. I repeated every experiment five times, and I keep only the results that stay the same. I do not say there is one best size for all skills. And I do not measure if Zeno helps a real class.

*Slide 12: Conclusion and next steps.*

My conclusion. The size of a skill changes the decision. When the skill is too big, the program says yes too early. When the skill is too small, the program almost never says yes. So we must choose the skills, the questions and the rule together. What is next? For the final thesis, I study the same question on answers of real students. This is a public data set called ASSISTments, with about four thousand students. Thank you. I am ready for your questions.

## Questions to expect

**What is new in your work?** Other researchers compared these rules. They also compared big and small skills, but only to predict the next answer. I check the decision itself, and I check it against the truth. The rules are not new. The measurement is new.

**Why computer-made students and not real students?** With real students we never know if they really know the skill. So we cannot check the decision. In the computer I know the truth. Real students come in the final thesis, where I test prediction.

**You made the students yourself. Maybe the result is only because of that?** This is a real limit, and I write it in the thesis. But in Result 2 I made the best possible situation for BKT: every part is learnt exactly as BKT expects. BKT still fails when the skill is too big. So the reason is the size of the skill.

**Is BKT a bad method?** No. When students learn as it expects, 97 to 98 percent of its decisions are right. When students forget, it is the fastest rule. It fails when one skill in the program is really several parts.

**The table says BKT does not reach 90 %. Is that always true?** I first searched limits up to 0.9999. Later I searched higher, and BKT reaches 90 percent with a limit very close to 1, about 0.9999999. I report both results. Such a limit is not practical, because you must know how students learn to choose it.

**Did you change anything after you saw the results?** Yes, two things, and I write both in the thesis. First I compared the rules at the same cost. That showed nothing, so I compared them at the same share of right decisions. And I built the experiments with skill size after the first result.

**What did you do yourself?** The two proofs, the computer-made students, the sixteen ideas of fractions, the code for all three rules, and the analysis. All the code is public. Each table shows the command that made it.

**What does this mean for Zeno?** Choose the skills and the questions together, and test the rule on Zeno's own data. The full recommendation is in the final thesis.

**What is left to do?** The part with real students' answers, the ASSISTments data, and the formatting by the university rules. I send the final thesis to my supervisor by 18 January 2027.
