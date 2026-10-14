# Abstract

Every adaptive practice system decides, after each answer, whether a student has mastered a skill, and every method
that makes that decision takes the skill as given. This thesis asks how the grain at which skills are defined, the
number of knowledge components a topic is divided into and which of them each question needs, affects the accuracy and
reliability of mastery estimation. Three methods are compared: Bayesian Knowledge Tracing (BKT), the exponential
moving average of a student's answers, and the rule "N right in a row", which is proved to be a special case of the
moving average. The comparison at one grain, on held-out students of the ASSISTments 2009–2010 data set and on
simulated students whose true state is known, is the foundation: BKT decides mastery more cheaply where learning
happens in one step, as it assumes, and where learning is gradual its probability is badly calibrated and its
declarations at the usual threshold of 0.95 are mostly wrong. Four granularity studies then change the grain. In a
simulated world where a skill is several components, each learnt in one step, modelling the skill as one reproduces the
gradual pattern exactly, in proportion to how much of the skill each question leaves untested, and lowers every
method's precision; BKT's probability becomes the least calibrated score and the threshold it needs leaves the range in
which a probability can be read. Modelling at the learners' grain restores precision at an ordinary threshold and names
the component a student lacks, if and only if the questions tell the components apart and the practice is long enough
to ask about each: on fractions as Zeno's generators ask it, sixteen ideas of which a question needs six, this takes
about 120 questions or one question in four asking for one idea alone. Modelling finer than the learners costs answers
for no gain in precision and shows itself in degenerate fits. On ASSISTments the same real answers are modelled at three
grains: BKT predicts held-out answers better than the moving average, and better at the data set's 110 skills than
at five topics or one skill, by the pre-specified test, while the moving average is indifferent to the grain. For Zeno, the system this work grew out of, the recommendation is a moving
average with a threshold set from data to decide mastery at the grain of the skill, and the state at the grain of the
ideas to choose what to practise next, becoming the mastery rule where the questions and the practice allow it.

# რეზიუმე

ყოველი ადაპტური სავარჯიშო სისტემა თითოეული პასუხის შემდეგ წყვეტს, აითვისა თუ არა მოსწავლემ უნარი, და ყოველი
მეთოდი, რომელიც ამ გადაწყვეტილებას იღებს, უნარს მოცემულად თვლის. ეს ნაშრომი იკვლევს, როგორ მოქმედებს უნარების
განსაზღვრის მარცვლოვანება, ანუ რამდენ ცოდნის კომპონენტად იყოფა თემა და რომელი კომპონენტები სჭირდება თითოეულ
კითხვას, ათვისების შეფასების სიზუსტესა და საიმედოობაზე. შედარებულია სამი მეთოდი: ბაიესური ცოდნის მიდევნება (BKT),
მოსწავლის პასუხების ექსპონენციალური მოძრავი საშუალო და წესი „N სწორი პასუხი ზედიზედ“, რომელიც, როგორც
დამტკიცებულია, მოძრავი საშუალოს კერძო შემთხვევაა. ერთ მარცვალზე შედარება, ASSISTments 2009–2010 მონაცემთა ბაზის
გამოყოფილ მოსწავლეებზე და სიმულირებულ მოსწავლეებზე, რომელთა ნამდვილი მდგომარეობა ცნობილია, საფუძველია: BKT
ათვისებას უფრო იაფად წყვეტს, სადაც სწავლა ერთი ნაბიჯით ხდება, როგორც თავად უშვებს, ხოლო სადაც სწავლა თანდათანობითია,
მისი ალბათობა ცუდად კალიბრირებულია და ჩვეული 0.95 ზღურბლზე მისი გადაწყვეტილებები უმეტესად მცდარია. შემდეგ ოთხი
კვლევა მარცვალს ცვლის. სიმულირებულ სამყაროში, სადაც უნარი რამდენიმე კომპონენტია და თითოეული ერთი ნაბიჯით
ისწავლება, უნარის ერთ მთლიანობად მოდელირება ზუსტად იმეორებს თანდათანობითი სწავლის სურათს, იმის პროპორციულად,
უნარის რა ნაწილს ტოვებს კითხვა შეუმოწმებელს, და ამცირებს ყველა მეთოდის სიზუსტეს; BKT-ის ალბათობა ყველაზე ნაკლებად
კალიბრირებული ქულა ხდება, ხოლო მისთვის საჭირო ზღურბლი გადის იმ დიაპაზონიდან, რომელშიც ალბათობის წაკითხვა
შესაძლებელია. მოსწავლეების მარცვალზე მოდელირება სიზუსტეს ჩვეულ ზღურბლზე აღადგენს და ასახელებს კომპონენტს, რომელიც
მოსწავლეს აკლია, მაშინ და მხოლოდ მაშინ, თუ კითხვები კომპონენტებს ერთმანეთისგან არჩევს და პრაქტიკა საკმარისად
გრძელია, რომ თითოეული შემოწმდეს: წილადებზე, როგორც მათ ზენოს გენერატორები სვამენ, თექვსმეტი იდეით, რომელთაგან
კითხვას ექვსი სჭირდება, ამას დაახლოებით 120 კითხვა ან ყოველი მეოთხე კითხვის ერთ იდეაზე დასმა სჭირდება. მოსწავლეებზე
უფრო წვრილი მოდელირება პასუხებს უსარგებლოდ ხარჯავს და გადაგვარებულ მორგებებში ვლინდება. ASSISTments-ზე ერთი და იგივე
რეალური პასუხები სამ მარცვალზეა მოდელირებული: BKT გამოყოფილ პასუხებს მოძრავ საშუალოზე უკეთ წინასწარმეტყველებს,
ხოლო მონაცემთა ბაზის 110 უნარზე უკეთ, ვიდრე ხუთ თემაზე ან ერთ უნარზე, წინასწარ განსაზღვრული ტესტით; მოძრავი საშუალო
მარცვლის მიმართ გულგრილია. ზენოსთვის, სისტემისთვის,
რომლისგანაც ეს ნაშრომი წარმოიშვა, რეკომენდაციაა უნარის მარცვალზე ათვისების გადასაწყვეტად მონაცემებიდან დადგენილი
ზღურბლით მოძრავი საშუალო, ხოლო შემდეგი სავარჯიშოს შესარჩევად იდეების მარცვალზე მდგომარეობა, რომელიც ათვისების
წესად იქცევა იქ, სადაც კითხვები და პრაქტიკა ამის საშუალებას იძლევა.
