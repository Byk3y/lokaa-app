# Lokaa Connect Spaces

A modern web application for creating and managing online communities and spaces. Built with React, TypeScript, and Supabase.

## 🚀 Features

- **Authentication System**
  - User registration and login
  - Profile management
  - Secure session handling

- **Community Management**
  - Create and manage communities
  - Discover existing communities
  - Community settings and customization

- **Space Management**
  - Create dedicated spaces within communities
  - Customize space settings
  - Manage space content and members

- **Modern UI/UX**
  - Built with Shadcn UI components
  - Responsive design
  - Dark mode support
  - Toast notifications
  - Tooltips and interactive elements

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State Management**: React Query
- **Routing**: React Router v6
- **Authentication**: Supabase Auth
- **Database**: Supabase
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns
- **Charts**: Recharts
- **Notifications**: Sonner

## 📦 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd lokaa-connect-spaces
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## 🏗️ Project Structure

```
src/
├── components/         # Reusable UI components
├── contexts/          # React contexts (Auth, etc.)
├── hooks/             # Custom React hooks
├── pages/             # Page components
├── utils/             # Utility functions
└── App.tsx           # Main application component
```

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🔒 Authentication Flow

The application uses Supabase for authentication with the following features:
- Email/password authentication
- Protected routes
- Session management
- User profile management

## 🎨 UI Components

The project uses Shadcn UI, a collection of re-usable components built with Radix UI and Tailwind CSS. This includes:
- Buttons
- Forms
- Dialogs
- Dropdowns
- Navigation menus
- Toast notifications
- And many more

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop
- Tablet
- Mobile devices

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

mkdir .cursor

touch .cursor/mcp.json

{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<your-personal-access-token>"
      ]
    }
  }
}
