# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code to the working directory
COPY . .

# Expose port 8100 to the outside world
EXPOSE 8100

# Command to run the application
# We are assuming you are using FastAPI with uvicorn.
# If not, you may need to change this command.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
