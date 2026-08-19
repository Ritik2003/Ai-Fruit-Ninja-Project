# 🍉 AI Hand Gesture Fruit Ninja

A complete browser-based Fruit Ninja game controlled with your hand. It uses MediaPipe Hand Landmarker in the browser to track your index fingertip and turn it into a virtual blade.

## ✨ Features

- Real-time hand tracking with MediaPipe Tasks Vision
- Android-safe GPU → CPU delegate fallback
- Alternate-frame detection on phones for smoother FPS
- Swipe-based fruit slicing, combos, bombs, lives, and score
- Procedural Web Audio sound effects
- Mobile-safe canvas resizing with `visualViewport` + debounce
- Inline muted video to prevent fullscreen video layout breaks
- GitHub Pages / HTTPS ready

## 🚀 Quick Start

### Local Development

Camera access requires `localhost` or HTTPS.

```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

Open `http://localhost:8000`, allow camera access, and click **Start Game**.

### GitHub Pages Deployment

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages**.
3. Select **Deploy from branch** → `main` → `/ (root)`.
4. Open the generated GitHub Pages URL.

GitHub Pages provides HTTPS by default, which is required for camera access.

## 📱 Testing on Android

1. Android phone par **Chrome browser** open karo.
2. Deployed GitHub Pages HTTPS link kholo.
3. **Start Game** dabao.
4. Browser camera permission maange to **Allow** karo.
5. Front camera ke saamne apna hand frame mein rakho.
6. Index finger ko camera ke saamne move karke fruits slice karo.
7. Agar camera error aaye to **Retry Camera** dabao ya lock icon → Permissions → Camera → Allow karo.

## 🎮 How to Play

1. Allow camera permission.
2. Show your hand to the front camera.
3. Move your index finger to control the blade.
4. Slice fruits and avoid bombs.
5. Missing a normal fruit costs one life.
6. Hitting a bomb costs one life.

## 🔧 Android Compatibility Notes

- MediaPipe first tries the **GPU delegate** and automatically falls back to **CPU delegate** if the phone does not support GPU inference.
- Hand detection runs on alternate rendered frames on mobile to reduce FPS drops on low-end Android phones.
- The webcam video uses `playsinline`, `muted`, and `autoplay` so Android/iOS does not force fullscreen playback.
- Canvas resizing uses `visualViewport` plus a debounced resize handler to reduce jitter from Android Chrome's address bar.
- Gameplay touch events use `passive: false` to prevent pull-to-refresh and accidental scrolling.
- The viewport meta disables pinch zoom and accidental page scaling during gameplay.

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera permission denied | Chrome address bar → lock icon → Permissions → Camera → Allow |
| No camera found | Check that the phone has a working front camera |
| Camera busy | Close other apps/tabs using the camera |
| Hand not detected | Improve lighting and keep the full hand inside the frame |
| Low FPS | Close background tabs, disable battery saver, and keep the phone cool |
| Camera blocked | Use the HTTPS GitHub Pages URL or localhost |

## 📁 Project Structure

```text
ai-fruit-ninja/
├── index.html
├── style.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── handTracking.js
│   ├── fruit.js
│   ├── particle.js
│   ├── collision.js
│   ├── audio.js
│   └── utils.js
├── assets/
│   ├── sounds/
│   └── images/
└── README.md
```

## 📄 License

MIT License - feel free to use, modify, and distribute.
