# Using Pre-built Docker Image

If you don't want to build the Docker image yourself, you can use the pre-built image.

## Download and Load the Image

1. **Download the Docker image** (if provided separately)
   ```bash
   # The image file is: xtream-to-strm-web-docker-image.tar.gz
   ```

2. **Load the image into Docker**
   ```bash
   gunzip xtream-to-strm-web-docker-image.tar.gz
   sudo docker load -i xtream-to-strm-web-docker-image.tar
   ```

3. **Verify the image is loaded**
   ```bash
   sudo docker images | grep xtream
   ```
   You should see: `xtream_to_strm_web_app:latest`

4. **Run the container**
   ```bash
   sudo docker run -d \
     --name xtream_app \
     -p 80:8000 \
     -v $(pwd)/output:/output \
     -v $(pwd)/db:/db \
     -v $(pwd)/app.log:/app/app.log \
     --restart unless-stopped \
     xtream_to_strm_web_app:latest
   ```

5. **Access the application**
   
   Open your browser and navigate to: `http://localhost`
   
   Default credentials:
   - Username: `admin`
   - Password: `admin`

## Using with Docker Compose

Alternatively, you can use the provided `docker-compose.yml`:

```bash
sudo docker-compose up -d
```

This will use the loaded image instead of building from scratch.
