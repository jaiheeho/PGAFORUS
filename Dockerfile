# Use official Python image as base
FROM python:3.9

# Set working directory
WORKDIR /app

# Copy all files into container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create volume for SQLite database
VOLUME /app/instance

# Create migrations directory if it doesn't exist
RUN mkdir -p migrations

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Run the app with Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8080", "pga_leaderboard_parser:app"]