# Express Server Setup

This project includes two Express.js servers to serve your React application:

## 🚀 Quick Start

### 1. Build the React App
```bash
npm run build
```

### 2. Start the Server
```bash
# Simple Express server
npm start

# Advanced Express server (with compression, security, etc.)
npm run start:advanced

# Alternative: Use serve package
npm run start:serve
```

## 📁 Server Files

### `index.js` - Simple Express Server
- Basic static file serving
- React Router support
- Minimal configuration
- Perfect for development and simple deployments

### `server.js` - Advanced Express Server
- **Compression**: Gzip compression for better performance
- **Security**: Helmet.js for security headers
- **Caching**: Static file caching (1 day)
- **Health Check**: `/api/health` endpoint
- **Error Handling**: Proper error handling middleware
- **Production Ready**: Optimized for production deployment

## 🌐 Access Your App

Once started, your app will be available at:
- **Local**: `http://localhost:3000`
- **Network**: `http://0.0.0.0:3000` (accessible from other devices)

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)

### Example:
```bash
PORT=8080 npm start
```

## 📊 Health Check

The advanced server includes a health check endpoint:
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## 🚀 Deployment

### Azure App Service
1. Use the `deploy.cmd` script (already configured)
2. The server will automatically serve your built React app
3. Set `PORT` environment variable in Azure

### Other Platforms
1. Build your app: `npm run build`
2. Start the server: `npm start` or `npm run start:advanced`
3. Configure your platform to run the Node.js server

## 📝 Available Scripts

- `npm start` - Run simple Express server
- `npm run start:advanced` - Run advanced Express server
- `npm run start:serve` - Use serve package
- `npm run dev` - Development server (Vite)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔒 Security Features (Advanced Server)

- **Helmet.js**: Security headers
- **Compression**: Gzip compression
- **Static File Caching**: Optimized caching headers
- **Error Handling**: Proper error responses

## 📈 Performance Features (Advanced Server)

- **Compression**: Reduces file sizes by ~70%
- **Caching**: Static files cached for 1 day
- **ETags**: Efficient cache validation
- **Last Modified**: Browser cache optimization
