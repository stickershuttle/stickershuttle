# Sticker Shuttle Website 🚀

A full-stack custom sticker ordering platform with real-time pricing, file uploads, and Shopify integration.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **State Management**: React Context API
- **GraphQL**: Apollo Client
- **Authentication**: Supabase Auth
- **File Upload**: Cloudinary integration
- **Deployment**: Vercel

### Backend API
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **GraphQL**: Apollo Server
- **E-commerce**: Shopify Admin API integration
- **File Storage**: Local uploads with Cloudinary
- **Deployment**: Railway

### Infrastructure
- **Development**: Podman Compose with multi-stage builds
- **Production**: Podman containers
- **CI/CD**: GitHub Actions
- **Domains**: 
  - Production: `stickershuttle.com`
  - Development: `stickershuttle.vercel.app`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Podman & podman-compose (optional)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sticker-shuttle-website
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy template files
   cp api/env.template api/.env
   cp frontend/env.template frontend/.env.local
   
   # Edit the .env files with your credentials
   ```

4. **Start development servers**
   ```bash
   # Option 1: Both servers at once
   npm run dev
   
   # Option 2: Individual servers
   npm run dev:api      # API on http://localhost:4000
   npm run dev:frontend # Frontend on http://localhost:3000
   ```

### Podman Development

```bash
# Start with Podman
npm run podman:dev

# Stop Podman containers
npm run podman:stop
```

## 📁 Project Structure

```
sticker-shuttle-website/
├── api/                          # GraphQL API Server
│   ├── index.js                  # Apollo Server setup
│   ├── shopify-client.js         # Shopify API integration
│   ├── upload-routes.js          # File upload handling
│   ├── Containerfile            # API container config
│   └── uploads/                 # Local file storage
├── frontend/                     # Next.js Frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Next.js pages & API routes
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities & config
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Helper functions
│   ├── public/                  # Static assets & pricing data
│   ├── Containerfile           # Frontend container config
│   └── next.config.js          # Next.js configuration
├── .github/workflows/           # CI/CD pipelines
├── podman-compose.yml          # Production containers
├── podman-compose.dev.yml      # Development with hot reload
└── README.md                   # You are here!
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both API and frontend
npm run dev:api          # Start API server only
npm run dev:frontend     # Start frontend only
npm run dev:clean        # Kill existing processes and restart

# Building
npm run build            # Build frontend for production

# Podman
npm run podman:dev       # Start development with Podman
npm run podman:stop      # Stop Podman containers
npm run podman:prod      # Start production with Podman
```

### Key Features

- **🎨 Product Customization**: Interactive calculators for vinyl stickers, holographic stickers, and more
- **📊 Real-time Pricing**: CSV-based pricing with quantity discounts and rush order options
- **📁 File Upload**: Drag-and-drop file upload with support for AI, SVG, PNG, JPG, PSD formats
- **🛒 Shopping Cart**: Full cart management with customization options
- **💳 Shopify Integration**: Direct checkout through Shopify draft orders
- **👤 User Authentication**: Supabase-powered user accounts and profiles
- **📱 Responsive Design**: Mobile-first responsive design with Tailwind CSS
- **⚡ Real-time Updates**: GraphQL subscriptions and optimistic updates

## 🚀 Deployment

### Automatic Deployment

- **Push to `main` branch** triggers automated deployment
- **Frontend**: GitHub Actions → Vercel
- **Backend**: GitHub Actions → Container Registry → Railway

### Manual Deployment

```bash
# Frontend (Vercel CLI)
cd frontend && vercel --prod

# Backend (Railway CLI)
railway up
```

### Environment Variables

**Frontend** (Vercel Dashboard):
- Supabase configuration
- Cloudinary credentials
- GraphQL API endpoint

**Backend** (Railway Dashboard):
- Shopify API credentials
- Database connections
- File upload settings

## 📋 API Documentation

### GraphQL Endpoints

- **Development**: `http://localhost:4000/graphql`
- **Production**: `https://stickershuttle-production.up.railway.app/graphql`

### Key Mutations

```graphql
# Create draft order
mutation CreateDraftOrder($input: DraftOrderInput!) {
  createDraftOrder(input: $input) {
    id
    invoice_url
    total_price
  }
}

# File upload via REST
POST /api/upload
```

## 🔒 Security Notes

- Environment variables are managed through deployment platform dashboards
- API credentials are never exposed in frontend code
- File uploads are validated and sanitized
- User authentication handled by Supabase

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test locally with `npm run dev`
4. Submit a pull request

## 📞 Support

For setup issues or questions:
- Check the `api/SHOPIFY_SETUP.md` for Shopify integration
- Review environment template files for required variables
- Ensure all dependencies are installed with `npm run install:all`

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   Apollo API    │────│   Shopify API   │
│     (Vercel)    │    │   (Railway)     │    │   (E-commerce)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │                       │                       
    ┌─────────┐             ┌─────────┐                 
    │Supabase │             │Cloudinary│                 
    │  Auth   │             │ Storage │                 
    └─────────┘             └─────────┘                 
```

---

Built with ❤️ by Sticker Shuttle.
