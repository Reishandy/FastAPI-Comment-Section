# Use the official Python image
FROM python:3.13

# Set the working directory in the container
WORKDIR /code

# Copy requirements.txt first to leverage Docker's cache
COPY ./requirements.txt /code/requirements.txt

# Create a virtual environment
RUN python -m venv /code/venv

# Install dependencies within the virtual environment
RUN /code/venv/bin/pip install --upgrade pip
RUN /code/venv/bin/pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the application code
COPY ./app /code/app
COPY .env /code/.env

# Command to run the application
CMD ["/code/venv/bin/uvicorn", "app.main:app", "--host", "192.168.1.99", "--port", "30007"]

# docker build -t comment-section-api .
# docker run -d --name comment-section-api-container --network host --restart always comment-section-api

