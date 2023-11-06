# Export du Projet PreTheRo

## Le projet Médialitérature
- au FNS: [Médialitérature](https://data.snf.ch/grants/grant/192400) 
- au DaSCH: Premiers théâtres romands
  - projet [prethero](https://ark.dasch.swiss/ark:/72163/1/0119)
  - données: [DaSCH's DSP](https://app.dasch.swiss/project/0119)

## Export
Une collaboration est prévue avec la plateforme [César](https://www.fabula.org/actualites/95332/la-base-cesar-bilan-et-perspectives.html).

## Code

La première approche était une requête gravsearch, le langage de requête du DaSCH, et un traitement [jq](https://jqlang.github.io/jq/). 

La preuve de faisabilité est faite, mais la requête devenant tentaculaire et difficilement débugable, cette voie a été abandonnée.

Choix techniques:
- javascript:
  l'application de référence pour la navigation des données est en javascript, ce qui en fait une base pratique pour d'exploration des requêtes et des résultats.
- `Promise`s: correspond à l'exploration de réseau, de proche en proche.  

Autre alternative considérée: lire l'ontologie et coder un extracteur systématique, appliquer un mapping pour formatter les données pour un export spécifique.

## Utilisation

Un fichier `Makefile` se trouve dans le répertoire `src`.  
Il est autodocumenté, un `make` sans argument montrera les options disponibles.  
La présence de `make` est donc requise, ainsi que `node`, pour interpréter le code javascript, et `jq` pour rendre lisible le json obtenu.

```bash
cd src
make
make export
make format
```