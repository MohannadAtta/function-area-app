# 📐 Full-Stack Integral Calculator

This project is a full-stack web application. It calculates and visualizes the definite integral (area under the curve) of a user-defined function in real-time.

---

## 🚀 Features
- Input any valid mathematical expression (e.g. `x**2 * sin(x)`)
- Specify lower and upper integration limits
- Automatically calculates and updates area under the curve
- Real-time graph updates using Chart.js
<!--- Fully responsive UI with creative dark mode theme -->

---

## 🧱 Tech Stack

### Frontend
- **Framework**: Angular 17+ (Standalone Component Architecture)
- **Visualization**: Chart.js via `ng2-charts`
- **Styling**: Custom CSS with dark theme
- **Reactive Input**: RxJS with `debounceTime`

### Backend
- **Framework**: FastAPI (Python)
- **Computation**: `scipy.integrate.quad`
- **Safe Parsing**: `sympy` to safely evaluate input expressions
- **Data Models**: `pydantic`
- **Testing**: `pytest`

---

## 🖥️ Architecture & Flow

```
[ User ] → [ Angular Input Fields ] → [ RxJS debounced trigger ]
         → POST /integrate (FastAPI) → sympy + scipy → JSON result
         → Display result + Chart update
```

---

## 📁 Project Structure

```
function-area-app/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── utils.py             # Secure expression parsing
│   ├── test_main.py         # Backend unit tests
│   └── requirements.txt
├── frontend/
│   └── src/app/
│       ├── app.component.ts # UI logic + API + chart
│       ├── app.component.html
│       ├── app.component.css
│       └── app.config.ts    # Standalone Angular config
└── README.md
```

---

## 🌐 Networking & Deployment

- **Frontend port**: `4200`
- **Backend port**: `8000`
- **CORS**: Configured to allow frontend domain (esp. Codespaces URLs)
- **Codespaces Ports**: Port 8000 must be set to **Public** for frontend to connect

---

## 🧪 Run Locally

### Backend (Python)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (Angular)
```bash
cd frontend
npm install
ng serve
```

Visit: [http://localhost:4200](http://localhost:4200)

---

## ✅ Status
- ✅ All core features implemented
- ✅ Bonus: Real-time updates without button
- ✅ CORS/networking debugged
- ✅ Tested in GitHub Codespaces and local
- ✅ Ready for live demo or interview presentation

---

## 📞 Contact
**Developer:** Mohannad Atta  
