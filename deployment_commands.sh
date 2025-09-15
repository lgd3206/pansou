# For Docker deployment
docker-compose down
docker-compose up -d --build

# Or if using Docker directly
docker stop pansou
docker rm pansou
docker build -t pansou .
docker run -d --name pansou -p 8888:8888 pansou

# For direct Go deployment
go build -o pansou .
./pansou

# Check if service is running
curl -I http://localhost:8888/robots.txt
