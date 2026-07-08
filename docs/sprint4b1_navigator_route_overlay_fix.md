# Sprint 4B.1 — Navigator route overlay fix

## Probleem
Na Sprint 4B tekende de kaartlaag `Route` de volledige OP-route als één polyline over alle route-locaties. Daardoor ontstond een spaghetti-lijn over de kaart en leek de app de navigator/step-by-step objective-engine niet te gebruiken.

## Oplossing
De kaartlaag `Route` is vervangen door `Navigator`:

- toont niet meer de volledige route tegelijk;
- gebruikt de actieve objective uit de OP-route stap-voor-stap lijst;
- tekent alleen vorige → actieve → volgende objective;
- gebruikt exacte objective-punten waar beschikbaar;
- valt terug op objective/world/location coordinaten;
- probeert per segment de route-network-nodes te gebruiken;
- valt alleen per lokaal segment terug op een rechte lijn wanneer geen netwerkpad beschikbaar is.

Hiermee blijft de kaart overzichtelijk en volgt de kaart de stap die de speler op dat moment moet uitvoeren.

## Gewijzigde bestanden

- `app/src/App.tsx`
- `app/src/App.css`
