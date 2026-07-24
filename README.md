# ClassNotes Live
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/7a582763-9bf8-4cb9-8551-b6aff38e6f98" />
A real-time collaborative classroom platform built for teachers and students. ClassNotes Live combines shared notes, interactive learning tools, and role-based controls into one seamless web app.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

##  Features

### 🎨 Collaborative Canvas
- Multiple brush sizes and colors
- Real-time drawing with other users
- Perfect for diagrams, math problems, quick sketches, and visual explanations
- Works inside each room so students and teachers collaborate live

### 📝 Real-Time Notes
- Shared text editor for each room
- Instant updates across all connected users
- Teachers can lock the notes, preventing students from editing
- Great for lectures, guided exercises, and controlled writing sessions

### 🧠 Quizzes & Flashcards
- Built-in quiz system for quick assessments
- Flashcards for memorization and study
- Students can practice directly inside the app
- Teachers can create and manage learning materials

### 🌗 Dark & Light Theme
- Full theme toggle
- Clean UI optimized for both bright and low-light environments
- Saves user preference

### 👥 User Roles

| Student Account | Teacher Account |
|-----------------|-----------------|
| Join rooms | Create rooms |
| Write notes (unless locked) | Lock/unlock notes |
| Draw on the canvas | Control collaboration |
| Take quizzes | Manage quizzes & flashcards |
| Use flashcards | Lead real-time sessions |

### 🔐 Authentication
- Sign Up / Sign In system
- Choose Teacher or Student during registration
- Secure session handling
- Role-based permissions

## 🚀 Live Demo

[https://class-notes-live.vercel.app/](https://class-notes-live.vercel.app/)

## 📦 Tech Stack

### Frontend
- **React 19** - UI library
- **TanStack Start** - Full-stack React framework
- **TanStack Router** - Type-safe routing
- **Tailwind CSS** - Styling
- **Radix UI** - Unstyled UI components
- **Firebase** - Authentication & Firestore

### Backend
- **Fastify** - Fast Node.js web framework
- **Firebase Admin** - Server-side Firebase SDK
- **WebSocket** - Real-time communication

## 🛠️ Prerequisites

- **Node.js** >= 20
- **npm** or **bun** (recommended)
- **Firebase project** with Firestore and Authentication enabled

## 📋 Setup

### 1. Clone the repository

```bash
git clone https://github.com/AnastKara/ClassNotes_Live.git
cd ClassNotes_Live
```

### 2. Configure environment variables

#### Frontend (.env)
```bash
cp .env.example .env
```

Edit `.env` with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_BASE_URL=http://localhost:3001
```

#### Backend (backend/.env)
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your Firebase Admin credentials:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
PORT=3001
CORS_ORIGIN=http://localhost:5174
```

### 3. Install dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 4. Start development servers

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
cd backend
npm run dev
```

The application will be available at `http://localhost:5174`

## 📁 Project Structure

```
ClassNotes_Live/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── drawing-canvas.tsx
│   │   ├── draw-app.tsx
│   │   └── ui/          # Radix UI components
│   ├── routes/            # TanStack Router routes
│   │   ├── index.tsx      # Main application
│   │   ├── login.tsx      # Authentication page
│   │   └── signup.tsx     # Registration page
│   ├── integrations/      # Third-party integrations
│   │   └── firebase/      # Firebase client configuration
│   ├── lib/               # Utility functions
│   └── styles.css         # Global styles
├── backend/
│   ├── src/
│   │   ├── routes/        # API routes
│   │   │   ├── rooms.ts   # Room management
│   │   │   ├── flashcards.ts
│   │   │   ├── users.ts
│   │   │   └── health.ts
│   │   ├── services/      # Business logic
│   │   ├── security/      # Authentication middleware
│   │   └── server/        # Server configuration
│   └── package.json
├── vite.config.ts
└── package.json
```

## 🔧 Available Scripts

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

### Backend
```bash
npm run dev        # Start development server with hot reload
npm run build      # Compile TypeScript
npm run start      # Start production server
npm run lint       # Run ESLint
```

## 📊 Firestore Collections

- `rooms` - Subject room documents with content and lock status
- `flashcards` - Flashcard documents linked to rooms
- `users` - User profiles with role information

## 🎯 Project Goals

ClassNotes Live aims to be a lightweight, fast, and accessible classroom collaboration tool that supports:
- **Live teaching** - Real-time note sharing during lectures
- **Group study** - Collaborative learning environments
- **Visual learning** - Drawing and diagramming capabilities
- **Quick assessments** - Built-in quiz system for instant feedback
- **Organized note-taking** - Subject-based room organization

## 🏁 Roadmap

Planned future upgrades:
- [ ] Offline mode with local storage sync
- [ ] Real time rooms
- [ ] CRDT-based syncing for conflict-free collaboration
- [ ] Document history and version control
- [ ] Teacher dashboards for analytics
- [ ] Multi-room management interface

## 🤝 Contributing

Contributions are welcome! If you want to add features, improve UI, or help with backend logic, feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Anast Kara**

- GitHub: [@AnastKara](https://github.com/AnastKara)

---

Built with TanStack Start, Fastify, and Firebase.
