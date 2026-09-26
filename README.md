# Moon Phase Calculator — site web

Vitrine de l'application Python « Moon Phase Calculator », avec un calculateur en ligne et une Lune 3D interactive.
Site statique (HTML, CSS, JavaScript en modules ES), sans framework ni étape de compilation.

## Lancer en local

```bash
cd site
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

Les modules ES ne se chargent pas depuis `file://` : il faut passer par un serveur local.

## Organisation

```
site/
  index.html              page unique, textes FR en dur (lisible sans JavaScript)
  css/styles.css          styles, mobile d'abord (ruptures à 768 et 1200 px)
  js/astro.js             Soleil (Meeus ch. 25), Lune (ch. 47), phase (ch. 48), dates des phases
  js/moon3d.js            Lune 3D WebGL (issue de Moon3d.js)
  js/moon-svg.js          tracé SVG des phases (cartes, repli sans WebGL)
  js/translations.js      textes FR / EN
  js/app.js               calculateur, langue, URL, partage, menu
  assets/                 texture, image fixe de la Lune, icônes, image de partage
tools/make_assets.py      régénère les images de site/assets à partir de moon.jpg
```

## Calcul

- Instant de calcul : midi, heure locale du visiteur ; le fuseau est affiché sous le calculateur.
- Âge de la Lune : écart de longitude écliptique Lune − Soleil (0–360°) × 29,53058867 / 360, comme dans
  `Python/moon_phase_calculator.py`. Les noms de phase reprennent les seuils de `get_phase_name()`.
- Comparaison avec la classe Python (Astropy) sur 120 dates entre 1950 et 2100, à 00:00 UTC :
  écart maximum de 0,14 % d'illumination, 0,16° d'angle de phase et 0,002 jour d'âge, noms de phase identiques.

## À compléter avant publication

Remplacer les emplacements suivants dans `site/` :

- `[LIEN GITHUB]` : adresse du dépôt
- `[LIEN TÉLÉCHARGEMENT]` : lien de téléchargement de l'application
- `[URL DU SITE]` : adresse publique du site (balises Open Graph, `robots.txt`, `sitemap.xml`)

## Publier

Le dossier `site/` se publie tel quel :

- **GitHub Pages** : *Settings → Pages*, puis publier le dossier `site/` (par exemple avec une action
  `actions/upload-pages-artifact` qui pointe sur `site`).
- **Netlify** : glisser-déposer le dossier `site/`, ou régler le *publish directory* sur `site`.

## Crédits

La licence de `moon.jpg` n'est pas confirmée. À remplacer par la carte 2K du NASA CGI Moon Kit
(`lroc_color_poles_2k`, NASA's Scientific Visualization Studio), puis relancer `tools/make_assets.py`.
