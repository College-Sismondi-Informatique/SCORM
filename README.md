# Exercices SCORM

## Moteur et Editeur

* Index des exercices : https://college-sismondi-informatique.github.io/SCORM

* Éditeur d'exercices : https://college-sismondi-informatique.github.io/SCORM/editeur.html

* Moteurs utilisés pour l'IDE python : https://github.com/scormcdg


## Packages SCORM

Chaque sous-dossier contient un package SCORM. Les data sont chargées depuis github, pour packager, créer un .zip contenant charger.js, imsmanifest.xml et index.html, puis le charger dans moodle.


Dans le manifeste, on précise la ressource de l'exercice **localement** ou **par son URL** :

```xml
    <resource identifier="res_serie01a" type="webcontent" adlcp:scormType="sco" href="index.html?data=serie01a">
      <file href="index.html"/>
      <file href="charger.js"/>
    </resource>
```  

ou


```xml
    <resource identifier="res_serie01a" type="webcontent" adlcp:scormType="sco" href="index.html?data=serie01a&amp;data_url=https://college-sismondi-informatique.github.io/SCORM/exos-1IN/data/serie01a.js">
      <file href="index.html"/>
      <file href="charger.js"/>
    </resource>
```  

