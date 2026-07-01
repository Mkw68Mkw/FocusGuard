# FocusGuard – Architektur & Datenmodell

Dieses Dokument beschreibt die technische Grundstruktur der App **FocusGuard**
(React Native / Expo). Es dokumentiert die wiederverwendbaren UI-Bausteine, das
Navigationsschema, das zentrale Datenmodell sowie die Verteilung von Zustand und
Side-Effekten. Grundlage ist der bestehende Code (Reverse Engineering des
aktuellen Standes).

## Überblick

FocusGuard misst mit dem Beschleunigungssensor, wie ruhig das Handy während einer
Fokus-Session liegt, zählt Bewegungen als Unterbrechungen und berechnet daraus
einen Focus Score. Sessions werden lokal gespeichert und in einem Verlauf
angezeigt.

**Tech-Stack (aus `package.json`):**

- Expo `~54`, React Native `0.81`, React `19`
- **expo-router `~6`** – dateibasiertes Routing (Stack)
- **expo-sensors `~15`** – Accelerometer für die Bewegungsmessung
- **@react-native-async-storage/async-storage `2.2`** – lokale Persistenz
- TypeScript `~5.9`

**Projektstruktur (relevant):**

```
app/
  _layout.tsx      # Stack-Navigator + globale Screen-Optionen (Header/Theme)
  index.tsx        # Home / Start
  session.tsx      # Laufende Session (Timer + Sensor)
  result.tsx       # Ergebnis der Session
  history.tsx      # Verlauf gespeicherter Sessions
models/
  focusSession.ts  # Typ-Definition FocusSession
utils/
  sessionStorage.ts# Lade-/Speicher-/Lösch-Funktionen (AsyncStorage)
  format.ts        # Gemeinsame Formatierungs-Helfer (formatTime)
constants/
  theme.ts         # Farb-/Font-Konstanten (Basis-Template)
```

## 1. Komponenten (wiederverwendbare UI-Bausteine)

Aktuell ist die UI direkt in den Screens umgesetzt (kein `components/`-Ordner mit
eigenen Bausteinen). Es gibt jedoch klar erkennbare, **wiederkehrende Muster**,
die als wiederverwendbare Komponenten extrahiert werden sollten. Farben und
Maße unten stammen aus den `StyleSheet`-Definitionen der Screens.

| Baustein | Zweck | Kommt vor in | Extraktions-Empfehlung |
|----------|-------|--------------|------------------------|
| **Header** | Nativer Stack-Header, Indigo `#4F46E5`, weißer Text, Titel je Screen | global via `_layout.tsx` | bereits zentral gelöst |
| **ScreenContainer** | `ScrollView` mit Padding 24, `gap` 16, grauer Hintergrund `#F5F6FA` | alle Screens | als Wrapper-Komponente extrahieren |
| **ScreenTitle / Description** | Großer Titel (28–34px, `800`) + grauer Beschreibungstext | alle Screens | Text-Komponenten mit Varianten |
| **Card** | Weiße Karte, `borderRadius` 16, Schatten, Padding 18–20 | Home, Session, Result, History | Basis-`Card` mit `children` |
| **InfoCard** | Card mit Titel + mehrzeiligem Text (z. B. „So funktioniert es“) | Home, Session | Variante von `Card` |
| **StatCard (klein)** | Kleine Card in einer Row (`flex: 1`) mit Label + Wert | Session, Result | `StatCard(label, value, valueColor?)` |
| **HighlightCard** | Große farbige Card (Timer bzw. Score), zentriert, große Zahl | Session (Timer), Result (Score) | konfigurierbare `HighlightCard` |
| **ProgressBar** | Balken 0–100 % (Track + Fill) | Result | `ProgressBar(percent)` |
| **PrimaryButton** | Volle Breite, gefüllt Indigo, weißer Text | Home, Result, History | `PrimaryButton(title, onPress)` |
| **SecondaryButton** | Volle Breite, weiß mit Rand (Outline) | Home, Session | `SecondaryButton(title, onPress)` |
| **DangerButton** | Volle Breite, gefüllt Rot (`#EF4444`) | Session („Beenden“) | Variante von Button |
| **SessionListItem** | History-Card: Kopf (Datum links, Score rechts) + Detailzeile | History | `SessionListItem(session)` |
| **EmptyState** | Card mit Hinweis, wenn keine Daten vorhanden | History | `EmptyState(title, hint)` |

**Gemeinsame Helfer:**

- `formatTime(totalSeconds)` → `mm:ss` – zentral in `utils/format.ts`, importiert in `session.tsx`, `result.tsx`, `history.tsx`
- `formatDate(iso)` → lesbares Datum `de-CH` (aktuell nur in `history.tsx`)
- `getRating(score)` → `{ label, color, emoji }` (aktuell nur in `result.tsx`)

## 2. Navigation

**Primäres Schema: Stack-Navigation** (expo-router `Stack`, definiert in
`app/_layout.tsx`). Tabs oder Drawer werden nicht verwendet und sind für den
aktuellen Umfang (4 Screens, linearer Fokus-Flow) auch nicht nötig.

Globale Screen-Optionen: Header-Hintergrund `#4F46E5`, weißer Tint,
Content-Hintergrund `#F5F6FA`, heller StatusBar-Stil.

### Navigationshierarchie

```
Stack (RootLayout)
└── index      "FocusGuard"  ← Einstieg / Wurzel
    ├── session  "Session"    (push)
    │   └── result "Ergebnis" (push, mit Params)
    └── history  "Verlauf"    (push)
```

### Übergänge (aus dem Code)

| Von → Nach | Auslöser | Methode |
|------------|----------|---------|
| index → session | Button „Session starten“ | `router.push('/session')` |
| index → history | Button „Verlauf ansehen“ | `router.push('/history')` |
| session → result | Button „Session beenden“ | `router.push({ pathname: '/result', params })` |
| session → index | „Abbrechen“ (nach Dialog) | `router.dismissTo('/')` |
| result → index | Button „Zurück zum Start“ | `router.dismissTo('/')` |
| history → index | Button „Zurück zum Start“ | `router.dismissTo('/')` |

- **`push`** legt einen Screen auf den Stapel (nativer Zurück-Pfeil vorhanden).
- **`dismissTo('/')`** räumt den Stapel bis zum Home auf – verhindert, dass man
  nach dem Ergebnis „zurück“ in eine bereits beendete Session gelangt.

## 3. Datenmodell

Zentrales Datenobjekt ist die **FocusSession** (`models/focusSession.ts`):

```ts
type FocusSession = {
  id: string;              // eindeutige ID, aktuell Date.now().toString()
  date: string;            // ISO-Zeitstempel der Session (new Date().toISOString())
  durationSeconds: number; // Gesamtdauer der Session in Sekunden
  interruptions: number;   // Anzahl gezählter Bewegungs-Unterbrechungen
  longestCalmSeconds: number; // längste ununterbrochene ruhige Phase (Sekunden)
  score: number;           // Focus Score 0–100
};
```

**Ableitungen / Geschäftsregeln (im Code):**

- **Score:** `score = max(0, 100 − interruptions * 7)` (in `session.tsx`).
- **Bewertung (Result):** aus `score` abgeleitet via `getRating`:
  - `>= 90` → „Sehr fokussiert“, Grün `#10B981`, 🎯
  - `>= 70` → „Gute Session“, Grün `#22C55E`, 💪
  - `>= 50` → „Okay“, Gelb `#F59E0B`, 🙂
  - sonst → „Viele Unterbrechungen“, Rot `#EF4444`, 😬
- **Sensor-Konstanten (session.tsx):**
  - `MOVEMENT_THRESHOLD = 1.2` – ab diesem Delta zählt eine Bewegung
  - `INTERRUPTION_COOLDOWN_MS = 1500` – Mindestabstand zwischen Zählungen
  - `MOVING_DISPLAY_MS = 800` – wie lange Status „Bewegt“ sichtbar bleibt

**Persistenz-Format:** Liste `FocusSession[]` als JSON unter dem AsyncStorage-Key
`focusguard.sessions`, **neueste zuerst** (`[session, ...existing]`).

**Datenübergabe Session → Result** (Navigations-Params, kommen als String an und
werden mit `toNumber` zurückgewandelt):

- `durationSeconds`, `interruptions`, `longestCalmSeconds`, `score`

## 4. Zustand & Side-Effekte

### Lokaler Zustand (pro Screen)

- **`session.tsx`** (die eigentliche Logik):
  - `useState`: `seconds`, `interruptions`, `isMoving`, `longestCalmSeconds`
  - `useRef` (nicht-rendernde Werte): `lastReading`, `hasFirstReading`,
    `lastInterruptionTime`, `calmStreak`, `movingTimeout`, `intervalRef`,
    `subscriptionRef`
- **`history.tsx`:** `useState<FocusSession[]>` (`sessions`)
- **`result.tsx`:** kein eigener State – liest nur `useLocalSearchParams()`
- **`index.tsx`:** zustandslos (rein navigierend)

### Globaler Zustand (Context / Store)

- **Aktuell keiner.** Es gibt keinen React Context und keinen State-Store.
- Der geteilte Zustand („die gespeicherten Sessions“) wird **nicht im Speicher
  gehalten**, sondern bei jedem Betreten der Screens frisch aus AsyncStorage
  geladen.
- **Empfehlung (optional):** Falls mehr Screens dieselben Sessions brauchen oder
  Live-Aktualisierung nötig wird, einen `SessionsContext`/Store einführen, der
  `sessions`, `addSession`, `clearSessions`, `reload` bündelt.

### Side-Effekte

- **`useFocusEffect`** (statt `useEffect`), damit Effekte beim Fokussieren des
  Screens laufen und beim Verlassen sauber aufräumen:
  - `session.tsx`: startet Timer + Accelerometer beim Fokussieren, stoppt beide
    beim Verlassen (`stopSession`).
  - `history.tsx`: lädt beim Fokussieren die Sessions neu (`loadSessions`).
- **Timer:** `setInterval` (1000 ms) erhöht Dauer + verfolgt längste ruhige Phase.
- **Sensor:** `Accelerometer.setUpdateInterval(200)` + `addListener`; Delta der
  Achsen bestimmt Bewegung/Unterbrechung.
- **Nativer Dialog:** `Alert.alert` bei „Abbrechen“ (Bestätigung vor Verwerfen).

### Local-Storage-Interaktionen (`utils/sessionStorage.ts`)

| Funktion | Zweck | Verwendet in |
|----------|-------|--------------|
| `loadSessions(): Promise<FocusSession[]>` | Alle Sessions laden (leer bei Fehler) | `history.tsx`, intern in `addSession` |
| `addSession(session): Promise<FocusSession[]>` | Neue Session vorn anfügen + speichern | `session.tsx` (beim Beenden) |
| `clearSessions(): Promise<void>` | Alle Sessions löschen | `history.tsx` (Button „Verlauf löschen“, mit Bestätigungsdialog) |

- **API-Interaktionen:** keine – die App ist vollständig offline/lokal.

## Offene Punkte / Empfehlungen

- **UI-Bausteine extrahieren** (Card, Buttons, StatCard, SessionListItem) in einen
  `components/`-Ordner, um Wiederverwendung und Konsistenz zu verbessern.
- **`constants/theme.ts`** enthält aktuell nur Template-Farben und wird von den
  Screens nicht genutzt; die tatsächlichen Farben sind in den Screens hartkodiert.
  Empfehlung: zentrale Design-Tokens (Farben, Radius, Spacing) definieren und
  überall verwenden.
