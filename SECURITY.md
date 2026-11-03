De beveiligings- en privacyafspraken van de app:

Wachtwoorden worden opgeslagen met scrypt en een uniek zout per gebruiker, nooit als platte tekst.
Sessies werken met een willekeurige token als hash, bewaard in het geheugen, met een cookie die HttpOnly, SameSite=Lax heeft, met Secure bij https en een Max-Age van 30 dagen.
Elke gebruiker heeft zijn eigen gegevensbestand (zuidwesten), gescheiden van anderen.
Beperkingen:
- maximaal 5 mislukte inlogpogingen per adres per 15 minuten;
- maximaal één herkenning tegelijk per gebruiker;
- maximaal 10 herkenningen per gebruiker per uur;
- maximaal 100 pagina's per herkenning;
- maximaal 100 MB upload per bestand.
De originele upload wordt na herkenning verwijderd; alleen het resultaat (MusicXML) blijft bestaan.
Beveiligingskoppen: X-Frame-Options DENY, Permissions-Policy, Strict-Transport-Security, CSP, X-Content-Type-Options, Referrer-Policy: no-referrer.
Problemen worden gerapporteerd als een privébericht aan de eigenaar Mels, niet openbaar.
Wat er niet is:
- er wordt geen e-mail verstuurd;
- er is geen tweestapsverificatie.
Alleen wat in de code of documenten staat.
