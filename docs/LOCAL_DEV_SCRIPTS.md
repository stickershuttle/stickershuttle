# Local Development Scripts 🚀

These scripts help you quickly start and stop your entire Sticker Shuttle development environment with a single command!

## What Gets Started

When you run the start script, it launches:
1. **Stripe CLI** - Forwards webhooks from Stripe to your local API
2. **API Server** - GraphQL backend on port 5000
3. **Frontend** - Next.js application on port 3000

## Available Scripts

### Windows Batch Files (.bat)
- `start-local-dev.bat` - Starts all services
- `stop-local-dev.bat` - Stops all services

### PowerShell Scripts (.ps1)
- `start-local-dev.ps1` - Starts all services with colored output
- `stop-local-dev.ps1` - Stops all services (if you create it)

## Usage

### Starting Development Environment

#### Option 1: Using Batch File (Simplest)
```cmd
start-local-dev.bat
```

#### Option 2: Using PowerShell (Better output)
```powershell
# First time only - allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the script
.\start-local-dev.ps1
```

### Stopping Development Environment

#### Option 1: Close Windows
Simply close each of the 3 terminal windows that opened.

#### Option 2: Use Stop Script
```cmd
stop-local-dev.bat
```

## Features

✨ **Automatic Port Cleanup** - Kills any processes using ports 3000 or 5000 before starting

🎨 **Colored Output** - PowerShell version includes colored status messages

🌐 **Auto-Opens Browser** - Automatically opens http://localhost:3000 after startup

⚡ **Error Handling** - Shows helpful error messages if something fails

📊 **Status Display** - Each service runs in its own window with clear labels

## Troubleshooting

### "Stripe CLI not found"
Install the Stripe CLI from: https://stripe.com/docs/stripe-cli

### "Port already in use"
The scripts automatically clean up ports, but if issues persist:
1. Run `stop-local-dev.bat`
2. Wait a few seconds
3. Run `start-local-dev.bat` again

### "npm run dev fails"
Make sure you've installed dependencies:
```bash
cd api && npm install
cd ../frontend && npm install
```

### PowerShell Execution Policy Error
Run this command once:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Tips

- Keep the main window open to see the startup status
- Each service runs in its own window - you can minimize them
- The browser opens automatically after 5 seconds
- All services must be running for the app to work properly

## Environment Variables

Make sure you have `.env` files in both:
- `/api/.env` - API environment variables
- `/frontend/.env.local` - Frontend environment variables

Never commit these files to Git!

---

Happy coding! 🎉 