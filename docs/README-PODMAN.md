# Sticker Shuttle - Podman Setup

This project now uses Podman instead of Docker for containerization.

## Prerequisites

### Windows:
1. Install Podman Desktop: https://podman-desktop.io/downloads
2. Run `setup-podman-windows.bat` to configure PATH and initialize Podman machine
3. No need for separate podman-compose - Podman 4.0+ has built-in compose support

### Linux/Mac:
1. Install Podman: https://podman.io/getting-started/installation
2. Podman 4.0+ includes compose support built-in

## Development

Start the development environment:
```bash
podman compose -f podman-compose.dev.yml up --build
```

Or use the batch file:
```bash
start-podman-dev.bat
```

## Production

Start the production environment:
```bash
podman compose -f podman-compose.yml up --build
```

Or use the batch file:
```bash
start-podman-prod.bat
```

## Individual Services

### API only:
```bash
cd api
podman build -t sticker-api .
podman run -p 4000:4000 sticker-api
```

### Frontend only:
```bash
cd frontend
podman build -t sticker-frontend .
podman run -p 3000:3000 sticker-frontend
```

## Common Podman Commands

- `podman ps` - List running containers
- `podman images` - List images
- `podman compose down` - Stop and remove containers
- `podman system prune` - Clean up unused containers/images

## Migration from Docker

Podman is largely compatible with Docker commands. Main differences:
- Uses `podman` instead of `docker`
- Uses `podman compose` instead of `docker-compose`
- Runs rootless by default
- No daemon required 