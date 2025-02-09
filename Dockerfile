# Use official Python image as base
FROM python:3.9

# Set working directory
WORKDIR /app

# Copy all files into container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir flask pandas requests beautifulsoup4 gunicorn bs4

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Run the app with Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8080", "PGA_FOR_US:app"]