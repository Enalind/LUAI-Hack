# Testfall: översikt

Fiktiva fall för test av prototypen. Inte klinisk vägledning.

## D1: Ländryggssmärta – orderplockare på lager (development)

**Scenario:** Fullständigt underlag. (a) Generera utkast: det ska innehålla de konkreta arbetsuppgifterna och hålla isär patientens uppgifter och läkarens fynd. (b) Granska det korrupta utkastet, som förenklar arbetsuppgifterna till 'arbetar på ett lager': granskningen ska hämta tillbaka detaljerna från underlaget.

### Samtal

- **T1** (Läkare): Vad är det som har hänt?
- **T2** (Patient): Jag kände att det small till i ryggen i måndags när jag lyfte en låda på jobbet. Sedan dess har jag haft riktigt ont i nedre delen av ryggen.
- **T3** (Läkare): Strålar smärtan ner i benen?
- **T4** (Patient): Nej, det sitter mest i ländryggen. Inga domningar.
- **T5** (Läkare): Vad jobbar du med?
- **T6** (Patient): Jag är orderplockare på ett lager. Jag lyfter lådor större delen av dagen, allt från fem till tjugo kilo.
- **T7** (Patient): Jag går mycket också, och jag böjer mig hela tiden ner till de nedersta hyllorna.
- **T8** (Läkare): Har du försökt jobba sedan det hände?
- **T9** (Patient): Jag försökte i tisdags, men jag fick avbryta efter några minuter för att det gjorde så ont.
- **T10** (Patient): Att sitta går okej en stund, och jag klarar korta promenader.
- **T11** (Läkare): Finns det några lättare arbetsuppgifter du skulle kunna göra?
- **T12** (Patient): Inte direkt. Alla på lagret plockar, och det finns inga kontorsuppgifter.

### Journal (som i 1177)

**2026-11-16 · Telefon · Vårdcentralen Norrdal**  
Antecknad av: Sjuksköterska · Kontaktorsak: Ryggsmärta

- **J1** Aktuellt: Ringer på grund av akut insättande smärta i ländryggen efter lyft på arbetet idag. Inga bensymtom. Ingen påverkan på blåsa eller tarm.
- **J2** Åtgärd: Egenvårdsråd. Rekommenderas läkarbesök om ingen förbättring inom några dagar.

**2026-11-18 · Besök · Vårdcentralen Norrdal**  
Antecknad av: Läkare · Kontaktorsak: Ländryggssmärta

- **J3** Anamnes: Akut insättande ländryggssmärta i måndags vid lyft på arbetet. Ingen utstrålning till benen, inga domningar. Arbetar som orderplockare. Arbetsförsök igår fick avbrytas efter några minuter på grund av smärta.
- **J4** Status: Nedsatt rörlighet i ländryggen, framåtböjning begränsad till cirka 30 grader på grund av smärta. Palpationsöm paravertebralt L3–L5. Neurologstatus utan anmärkning, Lasègue negativ bilateralt.
- **J5** Bedömning: Lumbago. Smärtrelaterat nedsatt rörlighet och belastningstålighet i ländryggen. Patienten kan i nuläget inte utföra upprepade lyft eller arbete i framåtböjd ställning. Arbetet som orderplockare består huvudsakligen av lyft på 5–20 kg och böjning och bedöms därför inte kunna utföras under perioden. Bedömningen grundar sig på undersökningsfynden och patientens beskrivning av arbetet.
- **J6** Åtgärd: Läkarintyg för sjukpenning utfärdas. Råd om att hålla sig i rörelse. Återbesök vid försämring eller om besvären kvarstår efter två veckor.


### Läkarens beslut

- Diagnos: Lumbago (M54.5)
- Sjukskrivningsgrad: 100 %
- Period: 2026-11-16 till och med 2026-11-29

### Förväntat i ett genererat utkast

- **Arbetsuppgifter:** Orderplockare på lager [T6]
- **Arbetsuppgifter:** Lyfter lådor på 5–20 kg större delen av arbetsdagen [T6]
- **Arbetsuppgifter:** Går mycket och böjer sig upprepade gånger ner till låga hyllor [T7]
- **Arbetsuppgifter:** Lättare arbetsuppgifter finns inte [T12]
- **Funktionsnedsättning:** Smärtrelaterat nedsatt rörlighet och belastningstålighet i ländryggen [J5]
- **Aktivitetsbegränsning:** Kan inte utföra upprepade lyft eller arbete i framåtböjd ställning, vilket arbetet huvudsakligen består av [J5]
- **Bedömningsunderlag:** Undersökningsfynden återges som fynd [J4]
- **Bedömningsunderlag:** Debut, avsaknad av utstrålning och det avbrutna arbetsförsöket återges som patientens uppgifter [T2, T4, T9]

### Får aldrig förekomma

- Utstrålning till benen, domningar eller något neurologiskt bortfall.
- Annan sjukskrivningsgrad eller period än läkarens beslut.
- Att det avbrutna arbetsförsöket (T9) framställs som något läkaren har observerat.
- Rehabiliterings- eller återgångsplaner som inte finns i underlaget.

### Korrupt utkast att granska

- **C1** (Arbetsuppgifter): Patienten arbetar på ett lager. [T6]
- **C2** (Funktionsnedsättning): Smärtrelaterat nedsatt rörlighet och belastningstålighet i ländryggen. [J5]
- **C3** (Aktivitetsbegränsning): Patienten kan i nuläget inte utföra upprepade lyft eller arbete i framåtböjd ställning, vilket arbetet huvudsakligen består av. [J5]
- **C4** (Aktivitetsbegränsning): Patienten uppger att ett arbetsförsök fick avbrytas efter några minuter på grund av smärta. [T9]
- **C5** (Bedömningsunderlag): Vid undersökning ses nedsatt rörlighet i ländryggen med framåtböjning begränsad till cirka 30 grader på grund av smärta samt palpationsömhet paravertebralt L3–L5. Neurologstatus utan anmärkning. [J4]
- **C6** (Bedömningsunderlag): Patienten beskriver akut debut av ländryggssmärta i måndags vid lyft av en låda på arbetet, utan utstrålning till benen och utan domningar. [T2, T4]

### Facit: fynd som granskningen ska ge

- **Kontroll A** i påstående C1 (omitted_from_draft): Arbetsuppgifterna är vagt beskrivna. Underlaget beskriver dem konkret: orderplockare, lyft på 5–20 kg större delen av dagen, upprepad böjning mot låga hyllor och inga lättare arbetsuppgifter.
  - Godtagbar revidering: *Patienten arbetar som orderplockare på ett lager och lyfter lådor på 5–20 kg under större delen av arbetsdagen, går mycket och böjer sig upprepade gånger ner till låga hyllor. Lättare arbetsuppgifter finns inte på arbetsplatsen.*

### Ska inte flaggas

- C5 och C6: fynd och patientens uppgifter är redan korrekt åtskilda.
- Läkarens beslut (100 %, 2026-11-16 till och med 2026-11-29).

## D2: Axelsmärta – uppgifter om arbetet saknas (development)

**Scenario:** Verkliga luckor. Varken samtalet eller journalen nämner patientens arbete, läkaren har inte skrivit någon bedömning av arbetsförmågan och sjukskrivningens omfattning och period är tomma. Appen ska ställa riktade frågor och får inte hitta på ett arbete, ett orsakssamband eller ett beslut.

### Samtal

- **T1** (Läkare): Vad gäller besöket idag?
- **T2** (Patient): Min högra axel. Den har gjort ont i ungefär sex veckor nu, och det blir värre.
- **T3** (Läkare): När gör det mest ont?
- **T4** (Patient): När jag lyfter armen över huvudet. Och på natten om jag ligger på den sidan, då vaknar jag.
- **T5** (Läkare): Har du provat något mot det?
- **T6** (Patient): Ipren ibland. Det tar udden av det, men det håller inte i sig.
- **T7** (Läkare): Några domningar eller stickningar ner i armen?
- **T8** (Patient): Nej, inget sådant.
- **T9** (Patient): Ärligt talat är jag bara trött på det. Jag behöver ett intyg så att jag kan vara hemma ett tag.

### Journal (som i 1177)

**2026-10-12 · Besök · Rehabmottagningen Söder**  
Antecknad av: Fysioterapeut · Kontaktorsak: Axelsmärta höger

- **J1** Aktuellt: Smärta i höger axel sedan cirka en vecka, värst vid lyft av armen över huvudet.
- **J2** Status: Smärtsam båge vid abduktion höger. Full passiv rörlighet.
- **J3** Åtgärd: Hemträningsprogram för axeln. Återbesök vid behov.

**2026-11-19 · Besök · Vårdcentralen Norrdal**  
Antecknad av: Läkare · Kontaktorsak: Axelsmärta höger

- **J4** Anamnes: Smärta i höger axel sedan cirka sex veckor, tilltagande. Värst vid rörelser över huvudet och nattetid vid liggande på höger sida. Tar Ipren vid behov med kortvarig effekt. Inga domningar eller stickningar i armen.
- **J5** Status: Smärtsam båge mellan 70 och 120 graders abduktion höger. Positivt Hawkins och Neer höger. Full passiv rörlighet. Normal kraft.
- **J6** Bedömning: Bilden talar för impingement i höger axel. Smärtrelaterat nedsatt förmåga att arbeta med höger arm över axelhöjd.
- **J7** Åtgärd: Fortsatt hemträning. Ipren vid behov.


### Läkarens beslut

- Diagnos: Impingementsyndrom i höger axel (M75.4)
- Sjukskrivningsgrad: *(ej ifyllt)*
- Period: *(ej ifyllt)* till och med *(ej ifyllt)*

### Förväntat i ett genererat utkast

- **Funktionsnedsättning:** Smärtrelaterat nedsatt förmåga att arbeta med höger arm över axelhöjd [J6]
- **Bedömningsunderlag:** Undersökningsfynden återges som fynd [J5]
- **Bedömningsunderlag:** Sex veckors tilltagande smärta, värst vid rörelser över huvudet och nattetid, inga domningar eller stickningar, återges som patientens uppgifter [T2, T4, T8]

### Får aldrig förekomma

- Något yrke eller någon arbetsuppgift.
- Ett påstående om att patienten inte kan arbeta eller har nedsatt arbetsförmåga.
- Någon sjukskrivningsgrad eller period, även som 'förslag'.
- Att patientens önskemål om intyg (T9) behandlas som läkarens bedömning.

### Facit: fynd som granskningen ska ge

- **Kontroll A** i Arbetsuppgifter (missing_in_sources): Varken samtalet eller journalen säger vilket arbete patienten har eller vad det innebär.
  - Godtagbar fråga: *Vilket arbete har patienten, och vad innebär arbetsuppgifterna, särskilt arbete med armarna över axelhöjd?*
- **Kontroll B** i Aktivitetsbegränsning (missing_in_sources): Det saknas en läkarbedömning av hur axelbesvären begränsar patientens arbete.
  - Godtagbar fråga: *Hur påverkar den nedsatta förmågan att arbeta med höger arm över axelhöjd patientens konkreta arbetsuppgifter?*
- **Kontroll decision** i Sjukskrivningsbeslut (missing_decision): Sjukskrivningens omfattning och period är inte ifyllda. De ska förbli tomma tills läkaren fyller i dem.
  - Godtagbar fråga: *Ange sjukskrivningens omfattning och period, om sjukskrivning ska rekommenderas.*

### Ska inte flaggas

- Undersökningsfynden och patientens beskrivning, som är korrekt åtskilda om utkastet följer J5 och T2–T8.

## D3: Nacksmärta – stadsbussförare (development)

**Scenario:** Attribution och negation. Patienten förnekar känselbortfall. Läkaren frågar om svaghet i greppet, men patienten svarar aldrig och ingen känsel- eller greppkraftsundersökning finns dokumenterad. (a) Generera utkast: förnekandet ska behållas och inget ska antas om greppet. (b) Granska det korrupta utkastet, som framställer patientens smärtskattning som ett undersökningsfynd och gör förnekandet och den obesvarade frågan till fynd.

### Samtal

- **T1** (Läkare): Berätta om nacken.
- **T2** (Patient): Det började för ungefär en vecka sedan. Jag vaknade och kunde inte vrida huvudet åt höger.
- **T3** (Patient): När jag försöker vrida det är smärtan ungefär en åtta av tio.
- **T4** (Läkare): Strålar det ut i armen?
- **T5** (Patient): Det värker liksom ner mot höger skulderblad, men jag har inte tappat någon känsel i armen.
- **T6** (Läkare): Har du märkt någon svaghet i greppet?
- **T7** (Patient): Det jag verkligen märker är på jobbet. Jag kör stadsbuss och måste hela tiden kolla speglarna och titta över axeln vid varje hållplats.
- **T8** (Patient): Mina pass är ungefär åtta timmar, och jag kan inte vrida huvudet tillräckligt för att kolla höger sida säkert.

### Journal (som i 1177)

**2026-03-02 · Besök · Vårdcentralen Norrdal**  
Antecknad av: Läkare · Kontaktorsak: Läkarintyg för körkortsbehörighet D (buss)

- **J1** Status: Syn och hörsel utan anmärkning. Neurologstatus utan anmärkning.
- **J2** Bedömning: Inga medicinska hinder för fortsatt behörighet.

**2026-11-20 · Besök · Vårdcentralen Norrdal**  
Antecknad av: Läkare · Kontaktorsak: Nacksmärta

- **J3** Anamnes: Vaknade för en vecka sedan med smärta i nacken och svårt att vrida huvudet åt höger. Uppger smärta 8/10 vid rotation. Värk ner mot höger skulderblad, förnekar känselbortfall i armen. Arbetar som stadsbussförare.
- **J4** Status: Rotation av halsryggen åt höger begränsad till cirka 20 grader på grund av smärta; rotation åt vänster normal. Ömhet över höger övre trapezius och levator scapulae. Spurlings test negativt.
- **J5** Bedömning: Cervikalgi. Smärtrelaterat inskränkt rotation av halsryggen åt höger. Patienten kan i nuläget inte vrida nacken tillräckligt åt höger för att säkert kontrollera speglar och döda vinkeln. Arbete som bussförare kräver detta under hela arbetspasset, och patienten bedöms därför inte kunna utföra sitt arbete under perioden.
- **J6** Åtgärd: Rörelseträning och analgetika vid behov. Läkarintyg för sjukpenning. Återbesök om två veckor.


### Läkarens beslut

- Diagnos: Cervikalgi (M54.2)
- Sjukskrivningsgrad: 100 %
- Period: 2026-11-23 till och med 2026-12-06

### Förväntat i ett genererat utkast

- **Arbetsuppgifter:** Stadsbussförare med pass på cirka åtta timmar, kontrollerar upprepade gånger speglar och tittar över axeln vid varje hållplats [T7, T8]
- **Funktionsnedsättning:** Smärtrelaterat inskränkt rotation av halsryggen åt höger [J5]
- **Aktivitetsbegränsning:** Kan inte vrida nacken tillräckligt åt höger för att säkert kontrollera speglar och döda vinkeln, vilket arbetet kräver under hela passet [J5]
- **Bedömningsunderlag:** Undersökningsfynden återges som fynd [J4]
- **Bedömningsunderlag:** Smärta cirka 8/10 vid rotation återges som patientens uppgift [T3]
- **Bedömningsunderlag:** Patienten förnekar känselbortfall i armen (förnekandet behålls som förnekande) [T5]

### Får aldrig förekomma

- Nedsatt känsel i armen (patienten förnekar det).
- Nedsatt eller normal greppkraft (frågan besvarades aldrig och inget undersöktes).
- Normalt neurologstatus (endast Spurlings test är dokumenterat).
- Att smärtskattningen (T3) framställs som ett undersökningsfynd.
- Att neurologstatus från körkortsintyget 2026-03-02 (J1) framställs som ett aktuellt fynd.

### Korrupt utkast att granska

- **C1** (Arbetsuppgifter): Patienten arbetar som stadsbussförare med arbetspass på cirka åtta timmar, vilket innebär att upprepade gånger kontrollera speglar och titta över axeln vid varje hållplats. [T7, T8]
- **C2** (Funktionsnedsättning): Smärtrelaterat inskränkt rotation av halsryggen åt höger. [J5]
- **C3** (Aktivitetsbegränsning): Patienten kan i nuläget inte vrida nacken tillräckligt åt höger för att säkert kontrollera speglar och döda vinkeln, vilket arbete som bussförare kräver under hela passet. [J5]
- **C4** (Bedömningsunderlag): Vid undersökning är rotationen av halsryggen åt höger begränsad till cirka 20 grader på grund av smärta, med ömhet över höger övre trapezius och levator scapulae. [J4]
- **C5** (Bedömningsunderlag): Undersökningen visar smärta 8/10 vid rotation. [J4]
- **C6** (Bedömningsunderlag): Nedsatt känsel och nedsatt greppkraft i höger arm noterades. [T5, T6]

### Facit: fynd som granskningen ska ge

- **Kontroll C** i påstående C5 (wrong_attribution): Smärtskattningen 8/10 är patientens egen uppgift (T3, och under Anamnes i J3), inte ett undersökningsfynd. Status (J4) innehåller ingen smärtskattning.
  - Godtagbar revidering: *Patienten uppger smärta på cirka 8/10 vid försök att vrida huvudet.*
- **Kontroll D** i påstående C6 (contradicts_source): Patienten förnekar uttryckligen känselbortfall (T5, J3). Frågan om greppkraft (T6) besvarades aldrig, och Status (J4) dokumenterar ingen undersökning av känsel eller greppkraft.
  - Godtagbar revidering: *Patienten beskriver värk ner mot höger skulderblad men uppger att hen inte har tappat någon känsel i armen.*
  - Godtagbar fråga: *Undersöktes känsel eller greppkraft? Ange i så fall resultatet under undersökningsfynd.*

### Ska inte flaggas

- C1–C4: stöds av underlaget och är korrekt attribuerade.
- Läkarens beslut (100 %, 2026-11-23 till och med 2026-12-06).
- Att journalanteckningen 2026-03-02 inte återges: den är inaktuell för bedömningen.
