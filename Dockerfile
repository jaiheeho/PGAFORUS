# Use official Python image as base
FROM python:3.9

# Set working directory
WORKDIR /app

# Copy all files into container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright with only Chromium
RUN pip install playwright && \
    playwright install chromium && \
    apt-get update && \
    apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libxcb1 \
    libdbus-1-3

# Create volume for SQLite database
VOLUME /app/instance

# Create migrations directory if it doesn't exist
RUN mkdir -p migrations

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Run the app with Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8080", "pga_leaderboard_parser:app"]