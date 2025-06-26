# Football Predictions Pro Website

Website modern și responsive pentru afișarea predicțiilor avansate de fotbal generate prin algoritmi AI.

## 🚀 Caracteristici

- **Design Modern**: Interface clean și profesional
- **Responsive**: Funcționează perfect pe toate dispozitivele
- **Predicții Avansate**: Afișează rezultatele simulărilor cu 100.000+ iterații
- **Filtrare Inteligentă**: Filtrează după competiție, nivel de încredere, și echipe
- **Căutare Rapidă**: Găsește rapid echipele dorite
- **Detalii Complete**: Modal cu informații detaliate pentru fiecare meci
- **Performance**: Optimizat pentru viteza de încărcare

## 📁 Structura Proiectului

```
football-predictions-site/
├── index.html              # Pagina principală
├── styles.css               # Stiluri CSS moderne
├── script.js                # Funcționalitate JavaScript
├── soccer24_matches_full_*.json  # Date meciuri (copiat automat)
├── images/                  # Logo-uri echipe și steaguri competiții
│   ├── teams/              # Logo-urile echipelor
│   └── competitions/       # Steagurile competițiilor
└── README.md               # Acest fișier
```

## 🛠️ Cum să Folosești

### 1. **Pornirea Website-ului**
```bash
# Deschide index.html în browser sau folosește un server local
# Pentru server local simplu:
python3 -m http.server 8000
# Apoi accesează: http://localhost:8000
```

### 2. **Actualizarea Datelor**
Website-ul încarcă automat datele din `soccer24_matches_full_*.json`. Pentru actualizare:
```bash
# Din directorul principal (Scrapp/)
cp soccer24_matches_full_*.json football-predictions-site/
```

### 3. **Filtrarea Meciurilor**
- **Competiție**: Selectează competiția dorită din dropdown
- **Încredere**: Filtrează după nivelul de încredere în predicții
- **Căutare**: Tastează numele echipei în bara de căutare

### 4. **Vizualizarea Detaliilor**
Click pe orice meci pentru a vedea:
- Predicții detaliate de scoruri
- Probabilități pentru diferite piețe
- Analiza algoritmilor AI
- Odds-urile bookmakeri
- Valorile echipelor

## 🎨 Design Features

### **Paleta de Culori**
- Primary Blue: `#2563eb`
- Success Green: `#059669` 
- Warning Orange: `#f59e0b`
- Danger Red: `#dc2626`
- Neutral Grays: `#f9fafb` to `#111827`

### **Typography**
- Font Family: Inter (Google Fonts)
- Font Weights: 300, 400, 500, 600, 700
- Responsive font sizing

### **Components**
- Gradient headers și hero sections
- Card-based layout pentru meciuri
- Modal overlays pentru detalii
- Badge system pentru confidence levels
- Responsive grid layouts

## 📱 Responsive Breakpoints

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

## ⚡ Performance Optimizations

1. **CSS Variables**: Pentru consistență și ușurința de modificare
2. **Debounced Search**: Reducerea call-urilor la căutare
3. **Lazy Image Loading**: Fallback SVG pentru logo-uri lipsă
4. **Efficient DOM Manipulation**: Minimal reflow/repaint
5. **Responsive Images**: Optimizate pentru diferite device-uri

## 🔧 Tehnologii Folosite

- **HTML5**: Semantic markup
- **CSS3**: Modern features (Grid, Flexbox, Custom Properties)
- **Vanilla JavaScript**: ES6+ features, async/await
- **Font Awesome**: Iconuri
- **Google Fonts**: Typography

## 📊 Formatul Datelor

Website-ul citește date în formatul JSON generat de simulatorul de meciuri:
```json
{
  "name": "Competition Name",
  "country": "Country",
  "flag_icon_local": "path/to/flag.png",
  "matches": [
    {
      "home_team": "Team A",
      "away_team": "Team B", 
      "time": "19:00",
      "odds": ["1.85", "3.60", "4.00"],
      "predictions": {
        "top_3_correct_scores": [...],
        "goals_markets": {...},
        "market_analysis": {...}
      }
    }
  ]
}
```

## 🚨 Disclaimer

⚠️ **Important**: Pariurile pot dezvolta dependență. Joacă responsabil!

Predicțiile sunt generate prin algoritmi avansați dar nu garantează rezultatele reale ale meciurilor. 