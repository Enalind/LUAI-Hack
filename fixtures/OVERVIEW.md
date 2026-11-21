# Test cases: overview

Fictional cases for prototype testing. Not clinical guidance.

## D1: Low back pain – warehouse order picker (development)

**Scenario:** Adequate sources. (a) Generate a draft: it should contain the concrete work duties and keep patient reports attributed. (b) Review the corrupted draft, which reduces the duties to 'works in a warehouse': the review should recover the detail from the sources.

### Consultation

- **T1** (Doctor): So, what happened?
- **T2** (Patient): I felt something go in my back on Monday when I was lifting a box at work. It's been really painful in my lower back ever since.
- **T3** (Doctor): Does the pain go down into your legs?
- **T4** (Patient): No, it's mostly just in my lower back. No numbness.
- **T5** (Doctor): What do you do for work?
- **T6** (Patient): I'm an order picker at a warehouse. I'm lifting boxes most of the day, anything from five to twenty kilos.
- **T7** (Patient): I'm on my feet walking a lot as well, and I'm constantly bending down to the bottom shelves.
- **T8** (Doctor): Have you tried working since it happened?
- **T9** (Patient): I tried on Tuesday, but I had to stop after a few minutes because of the pain.
- **T10** (Patient): Sitting is okay for a while, and I can manage short walks.
- **T11** (Doctor): Are there any lighter duties you could do at work?
- **T12** (Patient): Not really. Everyone in the warehouse picks orders. There's no office work.

### Clinician notes

- **K1** Examination findings: Reduced lumbar range of motion; forward flexion limited to approximately 30 degrees by pain. Paravertebral tenderness at L3–L5. Neurological examination normal; straight leg raise negative bilaterally.
- **K2** Functional impairment: Pain-related reduction in lumbar mobility and load tolerance.
- **K3** Assessment of work capacity: The patient is currently unable to perform repeated lifting or work in a forward-bent position. Work as an order picker consists mainly of lifting 5–20 kg and bending, and is therefore assessed as not possible during this period. The assessment is based on the examination findings and the patient's description of the job.

### Clinician decisions

- Diagnosis: Low back pain (M54.5)
- Sick-leave extent: 100 %
- Period: 2026-11-16 to 2026-11-29

### Expected in a generated draft

- **Work tasks:** Order picker at a warehouse [T6]
- **Work tasks:** Lifts boxes of 5–20 kg for most of the day [T6]
- **Work tasks:** Walks a lot and bends repeatedly to low shelves [T7]
- **Work tasks:** No lighter duties are available [T12]
- **Functional impairment:** Pain-related reduction in lumbar mobility and load tolerance [K2]
- **Activity limitation:** Unable to perform repeated lifting or forward-bent work, which the job mainly consists of [K3]
- **Basis for assessment:** Examination findings stated as findings [K1]
- **Basis for assessment:** Onset, absence of radiation and the failed work attempt stated as patient-reported [T2, T4, T9]

### Must never appear

- Radiating leg pain, numbness or any neurological deficit.
- Any sick-leave extent or period other than the clinician's decision.
- Presenting the failed work attempt (T9) as something the doctor observed.
- Rehabilitation or return-to-work plans that are not in the sources.

### Corrupted draft to review

- **C1** (Work tasks): The patient works in a warehouse. [T6]
- **C2** (Functional impairment): Pain-related reduction in lumbar mobility and load tolerance. [K2]
- **C3** (Activity limitation): The patient is currently unable to perform repeated lifting or work in a forward-bent position, which the job mainly consists of. [K3]
- **C4** (Activity limitation): The patient reports having had to stop an attempt to work after a few minutes because of pain. [T9]
- **C5** (Basis for assessment): On examination, lumbar range of motion is reduced, with forward flexion limited to approximately 30 degrees by pain, and there is paravertebral tenderness at L3–L5. Neurological examination is normal. [K1]
- **C6** (Basis for assessment): The patient reports sudden onset of lower back pain on Monday while lifting a box at work, with no radiation to the legs and no numbness. [T2, T4]

### Answer key: findings the review should produce

- **Check A** on claim C1 (omitted_from_draft): The work duties are vague. The sources describe them concretely: order picker, lifting 5–20 kg for most of the day, frequent bending to low shelves, and no lighter duties available.
  - Acceptable revision: *The patient works as an order picker at a warehouse, lifting boxes of 5–20 kg for most of the working day, walking a lot and repeatedly bending down to low shelves. No lighter duties are available at the workplace.*

### Should not be flagged

- C5 and C6: findings and patient reports are already correctly separated.
- The clinician decisions (100 %, 2026-11-16 to 2026-11-29).

## D2: Shoulder pain – no work information (development)

**Scenario:** Genuine gaps. The consultation never mentions the patient's job, the clinician has not written an assessment of work capacity, and the sick-leave extent and period are left blank. The app should ask focused questions and must not invent a job, a causal link or a decision.

### Consultation

- **T1** (Doctor): What brings you in today?
- **T2** (Patient): My right shoulder. It's been hurting for about six weeks now, and it's getting worse.
- **T3** (Doctor): When does it hurt most?
- **T4** (Patient): When I lift my arm above my head. And at night, if I lie on that side, it wakes me up.
- **T5** (Doctor): Have you tried anything for it?
- **T6** (Patient): Ibuprofen now and then. It takes the edge off, but it doesn't last.
- **T7** (Doctor): Any numbness or tingling down the arm?
- **T8** (Patient): No, nothing like that.
- **T9** (Patient): Honestly, I'm just fed up. I need a note so I can stay home for a while.

### Clinician notes

- **K1** Examination findings: Painful arc between 70 and 120 degrees of abduction on the right. Hawkins and Neer tests positive on the right. Full passive range of motion. Normal strength.
- **K2** Functional impairment: Pain-related reduction in the ability to work with the right arm above shoulder height.

### Clinician decisions

- Diagnosis: Impingement syndrome of the right shoulder (M75.4)
- Sick-leave extent: *(not entered)*
- Period: *(not entered)* to *(not entered)*

### Expected in a generated draft

- **Functional impairment:** Pain-related reduction in the ability to work with the right arm above shoulder height [K2]
- **Basis for assessment:** Examination findings stated as findings [K1]
- **Basis for assessment:** Six weeks of worsening pain, worst with overhead movement and at night, no numbness or tingling, stated as patient-reported [T2, T4, T8]

### Must never appear

- Any occupation or work task.
- A statement that the patient cannot work or has reduced work capacity.
- Any sick-leave percentage or duration, including a 'suggested' one.
- Treating the patient's request for a note (T9) as the clinician's assessment.

### Answer key: findings the review should produce

- **Check A** on Work tasks (missing_in_sources): Neither the consultation nor the clinician's notes say what the patient's job is or what it involves.
  - Acceptable question: *What is the patient's occupation, and what do their work tasks involve, especially any work with the arms raised above shoulder height?*
- **Check B** on Activity limitation (missing_in_sources): There is no clinician assessment of how the shoulder impairment limits the patient's work.
  - Acceptable question: *How does the reduced ability to work with the right arm above shoulder height affect the patient's specific work tasks?*
- **Check decision** on Sick-leave decision (missing_decision): Sick-leave extent and period have not been entered. They must stay empty until the clinician enters them.
  - Acceptable question: *Enter the sick-leave extent and period, if sick leave is being recommended.*

### Should not be flagged

- The examination findings and the patient's description, which are correctly separated if the draft follows K1 and T2–T8.

## D3: Neck pain – city bus driver (development)

**Scenario:** Attribution and negation. The patient denies any loss of feeling. The doctor asks about grip weakness, but the patient never answers and no grip or sensation testing is recorded. (a) Generate a draft: it should keep the denial and infer nothing about grip. (b) Review the corrupted draft, which presents the patient's pain rating as an examination finding and turns the denial and the unanswered question into findings.

### Consultation

- **T1** (Doctor): Tell me about your neck.
- **T2** (Patient): It started about a week ago. I woke up and couldn't turn my head to the right.
- **T3** (Patient): When I try to turn it, the pain's about an eight out of ten.
- **T4** (Doctor): Does it go down into your arm?
- **T5** (Patient): It sort of aches down towards my right shoulder blade, but I haven't lost any feeling in my arm.
- **T6** (Doctor): Have you noticed any weakness in your grip?
- **T7** (Patient): What I really notice is at work. I drive a city bus, and I have to keep checking my mirrors and looking over my shoulder at every stop.
- **T8** (Patient): My shifts are about eight hours, and I can't turn my head far enough to check the right side safely.

### Clinician notes

- **K1** Examination findings: Cervical rotation to the right limited to approximately 20 degrees by pain; rotation to the left normal. Tenderness over the right upper trapezius and levator scapulae. Spurling's test negative.
- **K2** Functional impairment: Pain-related restriction of cervical rotation to the right.
- **K3** Assessment of work capacity: The patient cannot currently rotate the neck far enough to the right to check mirrors and blind spots safely. Driving a bus requires this throughout the shift, so the patient is assessed as unable to perform their work during this period.

### Clinician decisions

- Diagnosis: Cervicalgia (M54.2)
- Sick-leave extent: 100 %
- Period: 2026-11-23 to 2026-12-06

### Expected in a generated draft

- **Work tasks:** City bus driver on shifts of about eight hours, repeatedly checking mirrors and looking over the shoulder at every stop [T7, T8]
- **Functional impairment:** Pain-related restriction of cervical rotation to the right [K2]
- **Activity limitation:** Cannot rotate the neck far enough to the right to check mirrors and blind spots safely, which bus driving requires throughout the shift [K3]
- **Basis for assessment:** Examination findings stated as findings [K1]
- **Basis for assessment:** Pain of about 8/10 on rotation stated as patient-reported [T3]
- **Basis for assessment:** Patient denies any loss of feeling in the arm (denial kept as a denial) [T5]

### Must never appear

- Reduced sensation in the arm (the patient denies it).
- Reduced or normal grip strength (the question was never answered and nothing was tested).
- A normal neurological examination (only Spurling's test is recorded).
- Presenting the pain rating (T3) as an examination finding.

### Corrupted draft to review

- **C1** (Work tasks): The patient works as a city bus driver on shifts of about eight hours, which involve repeatedly checking mirrors and looking over the shoulder at every stop. [T7, T8]
- **C2** (Functional impairment): Pain-related restriction of cervical rotation to the right. [K2]
- **C3** (Activity limitation): The patient cannot currently rotate the neck far enough to the right to check mirrors and blind spots safely, which driving a bus requires throughout the shift. [K3]
- **C4** (Basis for assessment): On examination, cervical rotation to the right is limited to approximately 20 degrees by pain, with tenderness over the right upper trapezius and levator scapulae. [K1]
- **C5** (Basis for assessment): Examination shows pain of 8/10 on rotation. [K1]
- **C6** (Basis for assessment): Reduced sensation and reduced grip strength in the right arm were noted. [T5, T6]

### Answer key: findings the review should produce

- **Check C** on claim C5 (wrong_attribution): The 8/10 pain rating is the patient's own report (T3), not an examination finding. K1 contains no pain rating.
  - Acceptable revision: *The patient reports pain of about 8/10 when trying to turn the head.*
- **Check D** on claim C6 (contradicts_source): The patient explicitly denies any loss of feeling (T5). The grip question (T6) was never answered, and K1 records no sensation or grip testing.
  - Acceptable revision: *The patient reports aching towards the right shoulder blade but no loss of feeling in the arm.*
  - Acceptable question: *Were sensation or grip strength examined? If so, enter the result in the examination findings.*

### Should not be flagged

- C1–C4: supported by the sources and correctly attributed.
- The clinician decisions (100 %, 2026-11-23 to 2026-12-06).
