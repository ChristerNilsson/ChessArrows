Ge mig ett javascript-program som gör följande:

* Det behövs ingen hjälptext.
* Visar en position, tagen från FEN.
* Låter användare skapa pilar mellan rutorna
* Detta sker med hjälp av vänster musknapp samt drag and drop. Eller två musklick.
* Vit och svart ska ha olika färger
* På detta vis byggs ett träd upp, som ska synas, och ha klickbara drag
* Ställningen som visas är den samma hela tiden.
* Bara legala pilar ska kunna visas. 
* Man ska kunna navigera i trädet med piltangenterna.
* För att bläddra bland alternativen används vertikala pilar.
* För att bläddra bland dragen används horisontella pilar.
* Man ska när som helst kunna acceptera en ställning som aktuell ställning.
* Rita dragets nummer på varje pil i rätt färg. 
* Vid behov ska pilen ritas böjd. Detta gäller ffa vid returdrag.
* Pilens böjning kan skötas med en Bezier-kurva. Lämpligen placeras mittpunkten vid halva pilen.
* Cirklarna ska placeras nära pilens mitt och förskjutas längs bezierkurvan för att undvika överlappning med andra cirklar.
* d = 0.1 av en rutas storlek
* Cirklarna har diametern 3d. 
* Om en pjäs rör sig a1-a8-a2 bör böjd pil användas.
* Placera första draget på 50% av avståndet (mellan Från och Till) och andra på 50% av avståndet. Inuti en cirkel med dragets färg. Cirklarnas periferi bör vara 1 pixel.
* Kurvornas avstånd från den raka pilen bör öka enligt en aritmetisk serie: d, -2d, +3d, -4d osv
* Vid alla returer, se till att cirklarna är ungefär lika långt från den egna pilen.
* Rita alla pilar i ett första pass. Rita sedan alla nummer i cirklar i ett andra pass. 
* Pilarna bör ha en periferi på 1 pixel i motsatt färg.
* Man ska bara se pilarna från startställningen till aktuellt drag.
* Den aktuella ställningen ska påverkas av vilka drag man gjort. T ex ska man kunna göra Kh3 följt av Kh4
* Om jag precis utfört ett vitt drag och gör ett till vitt drag ska båda dragen vara med i trädet. De utgör alternativ.
