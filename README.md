# OffMess - Campus Food Pre-Order System

Pre-order meals from campus canteens and skip the queue! A Progressive Web App (PWA) for students and canteen administrators.

## 🚀 Features

### For Students:
- 📱 **Install as App** - Works like a native app on your phone
- 🍽️ **Browse Canteens** - View menus and prices
- 🛒 **Quick Ordering** - Add items to cart and checkout
- 💳 **Multiple Payment Options** - Pay online or at counter
- 🔔 **Real-time Notifications** - Get notified when order is ready
- 📊 **Order History** - Track all your orders with filters
- 🎯 **Queue Position** - See your position in the queue
- 🔐 **Pickup Code** - Secure order collection
- 📞 **Contact Admin** - Call canteen directly if needed
- 🌙 **Dark Mode** - Easy on the eyes
- 📴 **Works Offline** - View orders even without internet

### For Canteen Admins:
- 📋 **Order Management** - Accept/decline incoming orders
- 👨‍🍳 **Status Updates** - Mark orders as preparing/ready/collected
- 🔔 **New Order Alerts** - Get notified instantly
- 📊 **Queue Management** - See all active orders
- 🍔 **Menu Control** - Toggle item availability
- ⏸️ **Order Control** - Start/stop accepting orders
- 📱 **Mobile Friendly** - Manage from any device

### For Campus Admins:
- 🏨 **Hostel Management** - Add/edit/delete hostels
- 📅 **Mess Menu** - Manage weekly mess menus
- 👥 **User Management** - Oversee system users

## 🛠️ Tech Stack

### Frontend:
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **PWA** - Progressive Web App features

### Backend:
- **FastAPI** - Python web framework
- **SQLAlchemy** - ORM
- **SQLite** - Database (PostgreSQL for production)
- **WebSockets** - Real-time updates
- **Google OAuth** - Authentication

## 📦 Project Structure

```
OffMess_Web/
├── apps/
│   ├── api/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   ├── crud.py
│   │   │   └── ...
│   │   └── requirements.txt
│   └── web/          # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── lib/
│       ├── public/
│       └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites:
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup:
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs on http://localhost:8000

### Frontend Setup:
```bash
cd apps/web
npm install
npm run dev
```

Frontend runs on http://localhost:3000

## 🧪 Test Credentials

- **Student**: roll `S001` / password `password123`
- **Canteen Admin**: `main_canteen@campus.test` / `admin123`
- **Campus Admin**: `campus.admin@campus.test` / `admin123`

## 🌐 Deployment

See [DEPLOYMENT.md](apps/web/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy:
1. **Backend**: Deploy to Railway/Render
2. **Frontend**: Deploy to Vercel
3. **Icons**: Create app icons first! (See PWA_SETUP.md)

## 📱 PWA Installation

### On Android:
1. Open website in Chrome
2. Tap menu → "Install app"
3. App appears on home screen

### On iPhone:
1. Open website in Safari
2. Tap Share → "Add to Home Screen"
3. App appears on home screen

## 🔐 Authentication

- **Students**: Google OAuth (@iitism.ac.in) or roll number/password
- **Admins**: Email/password login
- **Session**: JWT tokens with HTTP-only cookies

## 🎨 Branding

- **Name**: OffMess
- **Colors**: 
  - Primary: Orange (#f97316)
  - Background: Dark (#171717)
- **Icon**: 🍽️ Food/Plate emoji

## 📄 Documentation

- [PWA Setup Guide](apps/web/PWA_SETUP.md) - Progressive Web App configuration
- [Deployment Guide](apps/web/DEPLOYMENT.md) - How to deploy to production

## 🐛 Troubleshooting

### Backend not starting:
- Check Python version (3.9+)
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`

### Frontend not starting:
- Check Node.js version (18+)
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Next.js cache: `rm -rf .next`

### CORS errors:
- Make sure backend is running on port 8000
- Check CORS settings in `apps/api/app/main.py`

## 📄 License

This project is for educational purposes.

## 👥 Credits

Built for campus canteen management and student convenience.

---

**OffMess** - Skip the queue, order ahead! 🍽️
