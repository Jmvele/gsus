# GSUS WEB

The first desktop version of Jesus Velez's personal website. It uses semantic HTML, one editable stylesheet, Three.js for the procedural background, and GSAP for subtle interface animation.

## Preview

Open this folder in Visual Studio Code and use the Live Server extension on `index.html`.

Or run this command from the project folder:

```powershell
python -m http.server 5500
```

Then open `http://localhost:5500`.

## Editing guide

- Page text and links: `index.html`
- Layout, type, spacing, and link styles: `css/styles.css`
- Background colors, flowing movement, and pointer response: `js/background.js`
- GSAP entrance motion: `js/main.js`

The portfolio and social/artist URLs are placeholders until final links and documents are provided. Three.js, GSAP, and Montserrat currently load from CDNs, so an internet connection is required during development.
