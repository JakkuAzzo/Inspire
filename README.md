# Inspire

Inspire is a full-stack TypeScript creativity app that fuels musicians with curated randomness — words, memes, emotional arcs, and sample challenges — to spark new ideas.

## 🎯 Features

- **Power Words**: Random word combinations to inspire lyrics and themes
- **Meme Energy**: Cultural references and meme concepts for creative direction
- **Emotional Arc**: Three-stage emotional journey for storytelling
- **Sample Challenge**: Specific creative constraints and challenges with different types:
  - Time Constraints
  - Style Fusion
  - Sample Flips
  - Vocal Challenges
  - Limited Tools

## 🛠️ Tech Stack

### Backend
- **TypeScript** - Type-safe backend development
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **CORS** - Cross-origin resource sharing

### Frontend
- **TypeScript** - Type-safe frontend development
- **React** - UI library
- **Vite** - Build tool and development server
- **CSS3** - Modern styling with gradients and animations

## 📦 Project Structure

```
Inspire/
├── backend/              # Backend API
│   ├── src/
│   │   ├── index.ts           # Express server
│   │   ├── types.ts           # TypeScript type definitions
│   │   └── fuelPackGenerator.ts # Fuel pack generation logic
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # Frontend React app
│   ├── src/
│   │   ├── App.tsx            # Main application component
│   │   ├── App.css            # Application styles
│   │   ├── types.ts           # TypeScript type definitions
│   │   ├── index.css          # Global styles
│   │   └── main.tsx           # Application entry point
│   ├── package.json
│   └── vite.config.ts
└── package.json          # Root package.json with scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or higher)
- npm (v10 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JakkuAzzo/Inspire.git
cd Inspire
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Development

To run both frontend and backend in development mode:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```
The backend will start on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```
The frontend will start on `http://localhost:5173` (or another available port)

The frontend is configured to proxy API requests to the backend automatically.

### Production Build

Build both frontend and backend:
```bash
npm run build
```

Or build individually:
```bash
npm run build:backend
npm run build:frontend
```

To start the backend in production:
```bash
npm run start:backend
```

## 🎮 Usage

1. Open the application in your browser (default: `http://localhost:5173`)
2. Click the "🎲 Generate Fuel Pack" button
3. Receive a randomized creative fuel pack containing:
   - 6 power words for inspiration
   - 3 meme concepts
   - An emotional arc (start → middle → end)
   - A sample challenge with type, description, and constraint
4. Use the generated elements to fuel your creative process!

## 🎨 For Musicians

**Rappers**: Use power words for wordplay, meme references for cultural relevance, and emotional arcs for storytelling.

**Singers**: Let emotional arcs guide your vocal performance and word choices inspire your melodies.

**Producers**: Use sample challenges to push your production skills and meme concepts for creative sampling ideas.

## 📝 API Endpoints

### GET /api/health
Health check endpoint
- **Response**: `{ status: 'ok', message: 'Inspire API is running' }`

### GET /api/fuel-pack
Generate a new fuel pack
- **Response**: FuelPack object with words, memes, emotional arc, and sample challenge

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📄 License

ISC
