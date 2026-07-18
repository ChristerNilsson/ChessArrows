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
* Startpunkt ska alltid vara 25% eller 75%. Minimera pilarnas längd
* Förhindra att pilarna ritas ovanpå varandra genom att parallellförflytta dem
* Dragnumret placeras där pilen startar
* d = 0.1 av en rutas storlek
* Cirklarna har diametern 3d och har dragets färg. Deras periferi bör vara 1 pixel.
* Om en pjäs rör sig a1-a8-a2 ska raka parallellförflyttade pilar användas. Avstånd mellan dem: 25%. Pilarnas längd: 25% + 600% + 25%
* Om tre linjer behöver dras, rita dem i ordning. A-B 25% B-A 50% A-B 75%
* Rita alla pilar i ett första pass. Rita sedan alla nummer i cirklar i ett andra pass. 
* Pilarna bör ha en periferi på 1 pixel i motsatt färg.
* Om vi har ett torn som rör sig stokastiskt fram och tillbaks på t ex a-linjen, se till att återanvända linjeutrymmet maximalt. 
* Gör tornet sju smådrag, kan de gå in på en enda linje. T ex 1 2 3 4 5 6 7 8
* Men det kan också tvingas gå in på sju linjer. T ex 1 8 2 7 3 6 4 5

* Man ska bara se pilarna från startställningen till aktuellt drag.
* Den aktuella ställningen ska påverkas av vilka drag man gjort. T ex ska man kunna göra Kh3 följt av Kh4
* Om jag precis utfört ett vitt drag och gör ett till vitt drag ska båda dragen vara med i trädet. De utgör alternativ.
