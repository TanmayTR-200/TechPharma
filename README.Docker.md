# TechPharma Docker Deployment Guide

This guide will help you deploy the TechPharma B2B platform using Docker.

## Prerequisites

- Docker installed ([Download Docker](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (included with Docker Desktop)

## Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd TechPharma
```

### 2. Set Up Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your actual values
# At minimum, change JWT_SECRET to a secure random string
```

### 3. Build and Run with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Docker Commands Cheat Sheet

### Basic Operations
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Building and Rebuilding
```bash
# Build images
docker-compose build

# Rebuild and restart
docker-compose up -d --build

# Build without cache
docker-compose build --no-cache
```

### Maintenance
```bash
# Remove all containers and volumes
docker-compose down -v

# Check service status
docker-compose ps

# Execute commands in running container
docker-compose exec backend sh
docker-compose exec frontend sh

# View resource usage
docker stats
```

## Production Deployment

### Security Considerations
1. **Change default secrets**: Update `JWT_SECRET` to a strong random string
2. **Use environment variables**: Never commit `.env` to version control
3. **Enable HTTPS**: Use a reverse proxy like Nginx with SSL certificates
4. **Update CORS settings**: Configure proper CORS origins in backend

### Recommended Production Setup
```yaml
# Add to docker-compose.yml for production
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

### Environment Configuration

#### Required Environment Variables
- `JWT_SECRET`: Secure random string (minimum 32 characters)
- `NEXT_PUBLIC_API_URL`: Backend API URL (update for production domain)

#### Optional Environment Variables
- `MONGODB_URI`: If migrating from JSON to MongoDB
- `CLOUDINARY_*`: For image uploads
- `EMAIL_*`: For email notifications
- `FIREBASE_*`: If using Firebase authentication

## Deployment Platforms

### Deploy to Cloud Platforms

#### Docker Hub (for image sharing)
```bash
# Build and tag images
docker build -t yourusername/techpharma-backend:latest ./backend
docker build -t yourusername/techpharma-frontend:latest ./frontend

# Push to Docker Hub
docker push yourusername/techpharma-backend:latest
docker push yourusername/techpharma-frontend:latest
```

#### AWS ECS / Azure Container Instances / Google Cloud Run
1. Push images to container registry (ECR, ACR, GCR)
2. Create service definitions
3. Configure environment variables
4. Set up load balancers

#### DigitalOcean / Railway / Render
1. Connect your GitHub repository
2. Select docker-compose.yml or individual Dockerfiles
3. Configure environment variables in the platform
4. Deploy

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Change ports in docker-compose.yml
ports:
  - "8080:3000"  # Use different host port
```

**Container Won't Start**
```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

**Cannot Connect to Backend**
- Verify `NEXT_PUBLIC_API_URL` in frontend environment
- Check network configuration in docker-compose.yml
- Ensure backend health check passes

**Data Loss After Restart**
- Backend data is persisted in `backend-data` volume
- To backup: `docker cp techpharma-backend:/app/data ./backup`
- To restore: `docker cp ./backup/. techpharma-backend:/app/data`

## Data Persistence

Backend data (JSON files) is stored in a Docker volume named `backend-data`. This ensures data persists between container restarts.

### Backup Data
```bash
# Create backup
docker run --rm -v techpharma_backend-data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz -C /data .

# Restore backup
docker run --rm -v techpharma_backend-data:/data -v $(pwd):/backup alpine tar xzf /backup/data-backup.tar.gz -C /data
```

## Scaling

To scale services:
```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Note: You'll need a load balancer for multiple instances
```

## Development vs Production

### Development
```bash
# Use development docker-compose file (if created)
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
# Use production docker-compose file
docker-compose -f docker-compose.prod.yml up -d
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure Docker and Docker Compose are up to date
4. Check firewall/port settings

## Additional Resources
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
