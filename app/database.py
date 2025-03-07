import base64
from asyncio import sleep, gather
from datetime import datetime, timedelta
from os import getenv
from re import match
from secrets import choice
from urllib.parse import quote_plus

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClient
from pymongo.errors import OperationFailure
from requests import post
from starlette.websockets import WebSocket

# Load the environment variables
load_dotenv()

# Global database variable
DB: AsyncIOMotorDatabase
ACCESS_TOKEN_EXPIRATION_DAYS: int = 30
VERIFICATION_CODE_EXPIRATION_MINUTES: int = 10
CLEANUP_INTERVAL_SECONDS: int = 86400  # 1 day


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
    global DB, ACCESS_TOKEN_EXPIRATION_DAYS, VERIFICATION_CODE_EXPIRATION_MINUTES, CLEANUP_INTERVAL_SECONDS

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


async def clean_database() -> None:
    """
    Clean the database by removing expired access tokens and verification codes.
    """
    # Get expiration from environment variables
    ACCESS_TOKEN_EXPIRATION_DAYS = int(getenv("ACCESS_TOKEN_EXPIRATION_DAYS"))
    VERIFICATION_CODE_EXPIRATION_MINUTES = int(getenv("VERIFICATION_CODE_EXPIRATION_MINUTES"))
    CLEANUP_INTERVAL_SECONDS = int(getenv("CLEANUP_INTERVAL_SECONDS"))

    while True:
        print(f"INF0:     {datetime.now()} - Running database cleanup")

        # Calculate the expiration threshold
        access_token_expiration_threshold = datetime.now() - timedelta(days=ACCESS_TOKEN_EXPIRATION_DAYS)
        verification_code_expiration_threshold = datetime.now() - timedelta(
            minutes=VERIFICATION_CODE_EXPIRATION_MINUTES)

        try:
            # Remove expired tokens and code from the database, runs simultaneously
            token_result = await DB.users.update_many(
                {"access_tokens.timestamp": {"$lt": access_token_expiration_threshold}},
                {"$pull": {"access_tokens": {"timestamp": {"$lt": access_token_expiration_threshold}}}}
            )
            code_result = await DB.verification_queue.delete_many(
                {"timestamp": {"$lt": verification_code_expiration_threshold}}
            )
            print(f"INFO:     {datetime.now()} - Deleted {token_result.modified_count} expired tokens")
            print(f"INFO:     {datetime.now()} - Deleted {code_result.deleted_count} expired codes")
        except Exception as e:
            print(f"ERROR:    {datetime.now()} - Cleanup failed: {str(e)}")
        finally:
            print(f"INFO:     {datetime.now()} - Database cleanup completed")

        # Sleep for the interval, prevent the cleanup from running too often and causing performance issues
        await sleep(CLEANUP_INTERVAL_SECONDS)  # Default is 1 day


# === MAIN FLOW ===
async def email_verification_queue(email: str) -> None:
    """
    Add the user into a email verification queue and sends a verification code to the user's email,
    waiting for verification.

    :param email: The email of the user.
    """
    if not is_email_valid(email):
        raise ValueError("Invalid email")

    verification_code = generate_numerical_verification_code()

    try:
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
            raise ValueError("No verification found")

        stored_verification_code = user["verification_code"]
        timestamp = user["timestamp"]

        # Perform verification
        if verification_code != stored_verification_code:
            raise ValueError("Invalid verification code")
        if timestamp < datetime.now() - timedelta(minutes=VERIFICATION_CODE_EXPIRATION_MINUTES):
            raise ValueError("Verification code expired")

        # Update or insert the user into the users collection
        access_token = generate_access_token(email)

        # Check if the user exists in the users collection
        existing_user = await DB.users.find_one({"email": email})
        if existing_user:
            # If the user is already existed, add the access token to the user's access_token list
            # Why using list? Because this will allow the user to log in from multiple devices.
            await DB.users.update_one({"email": email}, {
                "$push": {"access_tokens": {"token": access_token, "timestamp": datetime.now()}}})
        else:
            # If the user does not exist, insert the user into the users collection while adding the access token
            username = email.split("@")[0]  # Default username is the email without the domain
            await DB.users.insert_one({"email": email, "username": username,
                                       "access_tokens": [{"token": access_token, "timestamp": datetime.now()}],
                                       "color": pick_random_color(), "initial": make_initials(username)})

            # Delete the user from the verification queue
            await DB.verification_queue.delete_one({"email": email})

            return access_token
    except OperationFailure as e:
        raise RuntimeError(str(e))


async def validate_access_token(access_token: str) -> dict[str, str]:
    """
    Validate the access token by checking if the access token is in the user's access_token list.

    :param access_token: The access token to validate.
    :return: A dictionary containing the email, username, color, and initial of the user.
    """
    if not access_token or not is_access_token_valid(access_token):
        raise ValueError("Invalid access token")

    # Split the access token to get the email
    decoded_access_token = decode_access_token(access_token)
    email = decoded_access_token.split("_")[1]

    try:
        # Check if the access token is valid and get the token info
        user = await DB.users.find_one({"email": email, "access_tokens.token": access_token},
                                       {"access_tokens.$": 1, "email": 1, "username": 1, "color": 1, "initial": 1})
        if not user or not user.get("access_tokens"):
            raise ValueError("Invalid access token")

        token_info = user["access_tokens"][0]

        # Check if the access token is expired (30 days from last usage)
        expiration_threshold = datetime.now() - timedelta(days=ACCESS_TOKEN_EXPIRATION_DAYS)
        if token_info["timestamp"] < expiration_threshold:
            raise ValueError("Access token expired")

        # Update the timestamp of the access token
        await DB.users.update_one({"email": email, "access_tokens.token": access_token},
                                  {"$set": {"access_tokens.$.timestamp": datetime.now()}}, upsert=True)

        return {"email": user["email"], "username": user["username"], "color": user["color"], "initial": user["initial"]}
    except OperationFailure as e:
        raise RuntimeError(str(e))


async def change_username(email: str, new_username: str) -> None:
    """
    Change the username of the user.

    :param email: The email of the user.
    :param new_username: The new username to change.
    """
    if not new_username or len(new_username) < 3:
        raise ValueError("Invalid username")

    try:
        await DB.users.update_one({"email": email}, {"$set": {"username": new_username, "initial": make_initials(new_username)}})
    except OperationFailure as e:
        raise RuntimeError(str(e))


async def post_comment(email: str, username: str, color: str, initial: str, location: str, comment: str) -> None:
    """
    Post a comment to the database.

    :param email: The email of the user.
    :param username: The username of the user.
    :param color: The color of the user.
    :param initial: The initial of the user.
    :param location: The location of the user.
    :param comment: The comment to post.
    """
    try:
        # Retrieve the current highest comment ID for the location
        location_data = await DB.comments.find_one({"location": location}, {"max_comment_id": 1})
        if location_data and "max_comment_id" in location_data:
            max_id = location_data["max_comment_id"]
        else:
            max_id = 0

        comment_data = {
            "id": max_id + 1,
            "email": email,
            "username": username,
            "color": color,
            "initial": initial,
            "comment": comment,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": datetime.now().strftime("%H:%M:%S")
        }

        # Update the location document with the new comment and increment the max_comment_id
        await DB.comments.update_one(
            {"location": location},
            {
                "$push": {"comments": comment_data},
                "$set": {"max_comment_id": max_id + 1}
            },
            upsert=True
        )
    except OperationFailure as e:
        raise RuntimeError(str(e))


async def get_comments(location: str, from_id: int, to_id: int, latest_first: bool) -> list[dict]:
    """
    Get the comments for a location with a range of IDs.

    :param location: The location to get the comments from.
    :param from_id: The starting ID of the range.
    :param to_id: The ending ID of the range.
    :param latest_first: True if the comments should be sorted from the latest, False otherwise. (highest ID first)
    :return: A list of comments.
    """
    try:
        pipeline = [
            {"$match": {"location": location}},
            {"$unwind": "$comments"},
            {"$match": {"comments.id": {"$gte": from_id, "$lt": to_id}}},
            {"$sort": {"comments.id": -1 if latest_first else 1}},
            {"$replaceRoot": {"newRoot": "$comments"}}
        ]
        cursor = DB.comments.aggregate(pipeline)
        comments = await cursor.to_list(length=None)
        return comments
    except OperationFailure as e:
        raise RuntimeError(str(e))


async def get_latest_comments_ws(location: str, websocket: WebSocket) -> None:
    """
    Get the latest comments for a location and send it to the WebSocket. (for real-time updates)

    :param location: The location to get the comments from.
    :param websocket: The WebSocket to send the comments to.
    """
    pipeline = [
        {"$match": {
            "operationType": "update",
            "ns.coll": "comments",
            "fullDocument.location": location
        }}
    ]

    async with DB.comments.watch(pipeline, full_document='updateLookup') as stream:
        async for change in stream:
            # Check if we have a full document and if it contains comments
            if "fullDocument" in change and "comments" in change["fullDocument"]:
                comments = change["fullDocument"]["comments"]
                if comments:
                    # Get and send only the most recently added comment
                    latest_comment = comments[-1]
                    await websocket.send_json(latest_comment)


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
        "html": "<table width=\"100%\" style=\"max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 2px 5px rgba(0,0,0,0.1);\"> <tr> <td align=\"center\"> <h2 style=\"color: #007bff;\">Rei\'s Comment Section</h2> <p style=\"font-size: 16px; color: #555;\">Your verification code is:</p> <p style=\"font-size: 24px; font-weight: bold; color: #007bff; background: #f0f8ff; padding: 10px 20px; border-radius: 5px; display: inline-block;\"> " + verification_code + " </p> <p>This code will expire in " + str(
            VERIFICATION_CODE_EXPIRATION_MINUTES) + " minutes.</p> <p style=\"color: #777;\">If you didn\'t request this code, please ignore this email.</p> </td> </tr> <tr> <td align=\"center\" style=\"padding-top: 20px; border-top: 1px solid #ddd;\"> <p style=\"font-size: 12px; color: #777;\"> Need help? Contact me at <a href=\"mailto:akbar@reishandy.my.id\" style=\"color: #007bff; text-decoration: none;\">akbar@reishandy.my.id</a> </p> <p style=\"font-size: 12px; color: #888;\"> <em>Legal Disclaimer:</em> This email may contain confidential information. If you are not the intended recipient, please delete it immediately. </p> </td> </tr></table>"
    }

    # Send the data using a requests's POST
    response = post(url, json=data)
    if response.status_code != 201:
        raise RuntimeError("Failed to send verification email")


def generate_access_token(email: str) -> str:
    """
    Generate a random access token in the format of base64 encoded string with email as the payload.

    :return: A random access token as a string.
    """
    token = ''.join(
        choice("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(64)) + "_" + email
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("utf-8")


def decode_access_token(access_token: str) -> str:
    """
    Decode the access token to get the email.

    :param access_token: The access token to decode.
    :return: The email of the user.
    """
    return base64.urlsafe_b64decode(access_token).decode("utf-8")


def is_access_token_valid(access_token: str) -> bool:
    """
    Check if the access token is valid.

    :param access_token: The access token to check.
    :return: True if the access token is valid, False otherwise.
    """
    if bool(match(r'^[a-zA-Z0-9]{64}_[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$',
                  decode_access_token(access_token))):
        return True
    return False


def pick_random_color() -> str:
    """
    Pick a random color from a predefined list of colors.

    :return: A random color in hexadecimal format.
    """
    colors = [
        "#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#A133FF",
        "#33FFF5", "#F5FF33", "#FF8C33", "#8C33FF", "#33FF8C"
    ]
    return choice(colors)


def make_initials(username: str) -> str:
    """
    Create initials from a given name string.

    :param username: The name string to create initials from.
    :return: A string containing the initials.
    """
    return ''.join(word[0].upper() for word in username.split())
