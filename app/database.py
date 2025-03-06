from datetime import datetime
from re import match
from os import getenv
from urllib.parse import quote_plus
from secrets import choice

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClient
from pymongo.errors import OperationFailure
from requests import post

# Load the environment variables
load_dotenv()

# Global database variable
DB: AsyncIOMotorDatabase


# === DATABASE ===
async def get_database() -> None:
    """
    Get the database connection using the environment variables.

    variables:

    - MONGODB_USERNAME: The username to connect to the MongoDB database.
    - MONGODB_PASSWORD: The password to connect to the MongoDB database.
    - MONGODB_DATABASE: The database name.
    - MONGODB_HOST: The host of the MongoDB database.
    - MONGODB_PORT: The port of the MongoDB database.
    """
    global DB

    # Create connection string from environment variables
    username = quote_plus(getenv("MONGODB_USERNAME"))
    password = quote_plus(getenv("MONGODB_PASSWORD"))
    database = getenv("MONGODB_DATABASE")
    host = getenv("MONGODB_HOST")
    port = int(getenv("MONGODB_PORT"))

    mongodb_url = f"mongodb://{username}:{password}@{host}:{port}/{database}"

    # Connect and return the database
    client = AsyncIOMotorClient(mongodb_url)
    DB = client[database]


# === MAIN FLOW ===
async def email_verification_queue(email: str, username: str = None) -> None:
    """
    Add the user into a registration or login queue, waiting for verification.

    :param email: The email of the user.
    :param username: The username of the user.
    """
    if not is_email_valid(email):
        raise ValueError("Invalid email")

    try:
        verification_code = generate_numerical_verification_code()

        # This check determines if the user is registering or logging in by checking if the username is provided,
        # since the username is only used in the registration endpoint.
        if username:
            # From Register Endpoint
            # Check if the user already exists
            existing_user = await DB.users.find_one({"email": email})
            if existing_user:
                raise ValueError("User already exists")

            await DB.verification_queue.replace_one(
                {"email": email},
                {"email": email, "username": username, "verification_code": verification_code, "timestamp": datetime.now()},
                upsert=True
            )
        else:
            # From Login Endpoint
            # Check if the user is registered
            existing_user = await DB.users.find_one({"email": email})
            if not existing_user:
                raise ValueError("404") # User not found

            await DB.verification_queue.replace_one(
                {"email": email},
                {"email": email, "verification_code": verification_code, "timestamp": datetime.now()},
                upsert=True
            )

        # Send the verification email
        send_verification_email(email, verification_code)
    except OperationFailure as e:
        raise RuntimeError(str(e))


async def verify_email(email: str, verification_code: str) -> str:
    """
    Verify the user using the email and verification code.

    :param email: The email of the user.
    :param verification_code: The verification code.
    :return: An access token if the verification is successful.
    """
    try:
        # Verification process
        user = await DB.verification_queue.find_one({"email": email})
        if not user:
            raise ValueError("404")

        stored_verification_code = user["verification_code"]
        timestamp = user["timestamp"]

        # Perform verification
        if verification_code != stored_verification_code:
            raise ValueError("Invalid verification code")
        if (datetime.now() - timestamp).total_seconds() > 600: # 10 minutes
            raise ValueError("Verification code expired")


        # Logging in and/or registering process
        access_token = generate_access_token() + "_" + email

        # Check if the user is registering or logging in by checking if the user is registered in the users collection
        existing_user = await DB.users.find_one({"email": email})
        if existing_user:
            # From Login Queue
            # If the user is already registered, add the access token to the user's access_token list
            # Why using list? Because this will allow the user to log in from multiple devices.
            await DB.users.update_one({"email": email}, {"$push": {"access_tokens": {"token": access_token, "timestamp": datetime.now()}}})
        else:
            # From Register Queue
            # If the user is not registered, insert the user into the users collection while adding the access token
            await DB.users.insert_one({"email": email, "username": user["username"], "access_tokens": [{"token": access_token, "timestamp": datetime.now()}]})

        # Delete the user from the verification queue to prevent bug in the queue
        await DB.verification_queue.delete_one({"email": email})

        return access_token
    except OperationFailure as e:
        raise RuntimeError(str(e))


# === HELPERS ===
def is_email_valid(email: str) -> bool:
    """
    Check if the email is valid using a regular expression.

    :param email: The email to check.
    :return: True if the email is valid, False otherwise.
    """
    if bool(match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email)):
        return True
    return False


def generate_numerical_verification_code(length: int = 6) -> str:
    """
    Generate a random numerical verification code.

    :param length: The length of the verification code, default is 6.
    :return: A random numerical verification code as a string.
    """
    return ''.join(choice("0123456789") for _ in range(length))


def send_verification_email(email: str, verification_code: str) -> None:
    """
    Function to send a verification email to the user.
    INFO: This function should be modified to use your own email service.

    :param email: The email to send the verification email to.
    :param verification_code: The verification code to include in the email.
    """
    # INFO: This is my own internal service, so the URL is hardcoded
    url = "http://192.168.1.99:29998/email"
    data = {
        "recipient": email,
        "subject": "Rei's Comment Section - Verify your email",
        "plain": "Your Verification Code is: " + verification_code,
        "html": "<table width=\"100%\" style=\"max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 2px 5px rgba(0,0,0,0.1);\"> <tr> <td align=\"center\"> <h2 style=\"color: #007bff;\">Rei\'s Comment Section</h2> <p style=\"font-size: 16px; color: #555;\">Your verification code is:</p> <p style=\"font-size: 24px; font-weight: bold; color: #007bff; background: #f0f8ff; padding: 10px 20px; border-radius: 5px; display: inline-block;\"> " + verification_code + " </p> <p>This code will expire in 10 minutes.</p> <p style=\"color: #777;\">If you didn\'t request this code, please ignore this email.</p> </td> </tr> <tr> <td align=\"center\" style=\"padding-top: 20px; border-top: 1px solid #ddd;\"> <p style=\"font-size: 12px; color: #777;\"> Need help? Contact me at <a href=\"mailto:akbar@reishandy.my.id\" style=\"color: #007bff; text-decoration: none;\">akbar@reishandy.my.id</a> </p> <p style=\"font-size: 12px; color: #888;\"> <em>Legal Disclaimer:</em> This email may contain confidential information. If you are not the intended recipient, please delete it immediately. </p> </td> </tr></table>"
    }

    # Send the data using a requests's POST
    response = post(url, json=data)
    if response.status_code != 201:
        raise RuntimeError("Failed to send verification email")


def generate_access_token() -> str:
    """
    Generate a random access token.
    INFO: This is not a secure token, but it is enough for this project.

    :return: A random access token as a string.
    """
    return ''.join(choice("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(64))